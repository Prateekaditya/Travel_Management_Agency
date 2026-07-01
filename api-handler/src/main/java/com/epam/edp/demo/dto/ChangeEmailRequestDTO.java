package com.epam.edp.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeEmailRequestDTO {

    @NotBlank
    @Email
    private String newEmail;

    @NotBlank
    private String password;
}