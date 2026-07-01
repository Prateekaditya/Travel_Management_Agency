package com.epam.edp.demo.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateFeedbackVisibilityRequestDTO {
    @Pattern(regexp = "PUBLISHED|HIDDEN", message = "visibility must be PUBLISHED or HIDDEN")
    private String visibility;
}
