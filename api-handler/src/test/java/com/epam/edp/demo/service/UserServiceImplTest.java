package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.ChangeEmailRequestDTO;
import com.epam.edp.demo.dto.ChangeEmailResponseDTO;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;
import com.epam.edp.demo.dto.ConfirmEmailResponseDTO;
import com.epam.edp.demo.dto.UpdateNameResponseDTO;
import com.epam.edp.demo.dto.UpdatePasswordRequestDTO;
import com.epam.edp.demo.dto.UpdatePasswordResponseDTO;
import com.epam.edp.demo.dto.UpdateUserNameRequestDTO;
import com.epam.edp.demo.dto.UserDTO;
import com.epam.edp.demo.exception.InvalidPasswordException;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.exception.InvalidVerificationCodeException;
import com.epam.edp.demo.model.EmailChangeToken;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.EmailChangeTokenRepository;
import com.epam.edp.demo.repository.UserRepository;
import com.epam.edp.demo.service.EmailService;
import com.epam.edp.demo.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailChangeTokenRepository emailChangeTokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private UserServiceImpl userService;

    private static final String USER_ID = "user-1";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(userService, "frontendUrl", "http://localhost:5173");
    }

    // ===== getUserById =====

    @Test
    void getUserById_existingUser_returnsDTO() {
        User user = User.builder()
                .id(USER_ID)
                .firstName("John")
                .lastName("Doe")
                .imageUrl("https://example.com/avatar.jpg")
                .role(Role.CUSTOMER)
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserById(USER_ID);

        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getLastName()).isEqualTo("Doe");
        assertThat(result.getImageUrl()).isEqualTo("https://example.com/avatar.jpg");
        assertThat(result.getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void getUserById_nullImageUrl_returnsDTOWithNullImageUrl() {
        User user = User.builder()
                .id(USER_ID)
                .firstName("John")
                .lastName("Doe")
                .imageUrl(null)
                .role(Role.CUSTOMER)
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserById(USER_ID);

        assertThat(result.getImageUrl()).isNull();
    }

    @Test
    void getUserById_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserById(USER_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(USER_ID);
    }

    // ===== updateName =====

    @Test
    void updateName_success_updatesAndReturnsMessage() {
        User user = User.builder()
                .id(USER_ID)
                .firstName("Old")
                .lastName("Name")
                .role(Role.CUSTOMER)
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("Jane");
        req.setLastName("Smith");

        UpdateNameResponseDTO result = userService.updateName(USER_ID, req);

        assertThat(result.getMessage()).isEqualTo("Name updated successfully");
        assertThat(user.getFirstName()).isEqualTo("Jane");
        assertThat(user.getLastName()).isEqualTo("Smith");
        verify(userRepository).save(user);
    }

    @Test
    void updateName_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        UpdateUserNameRequestDTO req = new UpdateUserNameRequestDTO();
        req.setFirstName("Jane");
        req.setLastName("Smith");

        assertThatThrownBy(() -> userService.updateName(USER_ID, req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(USER_ID);

        verify(userRepository, never()).save(any());
    }

    // ===== updatePassword =====

    @Test
    void updatePassword_correctCurrentPassword_updatesAndReturnsMessage() {
        User user = User.builder()
                .id(USER_ID)
                .password("$2a$encoded")
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Old@1234", "$2a$encoded")).thenReturn(true);
        when(passwordEncoder.encode("New@1234")).thenReturn("$2a$newencoded");
        when(userRepository.save(any())).thenReturn(user);

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Old@1234");
        req.setNewPassword("New@1234");

        UpdatePasswordResponseDTO result = userService.updatePassword(USER_ID, req);

        assertThat(result.getMessage()).isEqualTo("Password updated successfully");
        assertThat(user.getPassword()).isEqualTo("$2a$newencoded");
        verify(userRepository).save(user);
    }

    @Test
    void updatePassword_wrongCurrentPassword_throwsInvalidPasswordException() {
        User user = User.builder()
                .id(USER_ID)
                .password("$2a$encoded")
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong@1234", "$2a$encoded")).thenReturn(false);

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Wrong@1234");
        req.setNewPassword("New@1234");

        assertThatThrownBy(() -> userService.updatePassword(USER_ID, req))
                .isInstanceOf(InvalidPasswordException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void updatePassword_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        UpdatePasswordRequestDTO req = new UpdatePasswordRequestDTO();
        req.setCurrentPassword("Old@1234");
        req.setNewPassword("New@1234");

        assertThatThrownBy(() -> userService.updatePassword(USER_ID, req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(USER_ID);

        verify(userRepository, never()).save(any());
    }

    // ===== initiateEmailChange =====

    @Test
    void initiateEmailChange_success_sendsEmailAndReturnsMessage() {
        User user = User.builder()
                .id(USER_ID)
                .email("old@example.com")
                .password("$2a$encoded")
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Current@1234", "$2a$encoded")).thenReturn(true);

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Current@1234");

        ChangeEmailResponseDTO result = userService.initiateEmailChange(USER_ID, req);

        assertThat(result.getMessage()).contains("new@example.com");
        verify(emailChangeTokenRepository).deleteByUserId(USER_ID);
        verify(emailChangeTokenRepository).save(any());
        verify(emailService).sendEmail(eq("new@example.com"), any(), any());
    }

    @Test
    void initiateEmailChange_wrongPassword_throwsInvalidPasswordException() {
        User user = User.builder()
                .id(USER_ID)
                .password("$2a$encoded")
                .build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong@1234", "$2a$encoded")).thenReturn(false);

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Wrong@1234");

        assertThatThrownBy(() -> userService.initiateEmailChange(USER_ID, req))
                .isInstanceOf(InvalidPasswordException.class);

        verify(emailChangeTokenRepository, never()).save(any());
        verify(emailService, never()).sendEmail(any(), any(), any());
    }

    @Test
    void initiateEmailChange_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        ChangeEmailRequestDTO req = new ChangeEmailRequestDTO();
        req.setNewEmail("new@example.com");
        req.setPassword("Current@1234");

        assertThatThrownBy(() -> userService.initiateEmailChange(USER_ID, req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(USER_ID);

        verify(emailService, never()).sendEmail(any(), any(), any());
    }

    // ===== confirmEmailChange =====

    @Test
    void confirmEmailChange_success_updatesEmailAndRevokesTokens() {
        EmailChangeToken token = EmailChangeToken.builder()
                .userId(USER_ID)
                .newEmail("new@example.com")
                .token("valid-uuid")
                .expiresAt(java.time.Instant.now().plusSeconds(300))
                .build();
        User user = User.builder().id(USER_ID).email("old@example.com").build();
        when(emailChangeTokenRepository.findByToken("valid-uuid")).thenReturn(Optional.of(token));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("valid-uuid");

        ConfirmEmailResponseDTO result = userService.confirmEmailChange(USER_ID, req);

        assertThat(result.getMessage()).isEqualTo("Your email has been changed successfully.");
        assertThat(result.isRequiresReLogin()).isTrue();
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        verify(userRepository).save(user);
        verify(refreshTokenService).revokeAllRefreshTokens(user);
        verify(emailChangeTokenRepository).delete(token);
    }

    @Test
    void confirmEmailChange_tokenNotFound_throwsResourceNotFoundException() {
        when(emailChangeTokenRepository.findByToken("bad-token")).thenReturn(Optional.empty());

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("bad-token");

        assertThatThrownBy(() -> userService.confirmEmailChange(USER_ID, req))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmEmailChange_tokenBelongsToDifferentUser_throwsResourceNotFoundException() {
        EmailChangeToken token = EmailChangeToken.builder()
                .userId("other-user")
                .newEmail("new@example.com")
                .token("valid-uuid")
                .expiresAt(java.time.Instant.now().plusSeconds(300))
                .build();
        when(emailChangeTokenRepository.findByToken("valid-uuid")).thenReturn(Optional.of(token));

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("valid-uuid");

        assertThatThrownBy(() -> userService.confirmEmailChange(USER_ID, req))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmEmailChange_expiredToken_throwsInvalidVerificationCodeException() {
        EmailChangeToken token = EmailChangeToken.builder()
                .userId(USER_ID)
                .newEmail("new@example.com")
                .token("expired-uuid")
                .expiresAt(java.time.Instant.now().minusSeconds(1))
                .build();
        when(emailChangeTokenRepository.findByToken("expired-uuid")).thenReturn(Optional.of(token));

        ConfirmEmailRequestDTO req = new ConfirmEmailRequestDTO();
        req.setConfirmationToken("expired-uuid");

        assertThatThrownBy(() -> userService.confirmEmailChange(USER_ID, req))
                .isInstanceOf(InvalidVerificationCodeException.class);

        verify(userRepository, never()).save(any());
        verify(emailChangeTokenRepository).delete(token);
    }
}
