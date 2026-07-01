package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.CreateBookingRequestDTO;
import com.epam.edp.demo.dto.BookingResponseDTO;
import com.epam.edp.demo.dto.CreateBookingResponseDTO;
import com.epam.edp.demo.dto.UpdateBookingRequestDTO;
import com.epam.edp.demo.exception.BookingException;
import com.epam.edp.demo.exception.GlobalExceptionHandler;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.exception.TourNotFoundException;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.security.JwtUtil;
import com.epam.edp.demo.service.BookingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class BookingControllerTest {

    private MockMvc mockMvc;

    @Mock
    private BookingService bookingService;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private BookingController bookingController;

    private ObjectMapper objectMapper;
    private static final String VALID_TOKEN = "valid-token";
    private static final String BEARER_TOKEN = "Bearer " + VALID_TOKEN;
    private static final String USER_ID = "user-1";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(bookingController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // ===== POST /bookings =====

    @Test
    void createBooking_success_returns201() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        CreateBookingResponseDTO resp = new CreateBookingResponseDTO(
                LocalDate.now().plusDays(20), "You have booked at Grand Hotel successfully.");
        when(bookingService.createBooking(any())).thenReturn(resp);

        CreateBookingRequestDTO request = buildValidRequest();

        mockMvc.perform(post("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.details").value(containsString("Grand Hotel")));
    }

    @Test
    void createBooking_missingAuthHeader_returns401() throws Exception {
        CreateBookingRequestDTO request = buildValidRequest();

        mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createBooking_invalidToken_returns401() throws Exception {
        when(jwtUtil.isValid("bad-token")).thenReturn(false);

        CreateBookingRequestDTO request = buildValidRequest();

        mockMvc.perform(post("/bookings")
                        .header("Authorization", "Bearer bad-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createBooking_tourNotFound_returns404() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.createBooking(any())).thenThrow(new TourNotFoundException("tour-1"));

        CreateBookingRequestDTO request = buildValidRequest();

        mockMvc.perform(post("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createBooking_overbooking_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.createBooking(any())).thenThrow(new BookingException("Tour is fully booked"));

        CreateBookingRequestDTO request = buildValidRequest();

        mockMvc.perform(post("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value(containsString("fully booked")));
    }

    // ===== GET /bookings =====

    @Test
    void getBookings_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        BookingResponseDTO.TourDetails tourDetails = new BookingResponseDTO.TourDetails(
                "Jan 17, 2025 (7 nights)", "Breakfast (BB)", "John Doe (2 adults)", "$1400", "0 items"
        );
        BookingResponseDTO.TravelAgent travelAgent = new BookingResponseDTO.TravelAgent(null, null, null, null);
        BookingResponseDTO booking = new BookingResponseDTO();
        booking.setId("booking-1");
        booking.setState("BOOKED");
        booking.setName("Grand Tour");
        booking.setDestination("Paris");
        booking.setTourDetails(tourDetails);
        booking.setTravelAgent(travelAgent);
        when(bookingService.getBookingsForUser(USER_ID)).thenReturn(List.of(booking));

        mockMvc.perform(get("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .param("userId", USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookings", hasSize(1)))
                .andExpect(jsonPath("$.bookings[0].id").value("booking-1"))
                .andExpect(jsonPath("$.bookings[0].state").value("BOOKED"));
    }

    @Test
    void getBookings_missingAuthHeader_returns401() throws Exception {
        mockMvc.perform(get("/bookings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getBookings_emptyList_returns200WithEmptyArray() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.getBookingsForUser(USER_ID)).thenReturn(List.of());

        mockMvc.perform(get("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .param("userId", USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookings", hasSize(0)));
    }

    // ===== DELETE /bookings/{bookingId} =====

    @Test
    void cancelBooking_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        doNothing().when(bookingService).cancelBooking("booking-1", USER_ID);

        mockMvc.perform(delete("/bookings/booking-1")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Booking cancelled successfully"));
    }

    @Test
    void cancelBooking_notOwner_returns401() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        doThrow(new UnauthorizedException("Not authorized")).when(bookingService).cancelBooking("booking-1", USER_ID);

        mockMvc.perform(delete("/bookings/booking-1")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cancelBooking_alreadyCancelled_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        doThrow(new BookingException("Booking is already cancelled"))
                .when(bookingService).cancelBooking("booking-1", USER_ID);

        mockMvc.perform(delete("/bookings/booking-1")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value(containsString("already cancelled")));
    }

    @Test
    void cancelBooking_missingAuthHeader_returns401() throws Exception {
        mockMvc.perform(delete("/bookings/booking-1"))
                .andExpect(status().isUnauthorized());
    }

    // ===== POST /bookings/{bookingId}/documents =====

    @Test
    void uploadDocument_success_returns201() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.uploadDocument(eq("booking-1"), eq(USER_ID), any(), any())).thenReturn("doc-123");

        MockMultipartFile file = new MockMultipartFile("file", "passport.pdf",
                "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/bookings/booking-1/documents")
                        .file(file)
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Document uploaded successfully"))
                .andExpect(jsonPath("$.documentId").value("doc-123"));
    }

    @Test
    void uploadDocument_cancelledBooking_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.uploadDocument(eq("booking-1"), eq(USER_ID), any(), any()))
                .thenThrow(new BookingException("Cannot upload documents to a CANCELLED booking"));

        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);

        mockMvc.perform(multipart("/bookings/booking-1/documents")
                        .file(file)
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value(containsString("CANCELLED")));
    }

    @Test
    void uploadDocument_missingAuthHeader_returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);

        mockMvc.perform(multipart("/bookings/booking-1/documents")
                        .file(file))
                .andExpect(status().isUnauthorized());
    }

    // ===== GET /bookings?agentId=... =====

    @Test
    void getBookings_asAgent_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.getBookingsForAgent(USER_ID)).thenReturn(List.of());

        mockMvc.perform(get("/bookings")
                        .header("Authorization", BEARER_TOKEN)
                        .param("agentId", USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookings").isArray());
    }

    @Test
    void getBookings_missingBothParams_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        mockMvc.perform(get("/bookings")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isBadRequest());
    }

    // ===== PATCH /bookings/{bookingId}/agent-edit =====

    @Test
    void agentEditBooking_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractRole(VALID_TOKEN)).thenReturn("TRAVEL_AGENT");
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        BookingResponseDTO response = new BookingResponseDTO();
        response.setId("booking-1");
        when(bookingService.agentEditBooking(eq("booking-1"), eq(USER_ID), any())).thenReturn(response);

        mockMvc.perform(patch("/bookings/booking-1/agent-edit")
                        .header("Authorization", BEARER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidUpdateRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("booking-1"));
    }

    @Test
    void agentEditBooking_notAgent_returns401() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractRole(VALID_TOKEN)).thenReturn("CUSTOMER");

        mockMvc.perform(patch("/bookings/booking-1/agent-edit")
                        .header("Authorization", BEARER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidUpdateRequest())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void agentEditBooking_missingAuth_returns401() throws Exception {
        mockMvc.perform(patch("/bookings/booking-1/agent-edit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidUpdateRequest())))
                .andExpect(status().isUnauthorized());
    }

    // ===== POST /bookings/{bookingId}/approve-changes =====

    @Test
    void approveChanges_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        BookingResponseDTO response = new BookingResponseDTO();
        response.setId("booking-1");
        when(bookingService.approveChanges("booking-1", USER_ID)).thenReturn(response);

        mockMvc.perform(post("/bookings/booking-1/approve-changes")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("booking-1"));
    }

    @Test
    void approveChanges_noPendingChanges_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.approveChanges("booking-1", USER_ID))
                .thenThrow(new BookingException("No pending changes to approve"));

        mockMvc.perform(post("/bookings/booking-1/approve-changes")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isBadRequest());
    }

    @Test
    void approveChanges_missingAuth_returns401() throws Exception {
        mockMvc.perform(post("/bookings/booking-1/approve-changes"))
                .andExpect(status().isUnauthorized());
    }

    // ===== POST /bookings/{bookingId}/decline-changes =====

    @Test
    void declineChanges_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);

        BookingResponseDTO response = new BookingResponseDTO();
        response.setId("booking-1");
        when(bookingService.declineChanges("booking-1", USER_ID)).thenReturn(response);

        mockMvc.perform(post("/bookings/booking-1/decline-changes")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("booking-1"));
    }

    @Test
    void declineChanges_noPendingChanges_returns400() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.declineChanges("booking-1", USER_ID))
                .thenThrow(new BookingException("No pending changes to decline"));

        mockMvc.perform(post("/bookings/booking-1/decline-changes")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isBadRequest());
    }

    @Test
    void declineChanges_missingAuth_returns401() throws Exception {
        mockMvc.perform(post("/bookings/booking-1/decline-changes"))
                .andExpect(status().isUnauthorized());
    }

    // ===== POST /bookings/{bookingId}/confirm =====

    @Test
    void confirmBooking_success_returns200() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractRole(VALID_TOKEN)).thenReturn("TRAVEL_AGENT");
        when(jwtUtil.extractSubject(VALID_TOKEN)).thenReturn(USER_ID);
        when(bookingService.confirmBooking("booking-1", USER_ID)).thenReturn("Booking confirmed successfully");

        mockMvc.perform(post("/bookings/booking-1/confirm")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Booking confirmed successfully"));
    }

    @Test
    void confirmBooking_notAgent_returns401() throws Exception {
        when(jwtUtil.isValid(VALID_TOKEN)).thenReturn(true);
        when(jwtUtil.extractRole(VALID_TOKEN)).thenReturn("CUSTOMER");

        mockMvc.perform(post("/bookings/booking-1/confirm")
                        .header("Authorization", BEARER_TOKEN))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void confirmBooking_missingAuth_returns401() throws Exception {
        mockMvc.perform(post("/bookings/booking-1/confirm"))
                .andExpect(status().isUnauthorized());
    }

    // ===== Helper =====

    private CreateBookingRequestDTO buildValidRequest() {
        CreateBookingRequestDTO req = new CreateBookingRequestDTO();
        req.setTourId("tour-1");
        req.setDate(LocalDate.now().plusDays(30));
        req.setDuration("7 nights");
        req.setMealPlan("BB");

        CreateBookingRequestDTO.Guests guests = new CreateBookingRequestDTO.Guests();
        guests.setAdult(2);
        guests.setChildren(0);
        req.setGuests(guests);

        CreateBookingRequestDTO.PersonalDetail pd = new CreateBookingRequestDTO.PersonalDetail();
        pd.setFirstName("John");
        pd.setLastName("Doe");
        req.setPersonalDetails(List.of(pd));
        return req;
    }

    private UpdateBookingRequestDTO buildValidUpdateRequest() {
        UpdateBookingRequestDTO req = new UpdateBookingRequestDTO();
        req.setDate(LocalDate.now().plusDays(30));
        req.setDuration("7 nights");
        req.setMealPlan("BB");

        UpdateBookingRequestDTO.Guests guests = new UpdateBookingRequestDTO.Guests();
        guests.setAdult(2);
        guests.setChildren(0);
        req.setGuests(guests);

        UpdateBookingRequestDTO.PersonalDetail pd = new UpdateBookingRequestDTO.PersonalDetail();
        pd.setFirstName("John");
        pd.setLastName("Doe");
        req.setPersonalDetails(List.of(pd));
        return req;
    }
}

