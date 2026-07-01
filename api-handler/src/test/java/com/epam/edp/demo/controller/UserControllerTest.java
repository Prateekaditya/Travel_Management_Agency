package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.ChangeEmailRequestDTO;
import com.epam.edp.demo.dto.ChangeEmailResponseDTO;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;
import com.epam.edp.demo.dto.ConfirmEmailResponseDTO;
import com.epam.edp.demo.dto.UpdateNameResponseDTO;
import com.epam.edp.demo.dto.UpdatePasswordRequestDTO;
import com.epam.edp.demo.dto.UpdatePasswordResponseDTO;
import com.epam.edp.demo.dto.UpdateUserNameRequestDTO;
import com.epam.edp.demo.dto.UserDTO;
import com.epam.edp.demo.exception.GlobalExceptionHandler;
import com.epam.edp.demo.exception.InvalidPasswordException;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String USER_ID = "user-1";
    private static final String OTHER_USER_ID = "user-2";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ===== GET /users/{id} =====

    @Test
    void getUser_success_returns200() throws Exception {
        authenticateAs(USER_ID);
        UserDTO dto = UserDTO.builder()
                .firstName("John")
                .lastName("Doe")
                .imageUrl(null)
                .role(Role.CUSTOMER)
                .build();
        when(userService.getUserById(USER_ID)).thenReturn(dto);

        mockMvc.perform(get("/users/{id}", USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void getUser_differentUserInPath_returns401() throws Exception {
        authenticateAs(USER_ID);

        mockMvc.perform(get("/users/{id}", OTHER_USER_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getUser_notAuthenticated_returns401() throws Exception {
        setUnauthenticated();

        mockMvc.perform(get("/users/{id}", USER_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getUser_userNotFound_returns404() throws Exception {
        authenticateAs(USER_ID);
        when(userService.getUserById(USER_ID))
                .thenThrow(new ResourceNotFoundException("User not found with id: " + USER_ID));

        mockMvc.perform(get("/users/{id}", USER_ID))
                .andExpect(status().isNotFound());
    }

    // ===== PUT /users/{id}/name =====

    @Test
    void updateName_success_returns200() throws Exception {
        authenticateAs(USER_ID);
        when(userService.updateName(eq(USER_ID), any()))
                .thenReturn(new UpdateNameResponseDTO("Name updated successfully"));

        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("Jane");
        req.setLastName("Smith");

        mockMvc.perform(put("/users/{id}/name", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Name updated successfully"));
    }

    @Test
    void updateName_differentUserInPath_returns401() throws Exception {
        authenticateAs(USER_ID);

        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("Jane");
        req.setLastName("Smith");

        mockMvc.perform(put("/users/{id}/name", OTHER_USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateName_blankFirstName_returns400() throws Exception {
        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("  ");
        req.setLastName("Smith");

        mockMvc.perform(put("/users/{id}/name", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateName_numbersInName_returns400() throws Exception {
        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("John123");
        req.setLastName("Doe");

        mockMvc.perform(put("/users/{id}/name", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateName_nameTooLong_returns400() throws Exception {
        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("A".repeat(51));
        req.setLastName("Doe");

        mockMvc.perform(put("/users/{id}/name", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateName_notAuthenticated_returns401() throws Exception {
        setUnauthenticated();

        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("Jane");
        req.setLastName("Smith");

        mockMvc.perform(put("/users/{id}/name", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ===== PUT /users/{id}/password =====

    @Test
    void updatePassword_success_returns200() throws Exception {
        authenticateAs(USER_ID);
        when(userService.updatePassword(eq(USER_ID), any()))
                .thenReturn(new UpdatePasswordResponseDTO("Password updated successfully"));

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Old@1234");
        req.setNewPassword("New@1234");

        mockMvc.perform(put("/users/{id}/password", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));
    }

    @Test
    void updatePassword_wrongCurrentPassword_returns400() throws Exception {
        authenticateAs(USER_ID);
        when(userService.updatePassword(eq(USER_ID), any()))
                .thenThrow(new InvalidPasswordException("Current password is incorrect"));

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Wrong@1234");
        req.setNewPassword("New@1234");

        mockMvc.perform(put("/users/{id}/password", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePassword_weakNewPassword_returns400() throws Exception {
        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Old@1234");
        req.setNewPassword("weak");

        mockMvc.perform(put("/users/{id}/password", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePassword_differentUserInPath_returns401() throws Exception {
        authenticateAs(USER_ID);

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Old@1234");
        req.setNewPassword("New@1234");

        mockMvc.perform(put("/users/{id}/password", OTHER_USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ===== PUT /users/{id}/email =====

    @Test
    void initiateEmailChange_success_returns200() throws Exception {
        authenticateAs(USER_ID);
        when(userService.initiateEmailChange(eq(USER_ID), any()))
                .thenReturn(new ChangeEmailResponseDTO("Confirmation email sent to new@example.com"));

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Current@1234");

        mockMvc.perform(put("/users/{id}/email", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Confirmation email sent to new@example.com"));
    }

    @Test
    void initiateEmailChange_wrongPassword_returns400() throws Exception {
        authenticateAs(USER_ID);
        when(userService.initiateEmailChange(eq(USER_ID), any()))
                .thenThrow(new InvalidPasswordException("Password is incorrect"));

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Wrong@1234");

        mockMvc.perform(put("/users/{id}/email", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiateEmailChange_invalidEmailFormat_returns400() throws Exception {
        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("not-an-email");
        req.setPassword("Current@1234");

        mockMvc.perform(put("/users/{id}/email", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiateEmailChange_differentUserInPath_returns401() throws Exception {
        authenticateAs(USER_ID);

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Current@1234");

        mockMvc.perform(put("/users/{id}/email", OTHER_USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ===== POST /users/{id}/email/confirm =====

    @Test
    void confirmEmailChange_success_returns200() throws Exception {
        authenticateAs(USER_ID);
        when(userService.confirmEmailChange(eq(USER_ID), any()))
                .thenReturn(new ConfirmEmailResponseDTO("Your email has been changed successfully.", true));

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("valid-token-uuid");

        mockMvc.perform(post("/users/{id}/email/confirm", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Your email has been changed successfully."))
                .andExpect(jsonPath("$.requiresReLogin").value(true));
    }

    @Test
    void confirmEmailChange_invalidToken_returns404() throws Exception {
        authenticateAs(USER_ID);
        when(userService.confirmEmailChange(eq(USER_ID), any()))
                .thenThrow(new ResourceNotFoundException("Invalid or expired confirmation token"));

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("wrong-token");

        mockMvc.perform(post("/users/{id}/email/confirm", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    void confirmEmailChange_expiredToken_returns400() throws Exception {
        authenticateAs(USER_ID);
        when(userService.confirmEmailChange(eq(USER_ID), any()))
                .thenThrow(new com.epam.edp.demo.exception.InvalidVerificationCodeException("Confirmation token has expired"));

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("expired-token");

        mockMvc.perform(post("/users/{id}/email/confirm", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmEmailChange_blankToken_returns400() throws Exception {
        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("  ");

        mockMvc.perform(post("/users/{id}/email/confirm", USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmEmailChange_differentUserInPath_returns401() throws Exception {
        authenticateAs(USER_ID);

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("valid-token-uuid");

        mockMvc.perform(post("/users/{id}/email/confirm", OTHER_USER_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ===== Helpers =====

    private void authenticateAs(String userId) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(userId);
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(ctx);
    }

    private void setUnauthenticated() {
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(ctx);
    }
}
