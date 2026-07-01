package com.epam.edp.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.epam.edp.demo.dto.RegisterUserRequest;
import com.epam.edp.demo.dto.RegisterUserResponse;
import com.epam.edp.demo.exception.EmailAlreadyExistsException;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.UserRepository;

/**
 * Unit tests for {@link UserRegistrationService}.
 * Uses Mockito to mock the repository and password encoder dependencies.
 */
@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RoleAssignmentService roleAssignmentService;

    @InjectMocks
    private UserRegistrationService userRegistrationService;

    private RegisterUserRequest request;

    /**
     * Initializes a valid registration request before each test.
     */
    @BeforeEach
    void setUp() {
        request = new RegisterUserRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("John.Doe@example.com");
        request.setPassword("Strong@123");
    }

    /**
     * Verifies that a successful registration normalizes the email to lowercase,
     * encodes the password with BCrypt, persists the profile, and returns a sign-in route.
     */
    @Test
    void registerUserShouldStoreNormalizedEmailAndEncodedPassword() {
        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Strong@123")).thenReturn("encoded-password");
        when(roleAssignmentService.assignRole("john.doe@example.com")).thenReturn(Role.CUSTOMER);

        RegisterUserResponse response = userRegistrationService.registerUser(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User savedUser = captor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(savedUser.getPassword()).isEqualTo("encoded-password");
        assertThat(savedUser.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(response.getNextRoute()).isEqualTo("/sign-in");
    }

    /**
     * Verifies that registering with an already-existing email throws
     * {@link EmailAlreadyExistsException}.
     */
    @Test
    void registerUserShouldFailWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userRegistrationService.registerUser(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("john.doe@example.com");
    }

    /**
     * Verifies that a duplicate key race condition during save is caught
     * and translated into {@link EmailAlreadyExistsException}.
     */
    @Test
    void registerUserShouldHandleDuplicateKeyRaceCondition() {
        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Strong@123")).thenReturn("encoded-password");
        when(roleAssignmentService.assignRole("john.doe@example.com")).thenReturn(Role.CUSTOMER);
        when(userRepository.save(any(User.class))).thenThrow(new DuplicateKeyException("dup"));

        assertThatThrownBy(() -> userRegistrationService.registerUser(request))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }
}
