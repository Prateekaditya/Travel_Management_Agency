package com.epam.edp.demo.validation;

import java.util.regex.Pattern;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator for the {@link StrongPassword} constraint.
 * Uses a regex pattern to enforce password complexity rules:
 * at least one lowercase, one uppercase, one digit, one special character,
 * and a length between 8 and 64 characters.
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    private static final Pattern PASSWORD_PATTERN = Pattern
            .compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-={}\\[\\]:;\"'\\\\|<>,.?/]).{8,64}$");

    /**
     * Validates that the given password meets strength requirements.
     *
     * @param value   the password string to validate
     * @param context the constraint validator context
     * @return {@code true} if the password matches the strength pattern, {@code false} otherwise
     */
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }

        return PASSWORD_PATTERN.matcher(value).matches();
    }
}
