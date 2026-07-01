package com.epam.edp.demo.validation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.epam.edp.demo.dto.RegisterUserRequest;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

/**
 * Unit tests for bean validation constraints on {@link RegisterUserRequest}.
 * Uses the Jakarta Bean Validation API directly (no Spring context needed).
 */
class RegisterUserRequestValidationTest {

    private static Validator validator;
    private static ValidatorFactory validatorFactory;

    /**
     * Initializes the validator factory and validator before all tests.
     */
    @BeforeAll
    static void setUp() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    /**
     * Closes the validator factory after all tests complete.
     */
    @AfterAll
    static void tearDown() {
        validatorFactory.close();
    }

    /**
     * Verifies that a weak password (missing complexity requirements) triggers a validation error.
     */
    @Test
    void shouldRejectWeakPassword() {
        RegisterUserRequest request = validRequest();
        request.setPassword("weakpass");

        Set<ConstraintViolation<RegisterUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .anyMatch(message -> message.contains("at least 8 characters"));
    }

    /**
     * Verifies that a valid request produces no validation errors.
     */
    @Test
    void shouldAcceptValidRequest() {
        RegisterUserRequest request = validRequest();

        Set<ConstraintViolation<RegisterUserRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    /**
     * Verifies that first and last names containing digits trigger validation errors.
     */
    @Test
    void shouldRejectNamesContainingDigits() {
        RegisterUserRequest request = validRequest();
        request.setFirstName("Jane1");
        request.setLastName("Doe2");

        Set<ConstraintViolation<RegisterUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("First name must contain only letters", "Last name must contain only letters");
    }

    /**
     * Creates a fully valid {@link RegisterUserRequest} for use as a test baseline.
     *
     * @return a valid registration request
     */
    private RegisterUserRequest validRequest() {
        RegisterUserRequest request = new RegisterUserRequest();
        request.setFirstName("Jane");
        request.setLastName("Doe");
        request.setEmail("jane.doe@example.com");
        request.setPassword("Strong@123");
        return request;
    }
}
