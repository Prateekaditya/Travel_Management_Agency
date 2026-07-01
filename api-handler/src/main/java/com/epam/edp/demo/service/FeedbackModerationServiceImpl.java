package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.FeedbackModerationItemDTO;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackModerationServiceImpl implements FeedbackModerationService {

    private final TourRepository tourRepository;

    @Override
    public List<FeedbackModerationItemDTO> getAllFeedback(Integer rating, String tourType) {
        List<Tour> tours = tourRepository.findAll();

        List<FeedbackModerationItemDTO> result = new ArrayList<>();

        for (Tour tour : tours) {
            if (tour.getReviews() == null) continue;

            // Apply tourType filter at tour level
            if (tourType != null && !tourType.isBlank()
                    && !tourType.equalsIgnoreCase(tour.getTourType())) {
                continue;
            }

            for (Tour.Review review : tour.getReviews()) {
                // Apply rating filter
                if (rating != null && (int) review.getRate() != rating) continue;

                result.add(FeedbackModerationItemDTO.builder()
                        .tourId(tour.getId())
                        .tourName(tour.getName())
                        .tourType(tour.getTourType())
                        .destination(tour.getDestination())
                        .userId(review.getUserId() != null ? review.getUserId() : "author:" + review.getAuthorName())
                        .authorName(review.getAuthorName())
                        .createdAt(review.getCreatedAt())
                        .rating(review.getRate())
                        .comment(review.getReviewContent())
                        .visibility(review.getVisibility() != null ? review.getVisibility() : "PUBLISHED")
                        .flagged(review.isFlagged())
                        .flagReason(review.getFlagReason())
                        .build());
            }
        }

        // Sort: flagged first, then by createdAt descending
        result.sort((a, b) -> {
            if (a.isFlagged() != b.isFlagged()) return a.isFlagged() ? -1 : 1;
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            }
            return 0;
        });

        return result;
    }

    @Override
    public void updateVisibility(String tourId, String userId, String visibility) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + tourId));

        if (tour.getReviews() == null) {
            throw new ResourceNotFoundException("No reviews found for tour: " + tourId);
        }

        Tour.Review review = tour.getReviews().stream()
                .filter(r -> {
                    if (r.getUserId() != null) return userId.equals(r.getUserId());
                    // fallback: synthetic key "author:<authorName>"
                    return userId.equals("author:" + r.getAuthorName());
                })
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Review by user " + userId + " not found on tour " + tourId));

        review.setVisibility(visibility);
        log.debug("Review by userId={} on tourId={} set to visibility={}", userId, tourId, visibility);

        tourRepository.save(tour);
    }
}
