package com.epam.edp.demo.service;

import com.epam.edp.demo.model.RefreshToken;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.RefreshTokenRepository;
import com.epam.edp.demo.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service for managing refresh tokens.
 * Handles token generation, validation, and revocation for logout functionality.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;

    private static final int REFRESH_TOKEN_EXPIRY_DAYS = 7;

    /**
     * Create and store a new refresh token for a user.
     */
    public RefreshToken createRefreshToken(User user) {
        // Revoke any existing refresh token for this user
        refreshTokenRepository.findByUserAndRevokedFalse(user)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });

        // Generate new refresh token
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expirationDate(LocalDateTime.now().plusDays(REFRESH_TOKEN_EXPIRY_DAYS))
                .createdAt(LocalDateTime.now())
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);
        log.info("Refresh token created for user: {}", user.getEmail());
        return refreshToken;
    }

    /**
     * Validate and retrieve a refresh token.
     */
    public RefreshToken validateRefreshToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(RefreshToken::isValid)
                .orElseThrow(() -> {
                    log.warn("Invalid or expired refresh token");
                    return new IllegalArgumentException("Invalid or expired refresh token");
                });
    }

    /**
     * Revoke a refresh token for logout.
     */
    public void revokeRefreshToken(String token) {
        refreshTokenRepository.findByToken(token)
                .ifPresent(refreshToken -> {
                    refreshToken.setRevoked(true);
                    refreshTokenRepository.save(refreshToken);
                    log.info("Refresh token revoked for user: {}", refreshToken.getUser().getEmail());
                });
    }

    /**
     * Revoke all refresh tokens for a user (logout from all devices).
     */
    public void revokeAllRefreshTokens(User user) {
        refreshTokenRepository.deleteByUser(user);
        log.info("All refresh tokens revoked for user: {}", user.getEmail());
    }
}
