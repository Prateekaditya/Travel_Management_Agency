package com.epam.edp.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingResponseDTO {

    private String id;
    private String tourId;
    private String state;
    private String tourImageUrl;
    private String name;
    private String destination;
    private TourDetails tourDetails;
    private TravelAgent travelAgent;
    private String canceledBy;
    private String cancelReason;
    private String freeCancelation;
    private List<PersonalDetailDTO> personalDetails;
    private List<DocumentDTO> documents;

    /** Agent change request state: null | "PENDING" | "APPROVED" | "DECLINED" */
    private String changeRequestStatus;

    /**
     * Proposed changes from the Travel Agent, pending customer approval.
     * Populated only when changeRequestStatus == "PENDING".
     */
    private PendingChangesDTO pendingChanges;

    /**
     * Customer contact info and documents — visible only to the assigned Travel Agent.
     * Null when fetched via GET /bookings?userId=... (customer view).
     * Populated in GET /bookings?agentId=... (agent view).
     */
    private CustomerDetails customerDetails;


    // ── Inner classes ──────────────────────────────────────────────────────────

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DocumentDTO {
        private String id;
        private String fileName;
        private String fileType;
        private String uploadedAt;
        private String s3Key;
        private Long sizeBytes;
        private String documentLabel;
        /** Pre-signed S3 URL for direct in-browser viewing (1-hour TTL). */
        private String fileUrl;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TourDetails {
        private String date;        // "Jan 17, 2025 (7 days)"
        private String mealPlan;    // "Breakfast (BB)"
        private String guests;      // "John Doe (1 adult)"
        private String totalPrice;  // "$1400"
        private String documents;   // "2 items"
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TravelAgent {
        private String name;
        private String email;
        private String phone;
        private String messenger;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PersonalDetailDTO {
        private String firstName;
        private String lastName;
    }

    /** Customer contact + uploaded documents (Travel Agent view only). */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CustomerDetails {
        private String name;   // "Johnson Doe (1 adult)"
        private String email;
        private String phone;
        private CustomerDocuments documents;
    }

    /** Customer documents split into payment receipts and guest identity docs. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CustomerDocuments {
        private List<PaymentDocument> payments;
        private List<GuestDocumentGroup> guestDocuments;
    }

    /** A single payment receipt uploaded by the customer. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaymentDocument {
        private String id;
        private String fileName;
        private String fileUrl;  // S3 presigned URL
    }

    /** All identity documents uploaded for a single guest. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GuestDocumentGroup {
        private String userName;   // e.g. "Johnson Doe"
        private List<GuestDocument> documents;
    }

    /** A single identity document (passport, visa, etc.) for a guest. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GuestDocument {
        private String id;
        private String fileName;
        private String fileUrl;  // S3 presigned URL
    }

    /**
     * Proposed booking changes from a Travel Agent, pending customer approval.
     * All display values are pre-formatted identically to TourDetails for easy comparison.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PendingChangesDTO {
        /** Formatted date, e.g. "Jun 14, 2026" (no duration) */
        private String date;
        /** Duration string, e.g. "7 days" */
        private String duration;
        /** Formatted meal plan, e.g. "Breakfast (BB)" */
        private String mealPlan;
        /** Raw guest counts for frontend formatting */
        private GuestsDTO guests;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GuestsDTO {
        private int adult;
        private int children;
    }
}
