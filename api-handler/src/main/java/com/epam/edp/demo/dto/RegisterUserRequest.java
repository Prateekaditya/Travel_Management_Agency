package com.epam.edp.demo.dto;

import com.epam.edp.demo.validation.StrongPassword;
import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for user registration requests.
 * Contains validated fields for first name, last name, email, and password.
 */
public class RegisterUserRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 50, message = "First name can contain at most 50 characters")
    @Pattern(regexp = "^[\\p{L}]+$", message = "First name must contain only letters")
    @JsonAlias({"first_name", "firstname"})
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50, message = "Last name can contain at most 50 characters")
    @Pattern(regexp = "^[\\p{L}]+$", message = "Last name must contain only letters")
    @JsonAlias({"last_name", "lastname"})
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;

    @NotBlank(message = "Password is required")
    @StrongPassword
    private String password;

    /**
     * Returns the user's first name.
     *
     * @return the first name
     */
    public String getFirstName() {
        return firstName;
    }

    /**
     * Sets the user's first name.
     *
     * @param firstName the first name to set
     */
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    /**
     * Returns the user's last name.
     *
     * @return the last name
     */
    public String getLastName() {
        return lastName;
    }

    /**
     * Sets the user's last name.
     *
     * @param lastName the last name to set
     */
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    /**
     * Returns the user's email address.
     *
     * @return the email address
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the user's email address.
     *
     * @param email the email address to set
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Returns the user's password (plain text, pre-hashing).
     *
     * @return the password
     */
    public String getPassword() {
        return password;
    }

    /**
     * Sets the user's password.
     *
     * @param password the password to set
     */
    public void setPassword(String password) {
        this.password = password;
    }
}
