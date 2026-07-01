package com.epam.edp.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackModerationItemDTO {
    private String tourId;
    private String tourName;
    private String tourType;
    private String destination;
    private String userId;
    private String authorName;
    private String createdAt;
    private double rating;
    private String comment;
    private String visibility;
    private boolean flagged;
    private String flagReason;
}
