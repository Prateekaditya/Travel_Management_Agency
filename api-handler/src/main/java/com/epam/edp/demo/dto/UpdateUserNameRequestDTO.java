package com.epam.edp.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserNameRequestDTO {

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[\\p{L}]+$", message = "must contain letters only")
    private String firstName;

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[\\p{L}]+$", message = "must contain letters only")
    private String lastName;
}
