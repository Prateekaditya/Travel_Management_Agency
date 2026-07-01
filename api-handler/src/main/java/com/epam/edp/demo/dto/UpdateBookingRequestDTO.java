package com.epam.edp.demo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateBookingRequestDTO {

    @NotNull
    private LocalDate date;

    @NotBlank
    private String duration;

    @NotBlank
    private String mealPlan;

    @NotNull
    @Valid
    private Guests guests;

    @NotNull
    @Valid
    private List<PersonalDetail> personalDetails;

    @Data
    public static class Guests {
        private int adult;
        private int children;
    }

    @Data
    public static class PersonalDetail {
        @NotBlank
        private String firstName;
        @NotBlank
        private String lastName;
    }
}
