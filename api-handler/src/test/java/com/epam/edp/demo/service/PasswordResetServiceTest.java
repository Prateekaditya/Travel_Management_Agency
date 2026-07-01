package com.epam.edp.demo.service;

import com.epam.edp.demo.exception.InvalidVerificationCodeException;
import com.epam.edp.demo.model.PasswordResetToken;
import com.epam.edp.demo.repository.PasswordResetTokenRepository;
import com.epam.edp.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;

    @InjectMocks
    private PasswordResetServiceImpl passwordResetService;

    private PasswordResetToken validToken;

    @BeforeEach
    void setUp() {
        validToken = PasswordResetToken.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(Instant.now().plusSeconds(900))
                .verified(false)
                .attemptCount(0)
                .build();
    }

    @Test
    void verifyCode_correctCode_setsVerifiedTrue() {
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(validToken));
        when(passwordEncoder.matches("123456", "123456")).thenReturn(true);

        passwordResetService.verifyCode("user@example.com", "123456");

        assertThat(validToken.isVerified()).isTrue();
        verify(tokenRepository).save(validToken);
    }

    @Test
    void verifyCode_wrongCode_incrementsAttemptCount() {
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(validToken));
        when(passwordEncoder.matches("000000", "123456")).thenReturn(false);

        assertThatThrownBy(() -> passwordResetService.verifyCode("user@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class)
                .hasMessageContaining("Invalid or expired");

        assertThat(validToken.getAttemptCount()).isEqualTo(1);
        verify(tokenRepository).save(validToken);
    }

    @Test
    void verifyCode_fourWrongAttempts_doesNotDeleteToken() {
        validToken.setAttemptCount(3);
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(validToken));
        when(passwordEncoder.matches("000000", "123456")).thenReturn(false);

        assertThatThrownBy(() -> passwordResetService.verifyCode("user@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(validToken.getAttemptCount()).isEqualTo(4);
        verify(tokenRepository).save(validToken);
        verify(tokenRepository, never()).delete(any());
    }

    @Test
    void verifyCode_fifthWrongAttempt_deletesTokenAndThrows() {
        validToken.setAttemptCount(4);
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(validToken));
        when(passwordEncoder.matches("000000", "123456")).thenReturn(false);

        assertThatThrownBy(() -> passwordResetService.verifyCode("user@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class)
                .hasMessageContaining("Too many failed attempts");

        verify(tokenRepository).delete(validToken);
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void verifyCode_expiredToken_throwsInvalidCode() {
        validToken = PasswordResetToken.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(Instant.now().minusSeconds(1))
                .verified(false)
                .attemptCount(0)
                .build();
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(validToken));

        assertThatThrownBy(() -> passwordResetService.verifyCode("user@example.com", "123456"))
                .isInstanceOf(InvalidVerificationCodeException.class);
    }

    @Test
    void verifyCode_noTokenFound_throwsInvalidCode() {
        when(tokenRepository.findTopByEmailOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordResetService.verifyCode("user@example.com", "123456"))
                .isInstanceOf(InvalidVerificationCodeException.class);
    }
}
