package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.FeedbackModerationItemDTO;

import java.util.List;

public interface FeedbackModerationService {

    /**
     * Returns all reviews across all tours, optionally filtered by rating and/or tourType.
     *
     * @param rating   exact star rating to filter by (1–5), or null for all
     * @param tourType tour category to filter by, or null for all
     */
    List<FeedbackModerationItemDTO> getAllFeedback(Integer rating, String tourType);

    /**
     * Changes the visibility of a specific review.
     *
     * @param tourId     the tour the review belongs to
     * @param userId     the author of the review
     * @param visibility "PUBLISHED" or "HIDDEN"
     */
    void updateVisibility(String tourId, String userId, String visibility);
}
