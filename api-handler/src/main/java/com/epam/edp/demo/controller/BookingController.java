package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.*;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.security.JwtUtil;
import com.epam.edp.demo.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final JwtUtil jwtUtil;

    /**
     * POST /api/v1/bookings
     */
    @PostMapping
    public ResponseEntity<CreateBookingResponseDTO> createBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody CreateBookingRequestDTO request) {

        String userId = extractUserIdFromToken(authHeader);
        request.setUserId(userId);

        CreateBookingResponseDTO response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/bookings
     * Get all bookings for logged-in user
     */
    @GetMapping
    public ResponseEntity<?> getBookings(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String agentId) {

        // Step 1: validate JWT → get authenticated caller's userId
        String tokenUserId = extractUserIdFromToken(authHeader);

        // Step 2: enforce OpenAPI contract — at least one param required
        if ((userId == null || userId.isBlank()) && (agentId == null || agentId.isBlank())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Either 'userId' or 'agentId' must be specified."));
        }
        if (agentId != null && !agentId.isBlank()) {
            if (!agentId.equals(tokenUserId)) {
                throw new UnauthorizedException("You are not authorized to view these bookings.");
            }
            List<BookingResponseDTO> bookings = bookingService.getBookingsForAgent(agentId);
            return ResponseEntity.ok(Map.of("bookings", bookings));
        }

        // Step 4: userId path — customer view
        if (!userId.equals(tokenUserId)) {
            throw new UnauthorizedException("You are not authorized to view these bookings.");
        }
        List<BookingResponseDTO> bookings = bookingService.getBookingsForUser(userId);
        return ResponseEntity.ok(Map.of("bookings", bookings));
    }



    /**
     * PATCH /api/v1/bookings/{bookingId}
     * Edit an existing booking (date, duration, meal plan, guests, personal details)
     */
    @PatchMapping("/{bookingId}")
    public ResponseEntity<BookingResponseDTO> updateBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @Valid @RequestBody UpdateBookingRequestDTO request) {

        String userId = extractUserIdFromToken(authHeader);
        BookingResponseDTO updated = bookingService.updateBooking(bookingId, userId, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/v1/bookings/{bookingId}
     * Cancel a booking for the logged-in user
     */
    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Map<String, String>> cancelBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId) {

        String userId = extractUserIdFromToken(authHeader);
        bookingService.cancelBooking(bookingId, userId);
        return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
    }


    // Shared JWT validation helper
    private String extractUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authentication required. Please log in or sign up.");
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            throw new UnauthorizedException("Invalid or expired token. Please log in again.");
        }
        return jwtUtil.extractSubject(token);
    }

    /**
     * POST /api/v1/bookings/{bookingId}/documents
     * Upload a new document to a booking (with optional label for the slot)
     */
    @PostMapping("/{bookingId}/documents")
    public ResponseEntity<Map<String, String>> uploadDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "label", required = false) String label) {

        String userId = extractUserIdFromToken(authHeader);
        String documentId = bookingService.uploadDocument(bookingId, userId, file, label);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "Document uploaded successfully",
                        "documentId", documentId
                ));
    }

    /**
     * PUT /api/v1/bookings/{bookingId}/documents/{documentId}
     * Replace an existing document (update flow — same slot, new file)
     */
    @PutMapping("/{bookingId}/documents/{documentId}")
    public ResponseEntity<Map<String, String>> replaceDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @PathVariable String documentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "label", required = false) String label) {

        String userId = extractUserIdFromToken(authHeader);
        String replacedId = bookingService.replaceDocument(bookingId, userId, documentId, file, label);
        return ResponseEntity.ok(Map.of(
                "message", "Document updated successfully",
                "documentId", replacedId
        ));
    }



    /**
     * POST /api/v1/bookings/{bookingId}/confirm
     * Travel Agent confirms a booking (BOOKED → CONFIRMED).
     * Only accessible by users with role TRAVEL_AGENT.
     */
    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<Map<String, String>> confirmBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId) {

        String token = extractTokenFromHeader(authHeader);

        // Role check — only TRAVEL_AGENT may confirm
        String role = jwtUtil.extractRole(token);
        if (!"TRAVEL_AGENT".equals(role)) {
            throw new UnauthorizedException("Only travel agents can confirm bookings.");
        }

        String agentId = jwtUtil.extractSubject(token);
        String message = bookingService.confirmBooking(bookingId, agentId);
        return ResponseEntity.ok(Map.of("message", message));
    }

    private String extractTokenFromHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authentication required. Please log in or sign up.");
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            throw new UnauthorizedException("Invalid or expired token. Please log in again.");
        }
        return token;
    }



    /**
     * DELETE /api/v1/bookings/{bookingId}/cancel
     * Travel Agent cancels a booking with a reason (BOOKED or CONFIRMED → CANCELLED).
     * Only accessible by users with role TRAVEL_AGENT.
     */
    @DeleteMapping("/{bookingId}/cancel")
    public ResponseEntity<Map<String, String>> agentCancelBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @RequestBody(required = false) AgentCancelRequestDTO body) {

        String token = extractTokenFromHeader(authHeader);

        // Role check — only TRAVEL_AGENT may use this endpoint
        String role = jwtUtil.extractRole(token);
        if (!"TRAVEL_AGENT".equals(role)) {
            throw new UnauthorizedException("Only travel agents can cancel bookings via this endpoint.");
        }

        String agentId = jwtUtil.extractSubject(token);
        String reason  = body != null ? body.getCancellationReason() : null;
        String comment = body != null ? body.getComment() : null;

        String message = bookingService.agentCancelBooking(bookingId, agentId, reason, comment);
        return ResponseEntity.ok(Map.of("message", message));
    }

    /**
     * PATCH /api/v1/bookings/{bookingId}/agent-edit
     * Travel Agent proposes changes — stored as PENDING until customer approves.
     */
    @PatchMapping("/{bookingId}/agent-edit")
    public ResponseEntity<BookingResponseDTO> agentEditBooking(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @Valid @RequestBody UpdateBookingRequestDTO request) {

        String token = extractTokenFromHeader(authHeader);
        String role = jwtUtil.extractRole(token);
        if (!"TRAVEL_AGENT".equals(role)) {
            throw new UnauthorizedException("Only travel agents can propose booking changes.");
        }
        String agentId = jwtUtil.extractSubject(token);
        BookingResponseDTO result = bookingService.agentEditBooking(bookingId, agentId, request);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/bookings/{bookingId}/approve-changes
     * Customer approves the pending changes proposed by the travel agent.
     */
    @PostMapping("/{bookingId}/approve-changes")
    public ResponseEntity<BookingResponseDTO> approveChanges(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId) {

        String userId = extractUserIdFromToken(authHeader);
        BookingResponseDTO result = bookingService.approveChanges(bookingId, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/bookings/{bookingId}/decline-changes
     * Customer declines the pending changes — resets changeRequestStatus so agent can edit again.
     */
    @PostMapping("/{bookingId}/decline-changes")
    public ResponseEntity<BookingResponseDTO> declineChanges(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId) {

        String userId = extractUserIdFromToken(authHeader);
        BookingResponseDTO result = bookingService.declineChanges(bookingId, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/bookings/{bookingId}/documents/{documentId}/download
     * Download a document — accessible by the booking owner (CUSTOMER) or the assigned TRAVEL_AGENT.
     * Returns the raw file bytes with correct Content-Type and Content-Disposition headers.
     */
    @GetMapping("/{bookingId}/documents/{documentId}/download")
    public ResponseEntity<byte[]> downloadDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String bookingId,
            @PathVariable String documentId) {

        String callerId = extractUserIdFromToken(authHeader);
        BookingService.BookingDocumentDownload download =
                bookingService.downloadDocument(bookingId, documentId, callerId);

        String encodedName = URLEncoder.encode(
                download.fileName() != null ? download.fileName() : "document",
                StandardCharsets.UTF_8).replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(download.contentType()));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedName);
        headers.setContentLength(download.content().length);

        return new ResponseEntity<>(download.content(), headers, HttpStatus.OK);
    }

}
