package com.epam.edp.demo.service;

import com.epam.edp.demo.model.RefreshToken;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.RefreshTokenRepository;
import com.epam.edp.demo.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id("u1").email("user@example.com").role(Role.CUSTOMER).build();
    }

    @Test
    void createRefreshToken_revokesExistingAndCreatesNewToken() {
        RefreshToken existing = RefreshToken.builder()
                .id("old")
                .user(user)
                .token("old-token")
                .expirationDate(LocalDateTime.now().plusDays(1))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByUserAndRevokedFalse(user)).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken result = refreshTokenService.createRefreshToken(user);

        assertThat(existing.isRevoked()).isTrue();
        assertThat(result.getToken()).isNotBlank();
        assertThat(result.getUser()).isEqualTo(user);
        assertThat(result.isRevoked()).isFalse();
        assertThat(result.getExpirationDate()).isAfter(LocalDateTime.now().plusDays(6));
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void createRefreshToken_withoutExistingToken_createsSingleToken() {
        when(refreshTokenRepository.findByUserAndRevokedFalse(user)).thenReturn(Optional.empty());
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken result = refreshTokenService.createRefreshToken(user);

        assertThat(result.getToken()).isNotBlank();
        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
    }

    @Test
    void validateRefreshToken_validToken_returnsToken() {
        RefreshToken token = RefreshToken.builder()
                .token("ok")
                .revoked(false)
                .expirationDate(LocalDateTime.now().plusMinutes(10))
                .build();
        when(refreshTokenRepository.findByToken("ok")).thenReturn(Optional.of(token));

        RefreshToken result = refreshTokenService.validateRefreshToken("ok");

        assertThat(result).isEqualTo(token);
    }

    @Test
    void validateRefreshToken_missingToken_throwsException() {
        when(refreshTokenRepository.findByToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.validateRefreshToken("missing"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired refresh token");
    }

    @Test
    void validateRefreshToken_expiredToken_throwsException() {
        RefreshToken expired = RefreshToken.builder()
                .token("expired")
                .revoked(false)
                .expirationDate(LocalDateTime.now().minusMinutes(1))
                .build();
        when(refreshTokenRepository.findByToken("expired")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> refreshTokenService.validateRefreshToken("expired"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired refresh token");
    }

    @Test
    void revokeRefreshToken_existingToken_marksRevokedAndSaves() {
        RefreshToken existing = RefreshToken.builder().token("t1").user(user).revoked(false).build();
        when(refreshTokenRepository.findByToken("t1")).thenReturn(Optional.of(existing));

        refreshTokenService.revokeRefreshToken("t1");

        assertThat(existing.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(existing);
    }

    @Test
    void revokeRefreshToken_missingToken_doesNothing() {
        when(refreshTokenRepository.findByToken("missing")).thenReturn(Optional.empty());

        refreshTokenService.revokeRefreshToken("missing");

        verify(refreshTokenRepository, times(0)).save(any(RefreshToken.class));
    }

    @Test
    void revokeAllRefreshTokens_deletesByUser() {
        refreshTokenService.revokeAllRefreshTokens(user);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(refreshTokenRepository).deleteByUser(userCaptor.capture());
        assertThat(userCaptor.getValue()).isEqualTo(user);
    }
}
