package com.epam.edp.demo.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "01234567890123456789012345678901");
        ReflectionTestUtils.setField(jwtUtil, "accessTokenExpirationMs", 60_000L);
    }

    @Test
    void generateAccessToken_andExtractFields_workCorrectly() {
        String token = jwtUtil.generateAccessToken("u1", "user@example.com", "CUSTOMER");

        assertThat(token).isNotBlank();
        assertThat(jwtUtil.extractUserId(token)).isEqualTo("u1");
        assertThat(jwtUtil.extractEmail(token)).isEqualTo("user@example.com");
        assertThat(jwtUtil.extractRole(token)).isEqualTo("CUSTOMER");
    }

    @Test
    void generateToken_backwardCompatibility_delegatesToAccessTokenGeneration() {
        String token = jwtUtil.generateToken("u2", "admin@example.com", "ADMIN");

        assertThat(jwtUtil.extractUserId(token)).isEqualTo("u2");
        assertThat(jwtUtil.extractEmail(token)).isEqualTo("admin@example.com");
        assertThat(jwtUtil.extractRole(token)).isEqualTo("ADMIN");
    }

    @Test
    void extractClaims_containsExpectedClaims() {
        String token = jwtUtil.generateAccessToken("u3", "claims@example.com", "AGENT");

        Claims claims = jwtUtil.extractClaims(token);

        assertThat(claims.getSubject()).isEqualTo("u3");
        assertThat(claims.get("email", String.class)).isEqualTo("claims@example.com");
        assertThat(claims.get("role", String.class)).isEqualTo("AGENT");
    }

    @Test
    void isTokenValid_forFreshToken_returnsTrue() {
        String token = jwtUtil.generateAccessToken("u4", "fresh@example.com", "CUSTOMER");

        assertThat(jwtUtil.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_forMalformedToken_returnsFalse() {
        assertThat(jwtUtil.isTokenValid("not-a-jwt")).isFalse();
    }

    @Test
    void isTokenValid_forExpiredToken_returnsFalse() {
        ReflectionTestUtils.setField(jwtUtil, "accessTokenExpirationMs", -1L);
        String expiredToken = jwtUtil.generateAccessToken("u5", "expired@example.com", "CUSTOMER");

        assertThat(jwtUtil.isTokenValid(expiredToken)).isFalse();
    }
}
