package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.SignInRequestDTO;
import com.epam.edp.demo.dto.SignInResponseDTO;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.UserRepository;
import com.epam.edp.demo.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.epam.edp.demo.model.RefreshToken;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthService authService;

    private User user;
    private SignInRequestDTO request;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("user-id-1")
                .firstName("Jhonson")
                .lastName("Doe")
                .email("jhonson_doe@nomail.com")
                .password("encodedPassword")
                .role(Role.CUSTOMER)
                .build();

        request = new SignInRequestDTO();
        request.setEmail("jhonson_doe@nomail.com");
        request.setPassword("password123");
    }

    @Test
    void signIn_withValidCredentials_returnsTokenAndUserInfo() {
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPassword())).thenReturn(true);
        when(jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name())).thenReturn("mocked-jwt-token");

        RefreshToken mockRefreshToken = RefreshToken.builder()
                .id("refresh-token-id")
                .token("mocked-refresh-token")
                .user(user)
                .build();
        when(refreshTokenService.createRefreshToken(user)).thenReturn(mockRefreshToken);

        SignInResponseDTO response = authService.signIn(request);

        assertThat(response.getIdToken()).isEqualTo("mocked-jwt-token");
        assertThat(response.getRefreshToken()).isEqualTo("mocked-refresh-token");
        assertThat(response.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(response.getUserName()).isEqualTo("Jhonson Doe");
        assertThat(response.getEmail()).isEqualTo("jhonson_doe@nomail.com");
        assertThat(response.getUserId()).isEqualTo("user-id-1");
    }

    @Test
    void signIn_withNonExistentEmail_throwsBadCredentialsException() {
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.signIn(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Wrong password or email");
    }

    @Test
    void signIn_withWrongPassword_throwsBadCredentialsException() {
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.signIn(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Wrong password or email");
    }
}
