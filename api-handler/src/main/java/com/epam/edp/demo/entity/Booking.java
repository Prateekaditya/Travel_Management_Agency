package com.epam.edp.demo.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "bookings")
public class Booking {

    @Id
    private String id;

    private String userId;
    private String tourId;
    private LocalDate date;
    private String duration;
    private String mealPlan;
    private Guests guests;
    private List<PersonalDetail> personalDetails;

    /** Booking lifecycle state: BOOKED, CONFIRMED, STARTED, FINISHED, CANCELLED */
    private String state;

    private LocalDate freeCancelation;

    /** ID of the travel agent assigned to this booking's tour. Set at booking creation. */
    private String travelAgentId;

    /** Who cancelled: "CUSTOMER" or "TRAVEL_AGENT" */
    private String canceledBy;

    /** Reason for cancellation (Travel Agent): CUSTOMERS_EMERGENCY, HOTEL_EMERGENCY, SAFETY_CONCERNS, INSUFFICIENT_BOOKINGS */
    private String cancelReason;

    /** Agent change request state: null | "PENDING" | "APPROVED" | "DECLINED" */
    private String changeRequestStatus;

    /** Proposed changes from Travel Agent — applied only after customer approval. */
    private PendingChanges pendingChanges;

    private List<BookingDocument> documents = new ArrayList<>();


    // ── Inner classes ──────────────────────────────────────────────────────────

    @Data
    public static class Guests {
        private int adult;
        private int children;
    }

    @Data
    public static class PersonalDetail {
        private String firstName;
        private String lastName;
    }

    @Data
    public static class BookingDocument {
        private String id;
        private String fileName;
        private String fileType;
        private String uploadedAt;
        private String s3Key;
        private Long sizeBytes;
        private String documentLabel; // e.g. "Passport John Doe", "Payment confirmation"
    }

    /**
     * Snapshot of booking details proposed by a Travel Agent via agent-edit.
     * Stored temporarily until the customer approves or declines.
     */
    @Data
    public static class PendingChanges {
        private LocalDate date;
        private String duration;
        private String mealPlan;
        private Guests guests;
        private List<PersonalDetail> personalDetails;
    }
}
