package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.SignInRequestDTO;
import com.epam.edp.demo.dto.SignInResponseDTO;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.UserRepository;
import com.epam.edp.demo.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Authentication Service for handling user login logic.
 * Validates credentials and generates JWT tokens.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    public SignInResponseDTO signIn(SignInRequestDTO request) {
        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.debug("User not found for email: {}", request.getEmail());
                    return new BadCredentialsException("Wrong password or email");
                });

        // Verify password using BCrypt
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.debug("Password mismatch for email: {}", request.getEmail());
            throw new BadCredentialsException("Wrong password or email");
        }

        // Generate access token (short-lived)
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), String.valueOf(user.getRole()));
        log.debug("Access token generated for user: {}", user.getEmail());

        // Create refresh token (long-lived, stored in DB)
        String refreshToken = refreshTokenService.createRefreshToken(user).getToken();
        log.debug("Refresh token created for user: {}", user.getEmail());

        // Build and return response
        return SignInResponseDTO.builder()
                .idToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole())
                .userName(user.getFirstName() + " " + user.getLastName())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }
}
