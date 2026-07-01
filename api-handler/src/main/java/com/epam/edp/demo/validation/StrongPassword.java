package com.epam.edp.demo.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Custom validation annotation that enforces password strength requirements.
 * A valid password must be 8–64 characters and include at least one uppercase letter,
 * one lowercase letter, one digit, and one special character.
 *
 * @see StrongPasswordValidator
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    /**
     * The error message returned when validation fails.
     *
     * @return the default error message
     */
    String message() default "Password must be at least 8 characters and include upper/lower case letters, a number, and a special character";

    /**
     * Allows specification of validation groups.
     *
     * @return the validation groups
     */
    Class<?>[] groups() default {};

    /**
     * Can be used by clients to assign custom payload objects to a constraint.
     *
     * @return the payload type
     */
    Class<? extends Payload>[] payload() default {};
}
