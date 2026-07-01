package com.epam.edp.demo.exception;

/**
 * Thrown when a registration attempt uses an email address that is already associated
 * with an existing user profile.
 */
public class EmailAlreadyExistsException extends RuntimeException {

    /**
     * Constructs the exception with a message identifying the duplicate email.
     *
     * @param email the email address that already exists
     */
    public EmailAlreadyExistsException(String email) {
        super("An account already exists for email: " + email);
    }
}
