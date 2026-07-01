package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.FeedbackModerationItemDTO;
import com.epam.edp.demo.dto.TravelAgentRequest;
import com.epam.edp.demo.dto.UpdateFeedbackVisibilityRequestDTO;
import com.epam.edp.demo.model.TravelAgent;
import com.epam.edp.demo.service.FeedbackModerationService;
import com.epam.edp.demo.service.TravelAgentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for admin-only operations.
 * All paths under /admin/** are protected by ROLE_ADMIN in SecurityConfig.
 */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final TravelAgentService travelAgentService;
    private final FeedbackModerationService feedbackModerationService;

    public AdminController(TravelAgentService travelAgentService,
                           FeedbackModerationService feedbackModerationService) {
        this.travelAgentService = travelAgentService;
        this.feedbackModerationService = feedbackModerationService;
    }

    // ── Travel-agent email management ─────────────────────────────────────────

    @PostMapping("/travel-agents")
    public ResponseEntity<TravelAgent> addTravelAgentEmail(
            @Valid @RequestBody TravelAgentRequest request) {
        TravelAgent created = travelAgentService.addEmail(request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/travel-agents")
    public ResponseEntity<List<TravelAgent>> getAllTravelAgentEmails() {
        return ResponseEntity.ok(travelAgentService.getAllEmails());
    }

    @DeleteMapping("/travel-agents/{id}")
    public ResponseEntity<Void> removeTravelAgentEmail(@PathVariable String id) {
        travelAgentService.removeEmail(id);
        return ResponseEntity.noContent().build();
    }

    // ── Feedback Moderation ────────────────────────────────────────────────────

    /**
     * GET /admin/feedbacks
     * Returns all customer feedback across all tours.
     * Flagged reviews appear first. Supports optional filters:
     *   ?rating=1   – only show reviews with that exact star rating (1–5)
     *   ?tourType=Adventure – only show reviews for tours of that type
     */
    @GetMapping("/feedbacks")
    public ResponseEntity<List<FeedbackModerationItemDTO>> getAllFeedback(
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String tourType) {
        return ResponseEntity.ok(feedbackModerationService.getAllFeedback(rating, tourType));
    }

    /**
     * PATCH /admin/feedbacks/{tourId}/{userId}
     * Changes the visibility of a specific review.
     * Body: { "visibility": "PUBLISHED" | "HIDDEN" }
     */
    @PatchMapping("/feedbacks/{tourId}/{userId}")
    public ResponseEntity<Map<String, String>> updateFeedbackVisibility(
            @PathVariable String tourId,
            @PathVariable String userId,
            @Valid @RequestBody UpdateFeedbackVisibilityRequestDTO request) {
        feedbackModerationService.updateVisibility(tourId, userId, request.getVisibility());
        String msg = "HIDDEN".equals(request.getVisibility())
                ? "Feedback hidden successfully."
                : "Feedback published successfully.";
        return ResponseEntity.ok(Map.of("message", msg));
    }
}