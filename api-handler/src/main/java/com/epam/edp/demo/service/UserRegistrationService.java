package com.epam.edp.demo.service;

import java.util.Locale;

import com.epam.edp.demo.model.Role;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.epam.edp.demo.dto.RegisterUserRequest;
import com.epam.edp.demo.dto.RegisterUserResponse;
import com.epam.edp.demo.exception.EmailAlreadyExistsException;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.UserRepository;

/**
 * Service responsible for user registration business logic including
 * email normalization, uniqueness validation, password hashing, and persistence.
 */
@Service
public class UserRegistrationService {

    private static final String SIGN_IN_ROUTE = "/sign-in";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleAssignmentService roleAssignmentService;

    /**
     * Constructs the service with the required repository and password encoder.
     *
     * @param userRepository  the MongoDB repository for users
     * @param passwordEncoder the encoder used to hash passwords before storage
     */
    public UserRegistrationService(UserRepository userRepository, PasswordEncoder passwordEncoder,RoleAssignmentService roleAssignmentService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleAssignmentService = roleAssignmentService;
    }

    /**
     * Registers a new user by normalizing their email, checking uniqueness,
     * hashing the password, and saving the profile to MongoDB.
     *
     * @param request the validated registration request DTO
     * @return a response containing a success message and the sign-in redirect route
     * @throws EmailAlreadyExistsException if the email is already registered
     */
    public RegisterUserResponse registerUser(RegisterUserRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException(normalizedEmail);
        }

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(roleAssignmentService.assignRole(normalizedEmail))
                .build();

        try {
            userRepository.save(user);
        } catch (DuplicateKeyException ex) {
            throw new EmailAlreadyExistsException(normalizedEmail);
        }

        return new RegisterUserResponse("Registration successful. Please sign in.", SIGN_IN_ROUTE);
    }

    /**
     * Normalizes an email address by trimming whitespace and converting to lowercase.
     *
     * @param email the raw email address
     * @return the normalized email, or {@code null} if the input is {@code null}
     */
    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
