package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.CreateBookingRequestDTO;
import com.epam.edp.demo.dto.UpdateBookingRequestDTO;
import com.epam.edp.demo.dto.BookingResponseDTO;
import com.epam.edp.demo.dto.CreateBookingResponseDTO;
import org.springframework.web.multipart.MultipartFile;


import java.util.List;

public interface BookingService {
    CreateBookingResponseDTO createBooking(CreateBookingRequestDTO request);
    List<BookingResponseDTO> getBookingsForUser(String userId);
    BookingResponseDTO updateBooking(String bookingId, String userId, UpdateBookingRequestDTO request);
    void cancelBooking(String bookingId, String userId);
    String uploadDocument(String bookingId, String userId, MultipartFile file, String documentLabel);
    String replaceDocument(String bookingId, String userId, String documentId, MultipartFile file, String documentLabel);
    List<BookingResponseDTO> getBookingsForAgent(String agentId);
    String confirmBooking(String bookingId, String agentId);
    String agentCancelBooking(String bookingId, String agentId, String cancellationReason, String comment);

    /** Travel Agent proposes booking changes — stores them as PENDING until customer approves. */
    BookingResponseDTO agentEditBooking(String bookingId, String agentId, UpdateBookingRequestDTO request);

    /** Customer approves the pending changes — applies them to the booking. */
    BookingResponseDTO approveChanges(String bookingId, String userId);

    /** Customer declines the pending changes — discards them and resets changeRequestStatus. */
    BookingResponseDTO declineChanges(String bookingId, String userId);

    /**
     * Downloads document bytes from S3 for an authorized caller (agent or booking owner).
     * Returns a byte array along with the document metadata.
     */
    BookingDocumentDownload downloadDocument(String bookingId, String documentId, String callerId);

    /** Simple holder for document bytes + metadata for streaming. */
    record BookingDocumentDownload(byte[] content, String fileName, String contentType) {}
}

