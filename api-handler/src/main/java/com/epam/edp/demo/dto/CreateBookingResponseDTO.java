package com.epam.edp.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class CreateBookingResponseDTO {

    private LocalDate freeCancelation;
    private String details;
}

