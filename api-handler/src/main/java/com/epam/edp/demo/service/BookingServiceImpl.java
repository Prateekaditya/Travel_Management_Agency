package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.CreateBookingRequestDTO;
import com.epam.edp.demo.dto.UpdateBookingRequestDTO;
import com.epam.edp.demo.dto.BookingResponseDTO;
import java.util.LinkedHashMap;
import com.epam.edp.demo.dto.CreateBookingResponseDTO;
import com.epam.edp.demo.entity.Booking;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.BookingException;
import com.epam.edp.demo.exception.TourNotFoundException;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.epam.edp.demo.model.User;

import java.text.Normalizer;



@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final TourRepository tourRepository;
    public final String stateCancelled = "CANCELLED";
    private final ObjectStorageService objectStorageService;
    private final S3StorageProperties s3StorageProperties;
    private final UserRepository userRepository;
    private final BookingEventPublisherService bookingEventPublisher;


    @Override
    public CreateBookingResponseDTO createBooking(CreateBookingRequestDTO request) {
        log.debug("Creating booking for tourId={}, userId={}", request.getTourId(), request.getUserId());

        Tour tour = tourRepository.findById(request.getTourId())
                .orElseThrow(() -> new TourNotFoundException(request.getTourId()));


        //Overbooking Check: If tour has capacity > 0, count existing bookings for the same tour and date that are not cancelled. If count >= capacity, throw exception.
        if (tour.getCapacity() != null && tour.getCapacity() > 0) {
            long existingBookingsCount = bookingRepository
                    .countByTourIdAndDateAndStateNot(request.getTourId(), request.getDate(), "CANCELLED");

            if (existingBookingsCount >= tour.getCapacity()) {
                throw new BookingException(
                        "Tour is fully booked for the selected date: " + request.getDate()
                );
            }
        }

        // Build booking entity
        Booking booking = new Booking();
        booking.setUserId(request.getUserId());
        booking.setTourId(request.getTourId());
        booking.setDate(request.getDate());
        booking.setDuration(request.getDuration());
        booking.setMealPlan(request.getMealPlan());
        booking.setState("BOOKED");
        if (tour.getTravelAgentId() != null && !tour.getTravelAgentId().isBlank()) {
            booking.setTravelAgentId(tour.getTravelAgentId());
            log.debug("Auto-assigned travelAgentId={} from tourId={}", tour.getTravelAgentId(), tour.getId());
        }

        Booking.Guests guests = new Booking.Guests();
        guests.setAdult(request.getGuests().getAdult());
        guests.setChildren(request.getGuests().getChildren());
        booking.setGuests(guests);

        List<Booking.PersonalDetail> personalDetails = request.getPersonalDetails().stream()
                .map(pd -> {
                    Booking.PersonalDetail detail = new Booking.PersonalDetail();
                    detail.setFirstName(pd.getFirstName());
                    detail.setLastName(pd.getLastName());
                    return detail;
                }).collect(Collectors.toList());
        booking.setPersonalDetails(personalDetails);

        // Calculate free cancellation date
        int cancelDaysBefore = (tour.getFreeCancelationDaysBefore() != null && tour.getFreeCancelationDaysBefore() > 0)
                ? tour.getFreeCancelationDaysBefore()
                : 10;
        LocalDate freeCancelation = request.getDate().minusDays(cancelDaysBefore);
        booking.setFreeCancelation(freeCancelation);

        bookingRepository.save(booking);
        log.debug("Booking saved with id=" + booking.getId());
        bookingEventPublisher.publishBookingStateChanged(booking, "BOOKED", null);

        // Build confirmation message
        String mealPlanLabel = getMealPlanLabel(request.getMealPlan());
        String hotelOrTour = (tour.getHotelName() != null && !tour.getHotelName().isBlank())
                ? tour.getHotelName()
                : tour.getName();
        String guestSummary = request.getGuests().getAdult() + " adult"
                + (request.getGuests().getAdult() > 1 ? "s" : "")
                + (request.getGuests().getChildren() > 0 ? ", " + request.getGuests().getChildren() + " child(ren)" : "");
        String details = String.format(
                "You have booked at %s, starting date %s (%s), %s for %s successfully. " +
                        "Please upload your travel documents to the booking on the 'My Tours' page " +
                        "and wait for the Travel Agent to contact you.",
                hotelOrTour,
                request.getDate(),
                request.getDuration(),
                mealPlanLabel,
                guestSummary
        );

        return new CreateBookingResponseDTO(freeCancelation, details);
    }


    // method to return user{id} all bookings
    @Override
    public List<BookingResponseDTO> getBookingsForUser(String userId) {
        log.debug("Fetching bookings for userId=" + userId);

        List<Booking> bookings = bookingRepository.findByUserId(userId);
        if (bookings.isEmpty()) return java.util.Collections.emptyList();

        // Batch-fetch all tours in a single DB call
        Set<String> tourIds = bookings.stream()
                .map(Booking::getTourId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Tour> tourMap = new java.util.HashMap<>();
        tourRepository.findAllById(tourIds).forEach(t -> tourMap.put(t.getId(), t));

        // Batch-fetch all travel agents in a single DB call
        Set<String> agentIds = bookings.stream()
                .map(Booking::getTravelAgentId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, User> agentMap = new java.util.HashMap<>();
        if (!agentIds.isEmpty()) {
            userRepository.findAllById(agentIds).forEach(u -> agentMap.put(u.getId(), u));
        }

        return bookings.stream()
                .map(booking -> {

                    // Use pre-fetched tour
                    Tour tour = tourMap.get(booking.getTourId());

                    String tourImageUrl = null;
                    String tourName = booking.getTourId(); // fallback to id if tour not found
                    String destination = "";
                    String totalPrice = "";

                    if (tour != null) {
                        if (tour.getImageUrls() != null && !tour.getImageUrls().isEmpty()) {
                            tourImageUrl = tour.getImageUrls().get(0);
                        }
                        tourName = tour.getName();
                        destination = tour.getDestination();
                        totalPrice = resolveTotalPrice(tour, booking.getDuration(), booking.getMealPlan(),
                                booking.getGuests() != null ? booking.getGuests().getAdult() : 1);
                    }

                    // Format date: "Jul 1, 2026 (7 days)"
                    String dateStr = "";
                    if (booking.getDate() != null) {
                        dateStr = booking.getDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
                                + " (" + booking.getDuration() + ")";
                    }

                    // Format meal plan
                    String mealPlanLabel = getMealPlanLabel(booking.getMealPlan());

                    // Format guests: "John Doe (2 adults)"
                    String guestStr = "";
                    if (booking.getPersonalDetails() != null && !booking.getPersonalDetails().isEmpty()) {
                        Booking.PersonalDetail first = booking.getPersonalDetails().get(0);
                        guestStr = first.getFirstName() + " " + first.getLastName();
                    }
                    if (booking.getGuests() != null) {
                        int adults = booking.getGuests().getAdult();
                        int children = booking.getGuests().getChildren();
                        guestStr += " (" + adults + " adult" + (adults > 1 ? "s" : "")
                                + (children > 0 ? ", " + children + " child(ren)" : "") + ")";
                    }

                    // Documents count — no S3 calls for list view
                    List<BookingResponseDTO.DocumentDTO> mappedDocuments = deduplicateAndMapDocuments(booking.getDocuments(), false);
                    int docCount = mappedDocuments.size();

                    BookingResponseDTO.TourDetails tourDetails = new BookingResponseDTO.TourDetails(
                            dateStr, mealPlanLabel, guestStr, totalPrice, docCount + " items"
                    );

                    // Use pre-fetched travel agent
                    BookingResponseDTO.TravelAgent travelAgent = new BookingResponseDTO.TravelAgent(
                            null, null, null, null
                    );
                    if (booking.getTravelAgentId() != null) {
                        User agent = agentMap.get(booking.getTravelAgentId());
                        if (agent != null) {
                            String agentName = ((agent.getFirstName() != null ? agent.getFirstName() : "") + " "
                                    + (agent.getLastName() != null ? agent.getLastName() : "")).trim();
                            travelAgent = new BookingResponseDTO.TravelAgent(
                                    agentName.isEmpty() ? null : agentName,
                                    agent.getEmail(),
                                    null,
                                    null
                            );
                        }
                    }

                    List<BookingResponseDTO.PersonalDetailDTO> personalDetailDTOs = null;
                    if (booking.getPersonalDetails() != null) {
                        personalDetailDTOs = booking.getPersonalDetails().stream()
                                .map(pd -> new BookingResponseDTO.PersonalDetailDTO(pd.getFirstName(), pd.getLastName()))
                                .collect(Collectors.toList());
                    }

                    BookingResponseDTO dto = new BookingResponseDTO();
                    dto.setId(booking.getId());
                    dto.setTourId(booking.getTourId());
                    dto.setState(booking.getState());
                    dto.setTourImageUrl(tourImageUrl);
                    dto.setName(tourName);
                    dto.setDestination(destination);
                    dto.setTourDetails(tourDetails);
                    dto.setTravelAgent(travelAgent);
                    dto.setCanceledBy(booking.getCanceledBy());
                    dto.setCancelReason(booking.getCancelReason());
                    dto.setFreeCancelation(booking.getFreeCancelation() != null ? booking.getFreeCancelation().toString() : null);
                    dto.setPersonalDetails(personalDetailDTOs);
                    dto.setDocuments(mappedDocuments);
                    dto.setChangeRequestStatus(booking.getChangeRequestStatus());
                    dto.setPendingChanges(buildPendingChangesDTO(booking));
                    dto.setCustomerDetails(null);
                    return dto;
                })
                .collect(Collectors.toList());

    }


    @Override
    public List<BookingResponseDTO> getBookingsForAgent(String agentId) {
        log.debug("Fetching bookings for agentId={}", agentId);

        return bookingRepository.findByTravelAgentId(agentId).stream()
                .map(booking -> {
                    Tour tour = tourRepository.findById(booking.getTourId()).orElse(null);

                    String tourImageUrl = null;
                    String tourName = booking.getTourId();
                    String destination = "";
                    String totalPrice = "";

                    if (tour != null) {
                        if (tour.getImageUrls() != null && !tour.getImageUrls().isEmpty()) {
                            tourImageUrl = tour.getImageUrls().get(0);
                        }
                        tourName = tour.getName();
                        destination = tour.getDestination();
                        totalPrice = resolveTotalPrice(tour, booking.getDuration(), booking.getMealPlan(),
                                booking.getGuests() != null ? booking.getGuests().getAdult() : 1);
                    }

                    String dateStr = "";
                    if (booking.getDate() != null) {
                        dateStr = booking.getDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
                                + " (" + booking.getDuration() + ")";
                    }

                    String mealPlanLabel = getMealPlanLabel(booking.getMealPlan());

                    String guestStr = "";
                    if (booking.getPersonalDetails() != null && !booking.getPersonalDetails().isEmpty()) {
                        Booking.PersonalDetail first = booking.getPersonalDetails().get(0);
                        guestStr = first.getFirstName() + " " + first.getLastName();
                    }
                    if (booking.getGuests() != null) {
                        int adults = booking.getGuests().getAdult();
                        int children = booking.getGuests().getChildren();
                        guestStr += " (" + adults + " adult" + (adults > 1 ? "s" : "")
                                + (children > 0 ? ", " + children + " child(ren)" : "") + ")";
                    }

                    int docCount = deduplicateAndMapDocuments(booking.getDocuments()).size();

                    BookingResponseDTO.TourDetails tourDetails = new BookingResponseDTO.TourDetails(
                            dateStr, mealPlanLabel, guestStr, totalPrice, docCount + " items"
                    );

                    List<BookingResponseDTO.PersonalDetailDTO> personalDetailDTOs = null;
                    if (booking.getPersonalDetails() != null) {
                        personalDetailDTOs = booking.getPersonalDetails().stream()
                                .map(pd -> new BookingResponseDTO.PersonalDetailDTO(pd.getFirstName(), pd.getLastName()))
                                .collect(Collectors.toList());
                    }

                    BookingResponseDTO dto = new BookingResponseDTO();
                    dto.setId(booking.getId());
                    dto.setTourId(booking.getTourId());
                    dto.setState(booking.getState());
                    dto.setTourImageUrl(tourImageUrl);
                    dto.setName(tourName);
                    dto.setDestination(destination);
                    dto.setTourDetails(tourDetails);
                    dto.setTravelAgent(new BookingResponseDTO.TravelAgent(null, null, null, null));
                    dto.setCanceledBy(booking.getCanceledBy());
                    dto.setCancelReason(booking.getCancelReason());
                    dto.setFreeCancelation(booking.getFreeCancelation() != null ? booking.getFreeCancelation().toString() : null);
                    dto.setPersonalDetails(personalDetailDTOs);
                    dto.setDocuments(deduplicateAndMapDocuments(booking.getDocuments()));
                    dto.setChangeRequestStatus(booking.getChangeRequestStatus());
                    dto.setPendingChanges(buildPendingChangesDTO(booking));
                    dto.setCustomerDetails(buildCustomerDetails(booking)); // ← populated for agent
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Converts a booking's PendingChanges entity into a DTO with display-friendly strings
     * (same format as TourDetails) so the frontend can compare them directly.
     * Returns null when there are no pending changes.
     */
    private BookingResponseDTO.PendingChangesDTO buildPendingChangesDTO(Booking booking) {
        Booking.PendingChanges pc = booking.getPendingChanges();
        if (pc == null) return null;

        String dateStr = pc.getDate() != null
                ? pc.getDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
                : "";
        String mealPlanLabel = getMealPlanLabel(pc.getMealPlan());

        BookingResponseDTO.GuestsDTO guestsDTO = null;
        if (pc.getGuests() != null) {
            guestsDTO = new BookingResponseDTO.GuestsDTO(
                    pc.getGuests().getAdult(),
                    pc.getGuests().getChildren()
            );
        }

        return new BookingResponseDTO.PendingChangesDTO(
                dateStr,
                pc.getDuration(),
                mealPlanLabel,
                guestsDTO
        );
    }

    /**
     * Builds CustomerDetails — looks up customer from UserRepository,
     * maps documents to payments/guestDocuments with S3 URLs.
     */
    private BookingResponseDTO.CustomerDetails buildCustomerDetails(Booking booking) {
        String customerName = "";
        String customerEmail = "";

        if (booking.getUserId() != null) {
            var userOpt = userRepository.findById(booking.getUserId());
            if (userOpt.isPresent()) {
                var user = userOpt.get();
                String firstName = user.getFirstName() != null ? user.getFirstName() : "";
                String lastName = user.getLastName() != null ? user.getLastName() : "";
                int adults = booking.getGuests() != null ? booking.getGuests().getAdult() : 1;
                int children = booking.getGuests() != null ? booking.getGuests().getChildren() : 0;
                String guestLabel = " (" + adults + " adult" + (adults > 1 ? "s" : "")
                        + (children > 0 ? ", " + children + " child(ren)" : "") + ")";
                customerName = (firstName + " " + lastName).trim() + guestLabel;
                customerEmail = user.getEmail() != null ? user.getEmail() : "";
            }
        }

        List<BookingResponseDTO.PaymentDocument> payments = new java.util.ArrayList<>();
        List<BookingResponseDTO.GuestDocumentGroup> guestDocuments = new java.util.ArrayList<>();

        List<Booking.BookingDocument> docs = booking.getDocuments();
        if (docs != null && !docs.isEmpty()) {
            // Deduplicate by label — last wins
            LinkedHashMap<String, Booking.BookingDocument> deduped = new LinkedHashMap<>();
            for (Booking.BookingDocument d : docs) {
                String key = d.getDocumentLabel() != null ? d.getDocumentLabel() : d.getId();
                deduped.put(key, d);
            }

            Map<String, List<Booking.BookingDocument>> guestGroups = new LinkedHashMap<>();

            for (Booking.BookingDocument doc : deduped.values()) {
                String label = doc.getDocumentLabel() != null ? doc.getDocumentLabel() : "";

                if (label.toLowerCase().contains("payment")) {
                    payments.add(new BookingResponseDTO.PaymentDocument(doc.getId(), doc.getFileName(),
                            objectStorageService.generatePresignedUrl(doc.getS3Key(), Duration.ofHours(1))));
                } else {
                    // Extract guest name from label e.g. "Passport John Doe" → "John Doe"
                    String guestName = label.replaceFirst("(?i)^(passport|visa|id card|id|license)\\s*", "").trim();
                    if (guestName.isBlank()) guestName = "Guest";
                    guestGroups.computeIfAbsent(guestName, k -> new java.util.ArrayList<>()).add(doc);
                }
            }

            for (Map.Entry<String, List<Booking.BookingDocument>> entry : guestGroups.entrySet()) {
                List<BookingResponseDTO.GuestDocument> guestDocs = entry.getValue().stream()
                        .map(doc -> new BookingResponseDTO.GuestDocument(
                                doc.getId(), doc.getFileName(),
                                objectStorageService.generatePresignedUrl(doc.getS3Key(), Duration.ofHours(1))))
                        .collect(Collectors.toList());
                guestDocuments.add(new BookingResponseDTO.GuestDocumentGroup(entry.getKey(), guestDocs));
            }
        }

        return new BookingResponseDTO.CustomerDetails(
                customerName, customerEmail, null,
                new BookingResponseDTO.CustomerDocuments(payments, guestDocuments)
        );
    }


    @Override
    public BookingResponseDTO updateBooking(String bookingId, String userId, UpdateBookingRequestDTO request) {
        log.debug("Updating bookingId={} for userId={}", bookingId, userId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to update this booking");
        }

        if (stateCancelled.equals(booking.getState())) {
            throw new BookingException("Cannot edit a cancelled booking");
        }

        // Apply updates
        booking.setDate(request.getDate());
        booking.setDuration(request.getDuration());
        booking.setMealPlan(request.getMealPlan());

        Booking.Guests guests = new Booking.Guests();
        guests.setAdult(request.getGuests().getAdult());
        guests.setChildren(request.getGuests().getChildren());
        booking.setGuests(guests);

        List<Booking.PersonalDetail> personalDetails = request.getPersonalDetails().stream()
                .map(pd -> {
                    Booking.PersonalDetail detail = new Booking.PersonalDetail();
                    detail.setFirstName(pd.getFirstName());
                    detail.setLastName(pd.getLastName());
                    return detail;
                }).collect(Collectors.toList());
        booking.setPersonalDetails(personalDetails);

        // Recalculate free cancellation date
        Tour tour = tourRepository.findById(booking.getTourId()).orElse(null);
        int cancelDaysBefore = (tour != null && tour.getFreeCancelationDaysBefore() != null && tour.getFreeCancelationDaysBefore() > 0)
                ? tour.getFreeCancelationDaysBefore() : 10;
        booking.setFreeCancelation(request.getDate().minusDays(cancelDaysBefore));

        bookingRepository.save(booking);

        // Build updated response
        String tourImageUrl = null;
        String tourName = booking.getTourId();
        String destination = "";
        String totalPrice = "";
        int updatedAdults = booking.getGuests() != null ? booking.getGuests().getAdult() : 1;
        if (tour != null) {
            if (tour.getImageUrls() != null && !tour.getImageUrls().isEmpty())
                tourImageUrl = tour.getImageUrls().get(0);
            tourName = tour.getName();
            destination = tour.getDestination();
            totalPrice = resolveTotalPrice(tour, booking.getDuration(), booking.getMealPlan(), updatedAdults);
        }
        String dateStr = booking.getDate().format(DateTimeFormatter.ofPattern("MMM d, yyyy")) + " (" + booking.getDuration() + ")";
        String guestStr = "";
        if (booking.getPersonalDetails() != null && !booking.getPersonalDetails().isEmpty()) {
            Booking.PersonalDetail first = booking.getPersonalDetails().get(0);
            guestStr = first.getFirstName() + " " + first.getLastName();
        }
        if (booking.getGuests() != null) {
            int adults = booking.getGuests().getAdult();
            guestStr += " (" + adults + " adult" + (adults > 1 ? "s" : "") + ")";
        }
        BookingResponseDTO.TourDetails tourDetails = new BookingResponseDTO.TourDetails(
                dateStr, getMealPlanLabel(booking.getMealPlan()), guestStr, totalPrice,
                (booking.getDocuments() == null ? 0 : booking.getDocuments().size()) + " items"
        );
        List<BookingResponseDTO.PersonalDetailDTO> updatedPersonalDetailDTOs = null;
        if (booking.getPersonalDetails() != null) {
            updatedPersonalDetailDTOs = booking.getPersonalDetails().stream()
                    .map(pd -> new BookingResponseDTO.PersonalDetailDTO(pd.getFirstName(), pd.getLastName()))
                    .collect(Collectors.toList());
        }

        BookingResponseDTO dto = new BookingResponseDTO();
        dto.setId(booking.getId());
        dto.setTourId(booking.getTourId());
        dto.setState(booking.getState());
        dto.setTourImageUrl(tourImageUrl);
        dto.setName(tourName);
        dto.setDestination(destination);
        dto.setTourDetails(tourDetails);
        dto.setTravelAgent(new BookingResponseDTO.TravelAgent(null, null, null, null));
        dto.setCanceledBy(booking.getCanceledBy());
        dto.setCancelReason(booking.getCancelReason());
        dto.setFreeCancelation(booking.getFreeCancelation() != null ? booking.getFreeCancelation().toString() : null);
        dto.setPersonalDetails(updatedPersonalDetailDTOs);
        dto.setDocuments(deduplicateAndMapDocuments(booking.getDocuments()));
        dto.setChangeRequestStatus(booking.getChangeRequestStatus());
        dto.setCustomerDetails(null); // null for customer view; populated in Phase 2 for agent view
        return dto;
    }

    @Override
    public void cancelBooking(String bookingId, String userId) {
        log.debug("Cancelling bookingId={} for userId={}", bookingId, userId);

        // Find booking by id
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        // Security check — booking must belong to this user
        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to cancel this booking");
        }

        // Check not already cancelled
        if (stateCancelled.equals(booking.getState())) {
            throw new BookingException("Booking is already cancelled");
        }


        // 10-day cancellation policy check: If current date is after free cancellation date, cancellation is not allowed
        LocalDate today = LocalDate.now();
        if (today.isAfter(booking.getFreeCancelation())) {
            throw new BookingException(
                    "Free cancellation period has expired. Cancellation is not allowed within " +
                            "10 days of the tour start date: " + booking.getDate()
            );
        }

        // Cancel it
        String previousStateCancel = booking.getState();
        booking.setState(stateCancelled);
        booking.setCanceledBy("Customer");
        bookingRepository.save(booking);
        bookingEventPublisher.publishBookingStateChanged(booking, stateCancelled, previousStateCancel);
        log.debug("Booking {} cancelled successfully", bookingId);
    }


    /**
     * Resolve total price from a tour's price map.
     * Tries: duration key → meal plan code key → first available value.
     * Strips any existing "$" from the stored value before formatting,
     * then multiplies by the number of adults.
     */
    private String resolveTotalPrice(Tour tour, String duration, String mealPlanCode, int adults) {
        if (tour == null || tour.getPrice() == null || tour.getPrice().isEmpty()) return "";
        Map<String, String> p = tour.getPrice();
        String raw = null;
        if (p.get(duration) != null) raw = p.get(duration);
        else if (p.get(mealPlanCode) != null) raw = p.get(mealPlanCode);
        else raw = p.values().stream().filter(v -> v != null && !v.isBlank()).findFirst().orElse(null);
        if (raw == null) return "";
        // Strip any existing "$" or whitespace, parse as number
        String numeric = raw.trim().replace("$", "").replace(",", "").trim();
        try {
            long perPerson = (long) Double.parseDouble(numeric);
            long total = perPerson * Math.max(1, adults);
            return "$" + total;
        } catch (NumberFormatException e) {
            return "$" + numeric; // fallback: return as-is
        }
    }

    private String getMealPlanLabel(String mealPlan) {
        return switch (mealPlan) {
            case "BB" -> "Breakfast (BB)";
            case "HB" -> "Half-board (HB)";
            case "FB" -> "Full-board (FB)";
            case "AI" -> "All inclusive (AI)";
            default -> mealPlan;
        };
    }


    @Override
    public String uploadDocument(String bookingId, String userId, MultipartFile file, String documentLabel) {
        log.debug("Uploading document for bookingId={}, userId={}, label={}", bookingId, userId, documentLabel);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to upload documents to this booking");
        }

        if ("CANCELLED".equals(booking.getState()) || "FINISHED".equals(booking.getState())) {
            throw new BookingException("Cannot upload documents to a " + booking.getState() + " booking");
        }

        try {
            String documentId = UUID.randomUUID().toString();
            String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
            String safeFileName = sanitizeFileName(originalFileName);

            String key = String.format(
                    "%s/%s/documents/%s/%s",
                    trimSlashes(s3StorageProperties.getPrefix()),
                    bookingId,
                    documentId,
                    safeFileName
            );

            objectStorageService.upload(file.getBytes(), key, file.getContentType());

            Booking.BookingDocument doc = new Booking.BookingDocument();
            doc.setId(documentId);
            doc.setFileName(originalFileName);
            doc.setFileType(file.getContentType());
            doc.setUploadedAt(LocalDate.now().toString());
            doc.setS3Key(key);
            doc.setSizeBytes(file.getSize());
            doc.setDocumentLabel(documentLabel);

            if (booking.getDocuments() == null) {
                booking.setDocuments(new java.util.ArrayList<>());
            }
            // If same label already exists, replace that entry AND delete old S3 file
            boolean replaced = false;
            if (documentLabel != null) {
                for (int i = 0; i < booking.getDocuments().size(); i++) {
                    if (documentLabel.equals(booking.getDocuments().get(i).getDocumentLabel())) {
                        String oldS3Key = booking.getDocuments().get(i).getS3Key();
                        booking.getDocuments().set(i, doc);
                        replaced = true;
                        // Delete old S3 file if it differs from the new key
                        if (oldS3Key != null && !oldS3Key.equals(key)) {
                            try {
                                objectStorageService.delete(oldS3Key);
                                log.debug("Deleted old S3 object on label-replace: {}", oldS3Key);
                            } catch (Exception deleteEx) {
                                log.warn("Failed to delete old S3 object {}: {}", oldS3Key, deleteEx.getMessage());
                            }
                        }
                        break;
                    }
                }
            }
            if (!replaced) {
                booking.getDocuments().add(doc);
            }
            bookingRepository.save(booking);

            log.debug("Document uploaded successfully with id={}, key={}", doc.getId(), key);
            return doc.getId();

        } catch (Exception e) {
            log.error("Failed to upload document for bookingId={}: {}", bookingId, e.getMessage());
            String msg = e.getMessage();
            if (msg != null && (msg.contains("token has expired") || msg.contains("ExpiredToken") || msg.contains("Status Code: 400"))) {
                throw new BookingException("Document upload is temporarily unavailable. Please try again later.");
            }
            if (msg != null && (msg.contains("Status Code: 403") || msg.contains("not authorized") || msg.contains("Access Denied"))) {
                throw new BookingException("Document upload is not possible right now. Please try again later.");
            }
            throw new BookingException("Document upload failed. Please try again later.");
        }
    }

    @Override
    public String replaceDocument(String bookingId, String userId, String documentId, MultipartFile file, String documentLabel) {
        log.debug("Replacing document id={} for bookingId={}, userId={}", documentId, bookingId, userId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to update documents for this booking");
        }

        if ("CANCELLED".equals(booking.getState()) || "FINISHED".equals(booking.getState())) {
            throw new BookingException("Cannot update documents on a " + booking.getState() + " booking");
        }

        List<Booking.BookingDocument> docs = booking.getDocuments();
        if (docs == null || docs.stream().noneMatch(d -> d.getId().equals(documentId))) {
            throw new BookingException("Document not found: " + documentId);
        }

        try {
            // Get the old S3 key BEFORE overwriting — so we can delete it after success
            String oldS3Key = docs.stream()
                    .filter(d -> d.getId().equals(documentId))
                    .findFirst()
                    .map(Booking.BookingDocument::getS3Key)
                    .orElse(null);

            String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
            String safeFileName = sanitizeFileName(originalFileName);

            String key = String.format(
                    "%s/%s/documents/%s/%s",
                    trimSlashes(s3StorageProperties.getPrefix()),
                    bookingId,
                    documentId,
                    safeFileName
            );

            // Upload new file first
            objectStorageService.upload(file.getBytes(), key, file.getContentType());

            // Delete old S3 file if it was a different key (different file name)
            if (oldS3Key != null && !oldS3Key.equals(key)) {
                try {
                    objectStorageService.delete(oldS3Key);
                    log.debug("Deleted old S3 object: {}", oldS3Key);
                } catch (Exception deleteEx) {
                    // Don't fail the whole operation if delete fails — log and continue
                    log.warn("Failed to delete old S3 object {}: {}", oldS3Key, deleteEx.getMessage());
                }
            }

            Booking.BookingDocument newDoc = new Booking.BookingDocument();
            newDoc.setId(documentId);
            newDoc.setFileName(originalFileName);
            newDoc.setFileType(file.getContentType());
            newDoc.setUploadedAt(LocalDate.now().toString());
            newDoc.setS3Key(key);
            newDoc.setSizeBytes(file.getSize());
            newDoc.setDocumentLabel(documentLabel);

            docs.replaceAll(d -> d.getId().equals(documentId) ? newDoc : d);
            booking.setDocuments(docs);
            bookingRepository.save(booking);

            log.debug("Document replaced successfully id={}, key={}", documentId, key);
            return documentId;

        } catch (Exception e) {
            log.error("Failed to replace document id={} for bookingId={}: {}", documentId, bookingId, e.getMessage());
            String msg = e.getMessage();
            if (msg != null && (msg.contains("token has expired") || msg.contains("ExpiredToken") || msg.contains("Status Code: 400"))) {
                throw new BookingException("Document upload is temporarily unavailable. Please try again later.");
            }
            if (msg != null && (msg.contains("Status Code: 403") || msg.contains("not authorized") || msg.contains("Access Denied"))) {
                throw new BookingException("Document upload is not possible right now. Please try again later.");
            }
            throw new BookingException("Document upload failed. Please try again later.");
        }
    }

    private String sanitizeFileName(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKC);
        String withoutPath = normalized.replace("\\", "/");
        withoutPath = withoutPath.substring(withoutPath.lastIndexOf('/') + 1);
        String safe = withoutPath.replaceAll("[^a-zA-Z0-9._-]", "_");
        return safe.isBlank() ? "document" : safe;
    }

    private String trimSlashes(String value) {
        if (value == null || value.isBlank()) return "bookings";
        String out = value;
        while (out.startsWith("/")) out = out.substring(1);
        while (out.endsWith("/")) out = out.substring(0, out.length() - 1);
        return out.isBlank() ? "bookings" : out;
    }

    /**
     * Maps booking documents to DTOs, deduplicating by documentLabel.
     * When the same label appears more than once (e.g., user replaced a doc),
     * only the LAST entry is kept (most recent upload wins).
     * @param generateUrls if false, skips S3 presigned URL generation (use for list views)
     */
    private List<BookingResponseDTO.DocumentDTO> deduplicateAndMapDocuments(List<Booking.BookingDocument> docs, boolean generateUrls) {
        if (docs == null || docs.isEmpty()) return new java.util.ArrayList<>();

        // Use LinkedHashMap to preserve order; last write for same label wins
        LinkedHashMap<String, BookingResponseDTO.DocumentDTO> byLabel = new LinkedHashMap<>();
        for (Booking.BookingDocument d : docs) {
            String key = d.getDocumentLabel() != null ? d.getDocumentLabel() : d.getId();
            String fileUrl = null;
            if (generateUrls && d.getS3Key() != null) {
                try {
                    fileUrl = objectStorageService.generatePresignedUrl(d.getS3Key(), Duration.ofHours(1));
                } catch (Exception e) {
                    log.warn("Could not generate presigned URL for s3Key={}: {}", d.getS3Key(), e.getMessage());
                }
            }
            BookingResponseDTO.DocumentDTO dto = new BookingResponseDTO.DocumentDTO(
                    d.getId(), d.getFileName(), d.getFileType(),
                    d.getUploadedAt(), d.getS3Key(), d.getSizeBytes(), d.getDocumentLabel(), fileUrl
            );
            byLabel.put(key, dto); // overwrite duplicate labels — last one wins
        }
        return new java.util.ArrayList<>(byLabel.values());
    }

    /** Overload that generates presigned URLs (default behaviour for detail views). */
    private List<BookingResponseDTO.DocumentDTO> deduplicateAndMapDocuments(List<Booking.BookingDocument> docs) {
        return deduplicateAndMapDocuments(docs, true);
    }


    // Add inside BookingServiceImpl class
    @Override
    public BookingResponseDTO agentEditBooking(String bookingId, String agentId, UpdateBookingRequestDTO request) {
        log.debug("Agent {} proposing changes to bookingId={}", agentId, bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (booking.getTravelAgentId() == null || !booking.getTravelAgentId().equals(agentId)) {
            throw new UnauthorizedException("You are not authorized to edit this booking.");
        }

        if (stateCancelled.equals(booking.getState()) || "FINISHED".equals(booking.getState())) {
            throw new BookingException("Cannot edit a " + booking.getState() + " booking");
        }

        // Store proposed changes as PENDING — do NOT apply them yet
        Booking.PendingChanges pending = new Booking.PendingChanges();
        pending.setDate(request.getDate());
        pending.setDuration(request.getDuration());
        pending.setMealPlan(request.getMealPlan());

        Booking.Guests guests = new Booking.Guests();
        guests.setAdult(request.getGuests().getAdult());
        guests.setChildren(request.getGuests().getChildren());
        pending.setGuests(guests);

        if (request.getPersonalDetails() != null) {
            List<Booking.PersonalDetail> pds = request.getPersonalDetails().stream()
                    .map(pd -> { Booking.PersonalDetail d = new Booking.PersonalDetail(); d.setFirstName(pd.getFirstName()); d.setLastName(pd.getLastName()); return d; })
                    .collect(Collectors.toList());
            pending.setPersonalDetails(pds);
        }

        booking.setPendingChanges(pending);
        booking.setChangeRequestStatus("PENDING");
        bookingRepository.save(booking);

        log.debug("Pending changes saved for bookingId={}", bookingId);
        return buildBasicResponseDTO(booking);
    }

    @Override
    public BookingResponseDTO approveChanges(String bookingId, String userId) {
        log.debug("Customer {} approving changes for bookingId={}", userId, bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to approve changes for this booking.");
        }

        if (!"PENDING".equals(booking.getChangeRequestStatus()) || booking.getPendingChanges() == null) {
            throw new BookingException("No pending changes to approve.");
        }

        // Apply the pending changes
        Booking.PendingChanges pending = booking.getPendingChanges();
        booking.setDate(pending.getDate());
        booking.setDuration(pending.getDuration());
        booking.setMealPlan(pending.getMealPlan());
        booking.setGuests(pending.getGuests());
        if (pending.getPersonalDetails() != null) {
            booking.setPersonalDetails(pending.getPersonalDetails());
        }
        booking.setPendingChanges(null);
        booking.setChangeRequestStatus("APPROVED");
        bookingRepository.save(booking);

        log.debug("Changes approved and applied for bookingId={}", bookingId);
        return buildBasicResponseDTO(booking);
    }

    @Override
    public BookingResponseDTO declineChanges(String bookingId, String userId) {
        log.debug("Customer {} declining changes for bookingId={}", userId, bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to decline changes for this booking.");
        }

        // Discard pending changes and reset status so agent can edit again
        booking.setPendingChanges(null);
        booking.setChangeRequestStatus(null);
        bookingRepository.save(booking);

        log.debug("Changes declined and discarded for bookingId={}", bookingId);
        return buildBasicResponseDTO(booking);
    }

    /** Builds a minimal BookingResponseDTO from a booking entity (no tour lookup). */
    private BookingResponseDTO buildBasicResponseDTO(Booking booking) {
        BookingResponseDTO dto = new BookingResponseDTO();
        dto.setId(booking.getId());
        dto.setTourId(booking.getTourId());
        dto.setState(booking.getState());
        dto.setCanceledBy(booking.getCanceledBy());
        dto.setCancelReason(booking.getCancelReason());
        dto.setFreeCancelation(booking.getFreeCancelation() != null ? booking.getFreeCancelation().toString() : null);
        dto.setChangeRequestStatus(booking.getChangeRequestStatus());
        if (booking.getPersonalDetails() != null) {
            dto.setPersonalDetails(booking.getPersonalDetails().stream()
                    .map(pd -> new BookingResponseDTO.PersonalDetailDTO(pd.getFirstName(), pd.getLastName()))
                    .collect(Collectors.toList()));
        }
        dto.setDocuments(deduplicateAndMapDocuments(booking.getDocuments()));
        return dto;
    }

    @Override
    public String confirmBooking(String bookingId, String agentId) {
        log.debug("Confirming bookingId={} by agentId={}", bookingId, agentId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        // Only the assigned travel agent may confirm
        if (booking.getTravelAgentId() == null || !booking.getTravelAgentId().equals(agentId)) {
            throw new UnauthorizedException("You are not authorized to confirm this booking.");
        }

        // Only allowed when state is BOOKED
        if (!"BOOKED".equals(booking.getState())) {
            throw new BookingException(
                    "Booking cannot be confirmed. Current state is: " + booking.getState()
            );
        }

        booking.setState("CONFIRMED");
        bookingRepository.save(booking);
        bookingEventPublisher.publishBookingStateChanged(booking, "CONFIRMED", "BOOKED");
        log.debug("Booking {} confirmed successfully by agent {}", bookingId, agentId);

        return "Booking confirmed successfully.";
    }


    @Override
    public String agentCancelBooking(String bookingId, String agentId,
                                     String cancellationReason, String comment) {
        log.debug("Agent cancelling bookingId={} by agentId={}, reason={}", bookingId, agentId, cancellationReason);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        // Authorization: only the assigned travel agent may cancel
        if (booking.getTravelAgentId() == null || !booking.getTravelAgentId().equals(agentId)) {
            throw new UnauthorizedException("You are not authorized to cancel this booking.");
        }

        // State check: can only cancel BOOKED or CONFIRMED bookings
        String currentState = booking.getState();
        if (!"BOOKED".equals(currentState) && !"CONFIRMED".equals(currentState)) {
            throw new BookingException(
                    "Booking cannot be cancelled. Current state is: " + currentState
            );
        }


        booking.setState(stateCancelled);
        booking.setCanceledBy("Travel Agent");
        booking.setCancelReason(cancellationReason);
        bookingRepository.save(booking);
        bookingEventPublisher.publishBookingStateChanged(booking, stateCancelled, currentState);

        log.debug("Booking {} cancelled by agent {} with reason {}", bookingId, agentId, cancellationReason);
        return "Booking cancelled successfully.";
    }

    @Override
    public BookingService.BookingDocumentDownload downloadDocument(String bookingId, String documentId, String callerId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingException("Booking not found: " + bookingId));

        // Caller must be either the booking owner or the assigned travel agent
        boolean isOwner  = callerId.equals(booking.getUserId());
        boolean isAgent  = callerId.equals(booking.getTravelAgentId());
        if (!isOwner && !isAgent) {
            throw new UnauthorizedException("You are not authorized to download documents for this booking.");
        }

        Booking.BookingDocument doc = (booking.getDocuments() == null ? List.<Booking.BookingDocument>of() : booking.getDocuments())
                .stream()
                .filter(d -> d.getId().equals(documentId))
                .findFirst()
                .orElseThrow(() -> new BookingException("Document not found: " + documentId));

        byte[] content = objectStorageService.downloadBytes(doc.getS3Key());
        String contentType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
        return new BookingService.BookingDocumentDownload(content, doc.getFileName(), contentType);
    }


}







