package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.ErrorResponseDTO;
import com.epam.edp.demo.dto.LogoutRequestDTO;
import com.epam.edp.demo.dto.RefreshTokenRequestDTO;
import com.epam.edp.demo.dto.RefreshTokenResponseDTO;
import com.epam.edp.demo.dto.RegisterUserRequest;
import com.epam.edp.demo.dto.RegisterUserResponse;
import com.epam.edp.demo.dto.SignInRequestDTO;
import com.epam.edp.demo.dto.SignInResponseDTO;
import com.epam.edp.demo.model.RefreshToken;
import com.epam.edp.demo.security.JwtUtil;
import com.epam.edp.demo.service.AuthService;
import com.epam.edp.demo.service.RefreshTokenService;
import com.epam.edp.demo.service.UserRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.epam.edp.demo.dto.VerifyCodeRequestDTO;
import com.epam.edp.demo.service.PasswordResetService;
import com.epam.edp.demo.dto.ResetPasswordRequestDTO;
import com.epam.edp.demo.dto.ForgotPasswordRequestDTO;

/**
 * Authentication Controller for user sign-up, sign-in, token refresh, and logout.
 */
@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Endpoints related to user authentication and authorization")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtUtil jwtUtil;
    private final UserRegistrationService userRegistrationService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/sign-up")
    @Operation(summary = "Register a user", description = "Registers a new user and returns success message with sign-in redirect route.")
    public ResponseEntity<RegisterUserResponse> register(@Valid @RequestBody RegisterUserRequest request) {
        RegisterUserResponse response = userRegistrationService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/sign-in")
    @Operation(summary = "Sign in a user", description = "Authenticates user with email and password. Returns JWT access token and refresh token for session management.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful sign-in", content = @Content(schema = @Schema(implementation = SignInResponseDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid input or wrong credentials", content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    public ResponseEntity<?> signIn(@Valid @RequestBody SignInRequestDTO request) {
        try {
            log.info("Sign-in attempt for email: {}", request.getEmail());
            SignInResponseDTO response = authService.signIn(request);
            log.info("Sign-in successful for email: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            log.warn("Sign-in failed for email: {} - {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponseDTO("Wrong password or email"));
        } catch (Exception e) {
            log.error("Unexpected error during sign-in for email: {}", request.getEmail(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponseDTO("Authentication failed. Please try again."));
        }
    }

    // Refresh access token using a valid refresh token.

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generates a new short-lived access token using a valid long-lived refresh token.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token refreshed successfully", content = @Content(schema = @Schema(implementation = RefreshTokenResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid or expired refresh token", content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO request) {
        try {
            log.info("Token refresh attempt");
            RefreshToken refreshToken = refreshTokenService.validateRefreshToken(request.getRefreshToken());

            String newAccessToken = jwtUtil.generateAccessToken(
                    refreshToken.getUser().getId(),
                    refreshToken.getUser().getEmail(),
                    String.valueOf(refreshToken.getUser().getRole()));
            log.info("Token refreshed successfully for user: {}", refreshToken.getUser().getEmail());

            return ResponseEntity.ok(RefreshTokenResponseDTO.builder()
                    .accessToken(newAccessToken)
                    .role(refreshToken.getUser().getRole())
                    .build());
        } catch (IllegalArgumentException e) {
            log.warn("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Invalid or expired refresh token"));
        } catch (Exception e) {
            log.error("Unexpected error during token refresh", e);
            return ResponseEntity.badRequest()
                    .body(new ErrorResponseDTO("Token refresh failed. Please sign in again."));
        }
    }

    // Logout a user by revoking their refresh token.

    @PostMapping("/logout")
    @Operation(summary = "Logout a user", description = "Revokes the refresh token to logout the user from the session.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Logout successful"),
            @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    public ResponseEntity<?> logout(@Valid @RequestBody LogoutRequestDTO request) {
        try {
            log.info("Logout attempt");
            refreshTokenService.revokeRefreshToken(request.getRefreshToken());
            log.info("User logged out successfully");
            return ResponseEntity.ok(new ErrorResponseDTO("Logged out successfully"));
        } catch (Exception e) {
            log.error("Error during logout", e);
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Logout failed"));
        }
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Password Recovery", description = "Sends a verification code to the user's email for password recovery.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Verification code sent (or email not found — same response for security)"),
            @ApiResponse(responseCode = "500", description = "Failed to send verification code")
    })
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDTO request) {
        passwordResetService.initiateForgotPassword(request.getEmail());
        return ResponseEntity.ok(new ErrorResponseDTO("If this email is registered, a verification code has been sent."));
    }

    @PostMapping("/verify-code")
    @Operation(summary = "Verify Reset Code", description = "Validates the verification code sent to the user's email.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Verification code validated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired verification code")
    })
    public ResponseEntity<?> verifyCode(@Valid @RequestBody VerifyCodeRequestDTO request) {
        passwordResetService.verifyCode(request.getEmail(), request.getVerificationCode());
        return ResponseEntity.ok(new ErrorResponseDTO("Verification code validated successfully."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset Password", description = "Resets the user's password after successful code verification.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired verification code")
    })
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        passwordResetService.resetPassword(request.getEmail(), request.getNewPassword());
        return ResponseEntity.ok(new ErrorResponseDTO("Password reset successfully."));
    }
}
