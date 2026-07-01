package com.epam.edp.demo.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tours")
public class Tour {
    @Id
    private String id;
    private String name;
    private String destination;
    private String tourType;
    private Double rating;
    private Integer reviewCount;
    private List<String> imageUrls;
    private String summary;
    private Integer freeCancelationDaysBefore;
    private List<String> durations;
    private String accomodiation;
    private String hotelName;
    private String hotelDescription;
    private List<String> mealPlans;
    private Map<String, String> customDetails;
    private List<String> startDates;
    private Map<String, String> price;
    private Map<String, String> mealSupplementsPerDay;
    private GuestQuantity guestQuantity;
    private String freeCancelationDate;
    private Integer capacity;
    private List<Review> reviews;

    /** The ID of the Travel Agent assigned to manage this tour. Set by Admin. */
    private String travelAgentId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuestQuantity {
        private Integer adultsMaxValue;
        private Integer childrenMaxValue;
        private Integer totalMaxVelue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Review {
        private String userId;
        private String authorName;
        private String authorImageUrl;
        private String createdAt;
        private double rate;
        private String reviewContent;
        /** "PUBLISHED" (default) or "HIDDEN" — controlled by Admin moderation. */
        @Builder.Default
        private String visibility = "PUBLISHED";
        /** True when auto-flagged for prohibited content pending admin review. */
        @Builder.Default
        private boolean flagged = false;
        /** Reason the review was auto-flagged (null when not flagged). */
        private String flagReason;
    }
}
