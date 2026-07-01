package com.epam.edp.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.epam.edp.demo.exception.EmailAlreadyExistsException;
import com.epam.edp.demo.exception.GlobalExceptionHandler;
import com.epam.edp.demo.security.JwtUtil;
import com.epam.edp.demo.service.AuthService;
import com.epam.edp.demo.service.PasswordResetService;
import com.epam.edp.demo.service.RefreshTokenService;
import com.epam.edp.demo.service.UserRegistrationService;

/**
 * Integration tests for exception handling in {@link AuthController}.
 * Uses {@link MockMvc} to verify HTTP status codes and error response structure
 * for validation failures, duplicate emails, malformed JSON, and unexpected errors.
 */
@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AuthControllerExceptionHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRegistrationService userRegistrationService;

        @MockBean
        private AuthService authService;

        @MockBean
        private RefreshTokenService refreshTokenService;

        @MockBean
        private JwtUtil jwtUtil;

        @MockBean
        private PasswordResetService passwordResetService;

    /**
     * Verifies that a request with invalid fields returns {@code 400 Bad Request}
     * with a "Validation failed" error.
     */
    @Test
    void shouldReturnBadRequestWhenValidationFails() throws Exception {
        String payload = """
                {
                  "firstName": "",
                  "lastName": "Doe",
                  "email": "invalid-email",
                  "password": "weak"
                }
                """;

        mockMvc.perform(post("/auth/sign-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    /**
     * Verifies that a duplicate email triggers {@code 409 Conflict}
     * with an "Email already exists" error.
     */
    @Test
    void shouldReturnConflictWhenEmailAlreadyExists() throws Exception {
        when(userRegistrationService.registerUser(any()))
                .thenThrow(new EmailAlreadyExistsException("john.doe@example.com"));

        mockMvc.perform(post("/auth/sign-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Email already exists"));
    }

    /**
     * Verifies that a malformed JSON body returns {@code 400 Bad Request}
     * with a "Malformed request body" error.
     */
    @Test
    void shouldReturnBadRequestForMalformedJson() throws Exception {
        String malformedPayload = "{\"firstName\":\"John\",";

        mockMvc.perform(post("/auth/sign-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(malformedPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Malformed request body"));
    }

    /**
     * Verifies that an unexpected runtime exception returns {@code 500 Internal Server Error}
     * with an "Internal server error" message.
     */
    @Test
    void shouldReturnInternalServerErrorForUnexpectedExceptions() throws Exception {
        when(userRegistrationService.registerUser(any()))
                .thenThrow(new RuntimeException("unexpected"));

        mockMvc.perform(post("/auth/sign-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal server error"));
    }

    /**
     * Returns a valid JSON registration payload for tests that need to bypass validation.
     *
     * @return a valid JSON string
     */
    private String validPayload() {
        return """
                {
                  "firstName": "John",
                  "lastName": "Doe",
                  "email": "john.doe@example.com",
                  "password": "Strong@123"
                }
                """;
    }
}
