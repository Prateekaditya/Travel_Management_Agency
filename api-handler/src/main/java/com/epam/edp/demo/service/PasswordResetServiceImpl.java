package com.epam.edp.demo.service;

import java.security.SecureRandom;
import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.epam.edp.demo.exception.InvalidVerificationCodeException;
import com.epam.edp.demo.model.PasswordResetToken;
import com.epam.edp.demo.repository.PasswordResetTokenRepository;
import com.epam.edp.demo.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String INVALID_CODE_MSG = "Invalid or expired verification code.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Override
    public void initiateForgotPassword(String email) {
        if (userRepository.findByEmail(email).isEmpty()) {
            log.debug("Password reset requested for unregistered email");
            return;
        }

        tokenRepository.deleteByEmail(email);

        String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));

        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .code(passwordEncoder.encode(code))
                .expiresAt(Instant.now().plusSeconds(900))
                .verified(false)
                .build();

        tokenRepository.save(token);

        emailService.sendEmail(
                email,
                "Password Reset Code",
                "Your password reset code is: " + code +
                "\n\nThis code expires in 15 minutes." +
                "\n\nIf you did not request this, ignore this email."
        );
    }

    @Override
    public void verifyCode(String email, String verificationCode) {
        PasswordResetToken token = tokenRepository.findTopByEmailOrderByExpiresAtDesc(email)
                .orElseThrow(() -> new InvalidVerificationCodeException(INVALID_CODE_MSG));

        if (!token.isValid()) {
            throw new InvalidVerificationCodeException(INVALID_CODE_MSG);
        }

        if (!passwordEncoder.matches(verificationCode, token.getCode())) {
            token.setAttemptCount(token.getAttemptCount() + 1);
            if (token.getAttemptCount() >= 5) {
                tokenRepository.delete(token);
                throw new InvalidVerificationCodeException("Too many failed attempts. Please request a new code.");
            }
            tokenRepository.save(token);
            throw new InvalidVerificationCodeException(INVALID_CODE_MSG);
        }

        token.setVerified(true);
        tokenRepository.save(token);
        log.info("Verification code validated for {}", email);
    }

    @Override
    public void resetPassword(String email, String newPassword) {
        PasswordResetToken token = tokenRepository.findTopByEmailAndVerifiedTrueOrderByExpiresAtDesc(email)
                .orElseThrow(() -> new InvalidVerificationCodeException(INVALID_CODE_MSG));

        if (!token.isValid()) {
            throw new InvalidVerificationCodeException(INVALID_CODE_MSG);
        }

        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidVerificationCodeException(INVALID_CODE_MSG));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenRepository.deleteByEmail(email);
        log.info("Password reset successfully for {}", email);
    }
}
