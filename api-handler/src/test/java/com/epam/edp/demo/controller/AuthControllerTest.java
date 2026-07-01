package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.ErrorResponseDTO;
import com.epam.edp.demo.dto.LogoutRequestDTO;
import com.epam.edp.demo.dto.RefreshTokenRequestDTO;
import com.epam.edp.demo.dto.RefreshTokenResponseDTO;
import com.epam.edp.demo.dto.SignInRequestDTO;
import com.epam.edp.demo.dto.SignInResponseDTO;
import com.epam.edp.demo.model.RefreshToken;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.security.JwtUtil;
import com.epam.edp.demo.service.AuthService;
import com.epam.edp.demo.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthController authController;

    private SignInRequestDTO signInRequest;

    @BeforeEach
    void setUp() {
        signInRequest = new SignInRequestDTO();
        signInRequest.setEmail("user@example.com");
        signInRequest.setPassword("password");
    }

    @Test
    void signIn_success_returnsOkAndPayload() {
        SignInResponseDTO expected = SignInResponseDTO.builder()
                .idToken("access")
                .refreshToken("refresh")
                .role(Role.CUSTOMER)
                .userName("John Doe")
                .email("user@example.com")
                .build();

        when(authService.signIn(signInRequest)).thenReturn(expected);

        ResponseEntity<?> response = authController.signIn(signInRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);
    }

    @Test
    void signIn_badCredentials_returnsUnauthorized() {
        when(authService.signIn(signInRequest)).thenThrow(new BadCredentialsException("Wrong password or email"));

        ResponseEntity<?> response = authController.signIn(signInRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage()).isEqualTo("Wrong password or email");
    }

    @Test
    void signIn_unexpectedException_returnsUnauthorized() {
        when(authService.signIn(signInRequest)).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> response = authController.signIn(signInRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage())
                .isEqualTo("Authentication failed. Please try again.");
    }

    @Test
    void refreshToken_success_returnsNewAccessToken() {
        User user = User.builder().id("u1").email("user@example.com").role(Role.CUSTOMER).build();
        RefreshToken refreshToken = RefreshToken.builder().token("ref-token").user(user).build();
        RefreshTokenRequestDTO request = RefreshTokenRequestDTO.builder().refreshToken("ref-token").build();

        when(refreshTokenService.validateRefreshToken("ref-token")).thenReturn(refreshToken);
        when(jwtUtil.generateAccessToken("u1", "user@example.com", "CUSTOMER")).thenReturn("new-access-token");

        ResponseEntity<?> response = authController.refreshToken(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(RefreshTokenResponseDTO.class);
        RefreshTokenResponseDTO payload = (RefreshTokenResponseDTO) response.getBody();
        assertThat(payload.getAccessToken()).isEqualTo("new-access-token");
        assertThat(payload.getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void refreshToken_invalidToken_returnsBadRequest() {
        RefreshTokenRequestDTO request = RefreshTokenRequestDTO.builder().refreshToken("bad").build();
        when(refreshTokenService.validateRefreshToken("bad"))
                .thenThrow(new IllegalArgumentException("Invalid or expired refresh token"));

        ResponseEntity<?> response = authController.refreshToken(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage())
                .isEqualTo("Invalid or expired refresh token");
    }

    @Test
    void refreshToken_unexpectedException_returnsBadRequest() {
        RefreshTokenRequestDTO request = RefreshTokenRequestDTO.builder().refreshToken("ref").build();
        when(refreshTokenService.validateRefreshToken("ref")).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> response = authController.refreshToken(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage())
                .isEqualTo("Token refresh failed. Please sign in again.");
    }

    @Test
    void logout_success_returnsOk() {
        LogoutRequestDTO request = LogoutRequestDTO.builder().refreshToken("ref-token").build();
        doNothing().when(refreshTokenService).revokeRefreshToken("ref-token");

        ResponseEntity<?> response = authController.logout(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage()).isEqualTo("Logged out successfully");
    }

    @Test
    void logout_failure_returnsBadRequest() {
        LogoutRequestDTO request = LogoutRequestDTO.builder().refreshToken("ref-token").build();
        doThrow(new RuntimeException("boom")).when(refreshTokenService).revokeRefreshToken("ref-token");

        ResponseEntity<?> response = authController.logout(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOf(ErrorResponseDTO.class);
        assertThat(((ErrorResponseDTO) response.getBody()).getMessage()).isEqualTo("Logout failed");
    }
}
