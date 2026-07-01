package com.epam.edp.demo.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Request body for travel agent cancellation.
 * cancellationReason must be one of the defined enum labels.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentCancelRequestDTO {

    /**
     * Human-readable label. Accepted values:
     * "Customer's Emergency", "Hotel Emergency",
     * "Safety Concerns", "Insufficient Bookings"
     */
    private String cancellationReason;

    private String comment;
}
