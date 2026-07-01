package com.epam.edp.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record TourSummaryDTO(
        String id,
        String name,
        String destination,
        List<String> startDates,
        List<String> durations,
        List<String> mealPlans,
        String price,
        Double rating,
        Integer reviews,
        @JsonProperty("freeCancelation") String freeCancellation,
        List<String> imageUrls
) {
    public TourSummaryDTO {
        startDates = startDates != null ? List.copyOf(startDates) : List.of();
        durations = durations != null ? List.copyOf(durations) : List.of();
        mealPlans = mealPlans != null ? List.copyOf(mealPlans) : List.of();
        imageUrls = imageUrls != null ? List.copyOf(imageUrls) : List.of();
    }
}
