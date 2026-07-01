package com.epam.edp.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingStateChangedEvent implements Serializable {

    private String bookingId;
    private String tourId;
    private String tourName;
    private String destination;
    private String agentId;
    private String agentName;
    private String agentEmail;
    private String userId;
    private String newState;
    private String previousState;
    private LocalDateTime eventTimestamp;
    private String totalPrice;
    private String duration;
    private String mealPlan;
    private int guestCount;
}
