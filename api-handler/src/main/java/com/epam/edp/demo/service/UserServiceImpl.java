package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.ChangeEmailRequestDTO;
import com.epam.edp.demo.dto.ChangeEmailResponseDTO;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;
import com.epam.edp.demo.dto.ConfirmEmailResponseDTO;
import com.epam.edp.demo.dto.UpdateNameResponseDTO;
import com.epam.edp.demo.dto.UpdatePasswordRequestDTO;
import com.epam.edp.demo.dto.UpdatePasswordResponseDTO;
import com.epam.edp.demo.dto.UpdateUserNameRequestDTO;
import com.epam.edp.demo.dto.UserDTO;
import com.epam.edp.demo.exception.EmailAlreadyExistsException;
import com.epam.edp.demo.exception.InvalidPasswordException;
import com.epam.edp.demo.exception.InvalidVerificationCodeException;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.model.EmailChangeToken;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.EmailChangeTokenRepository;
import com.epam.edp.demo.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level= AccessLevel.PRIVATE)
public class UserServiceImpl implements UserService {

    final UserRepository userRepository;
    final PasswordEncoder passwordEncoder;
    final EmailChangeTokenRepository emailChangeTokenRepository;
    final EmailService emailService;
    final RefreshTokenService refreshTokenService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public UserDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserDTO.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .imageUrl(user.getImageUrl())
                .role(user.getRole())
                .build();
    }

    @Override
    public UpdateNameResponseDTO updateName(String id, UpdateUserNameRequestDTO req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        userRepository.save(user);
        return new UpdateNameResponseDTO("Name updated successfully");
    }

    @Override
    public UpdatePasswordResponseDTO updatePassword(String id, UpdatePasswordRequestDTO req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new InvalidPasswordException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        return new UpdatePasswordResponseDTO("Password updated successfully");
    }
    @Override
    public ChangeEmailResponseDTO initiateEmailChange(String id, ChangeEmailRequestDTO req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new InvalidPasswordException("Password is incorrect");
        }
        userRepository.findByEmail(req.getNewEmail())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new EmailAlreadyExistsException("Email address is already in use"); });
        emailChangeTokenRepository.deleteByUserId(id);
        String token = UUID.randomUUID().toString();
        EmailChangeToken emailChangeToken = EmailChangeToken.builder()
                .userId(id)
                .newEmail(req.getNewEmail())
                .token(token)
                .expiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .build();
        emailChangeTokenRepository.save(emailChangeToken);
        String confirmLink = frontendUrl + "?confirmToken=" + token + "&userId=" + id
                + "&newEmail=" + java.net.URLEncoder.encode(req.getNewEmail(), java.nio.charset.StandardCharsets.UTF_8);
        emailService.sendEmail(
                req.getNewEmail(),
                "Confirm your email change",
                "Click the link to confirm your new email: " + confirmLink
        );
        return new ChangeEmailResponseDTO("Confirmation email sent to " + req.getNewEmail());
    }
    @Override
    public ConfirmEmailResponseDTO confirmEmailChange(String id, ConfirmEmailRequestDTO req) {
        EmailChangeToken emailChangeToken = emailChangeTokenRepository.findByToken(req.getConfirmationToken())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired confirmation token"));
        if (!emailChangeToken.getUserId().equals(id)) {
            throw new ResourceNotFoundException("Invalid or expired confirmation token");
        }
        if (Instant.now().isAfter(emailChangeToken.getExpiresAt())) {
            emailChangeTokenRepository.delete(emailChangeToken);
            throw new InvalidVerificationCodeException("Confirmation token has expired");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setEmail(emailChangeToken.getNewEmail());
        userRepository.save(user);
        refreshTokenService.revokeAllRefreshTokens(user);
        emailChangeTokenRepository.delete(emailChangeToken);
        return new ConfirmEmailResponseDTO("Your email has been changed successfully.", true);
    }

}
