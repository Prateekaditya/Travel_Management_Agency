package com.epam.edp.demo.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenTest {

    @Test
    void isValid_whenNotRevokedAndNotExpired_returnsTrue() {
        RefreshToken token = RefreshToken.builder()
                .revoked(false)
                .expirationDate(LocalDateTime.now().plusMinutes(5))
                .build();

        assertThat(token.isValid()).isTrue();
    }

    @Test
    void isValid_whenRevoked_returnsFalse() {
        RefreshToken token = RefreshToken.builder()
                .revoked(true)
                .expirationDate(LocalDateTime.now().plusMinutes(5))
                .build();

        assertThat(token.isValid()).isFalse();
    }

    @Test
    void isValid_whenExpired_returnsFalse() {
        RefreshToken token = RefreshToken.builder()
                .revoked(false)
                .expirationDate(LocalDateTime.now().minusMinutes(1))
                .build();

        assertThat(token.isValid()).isFalse();
    }
}
