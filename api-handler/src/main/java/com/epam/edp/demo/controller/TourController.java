package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.DestinationListResponseDTO;
import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.dto.TourReviewRequestDTO;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.service.TourService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Validated
@RestController
@RequestMapping("/tours")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TourController {

    private static final Set<String> ALLOWED_MEAL_PLANS = Set.of("BB", "HB", "FB");
    private static final Set<String> ALLOWED_TOUR_TYPES = Set.of("RESORT", "CRUISE", "HIKE");

    TourService tourService;

    @GetMapping("/destinations")
    public ResponseEntity<DestinationListResponseDTO> getDestinations(
            @RequestParam(required = false) String destination) {
        if (destination != null && destination.trim().length() < 3) {
            DestinationListResponseDTO empty = new DestinationListResponseDTO();
            empty.setDestinations(java.util.Collections.emptyList());
            return ResponseEntity.ok(empty);
        }
        return ResponseEntity.ok(tourService.getDestinations(destination));
    }

    @GetMapping("/available")
    public ResponseEntity<TourListResponseDTO> getAvailableTours(
            @RequestParam(defaultValue = "1") @Min(1) Integer page,
            @RequestParam(defaultValue = "6") @Min(1) Integer pageSize,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) List<String> duration,
            @RequestParam(required = false) List<String> mealPlan,
            @RequestParam(required = false) List<String> tourType,
            @RequestParam(required = false) Integer adults,
            @RequestParam(required = false) Integer children,
            @RequestParam(defaultValue = "RATING_DESC") String sortBy) {
        // Validate destination (letters, spaces, hyphens, commas, periods, apostrophes)
        if (destination != null && !destination.matches("^[a-zA-Z\\s\\-,.'&]+$")) {
            throw new IllegalArgumentException("Invalid destination format");
        }
        // Validate startDate (ISO format)
        if (startDate != null && !startDate.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            throw new IllegalArgumentException("Invalid startDate format, expected yyyy-MM-dd");
        }
        // Validate mealPlan and tourType (allowed values)
        if (mealPlan != null && mealPlan.stream().anyMatch(mp -> mp == null || !ALLOWED_MEAL_PLANS.contains(mp.toUpperCase()))) {
            throw new IllegalArgumentException("Invalid mealPlan value");
        }
        if (tourType != null && tourType.stream().anyMatch(tt -> tt == null || !ALLOWED_TOUR_TYPES.contains(tt.toUpperCase()))) {
            throw new IllegalArgumentException("Invalid tourType value");
        }
        return ResponseEntity.ok(tourService.getAvailableTours(
                page, pageSize, destination, startDate, endDate,
                duration, mealPlan, tourType, adults, children, sortBy));
    }

    @GetMapping("/travel-agent/{agentId}")
    public ResponseEntity<TourListResponseDTO> getToursByAgent(
            @PathVariable String agentId,
            @RequestParam(defaultValue = "1") @Min(1) Integer page,
            @RequestParam(defaultValue = "10000") @Min(1) Integer pageSize,
            @RequestParam(defaultValue = "RATING_DESC") String sortBy) {
        return ResponseEntity.ok(tourService.getToursByAgentId(agentId, page, pageSize, sortBy));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TourDetailsDTO> getTourById(@PathVariable String id) {
        // Accept UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        // or MongoDB ObjectId format (24 hex characters)
        boolean isUuid = id.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
        boolean isObjectId = id.matches("^[0-9a-fA-F]{24}$");
        if (!isUuid && !isObjectId) {
            throw new IllegalArgumentException("Invalid tour id format");
        }
        return ResponseEntity.ok(tourService.getTourById(id));
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<ReviewListResponseDTO> getReviewsByTourId(
            @PathVariable String id,
            @RequestParam(defaultValue = "1") @Min(1) Integer page,
            @RequestParam(defaultValue = "4") @Min(1) Integer pageSize,
            @RequestParam(defaultValue = "RATING_DESC") String sortBy) {
        return ResponseEntity.ok(tourService.getReviewsByTourId(id, page, pageSize, sortBy));
    }

    @PostMapping("/{id}/feedbacks")
    public ResponseEntity<Map<String, String>> submitFeedback(
            @PathVariable String id,
            @Valid @RequestBody TourReviewRequestDTO request) {

        String userId = getAuthenticatedUserId();
        tourService.submitFeedback(id, userId, request.getRating(), request.getComment());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Your feedback has been submitted."));
    }

    @PatchMapping("/{id}/feedbacks")
    public ResponseEntity<Map<String, String>> updateFeedback(
            @PathVariable String id,
            @Valid @RequestBody TourReviewRequestDTO request) {

        String userId = getAuthenticatedUserId();
        tourService.updateFeedback(id, userId, request.getRating(), request.getComment());
        return ResponseEntity.ok(Map.of("message", "Your feedback has been updated."));
    }

    private String getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken || !auth.isAuthenticated()) {
            throw new UnauthorizedException("Authentication required. Please log in or sign up.");
        }
        return auth.getName();
    }

}
