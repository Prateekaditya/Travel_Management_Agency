package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.CreateBookingRequestDTO;
import com.epam.edp.demo.dto.BookingResponseDTO;
import com.epam.edp.demo.dto.CreateBookingResponseDTO;
import com.epam.edp.demo.entity.Booking;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.BookingException;
import com.epam.edp.demo.exception.TourNotFoundException;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyCollection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private TourRepository tourRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private S3StorageProperties s3StorageProperties;

    @Mock
    private BookingEventPublisherService bookingEventPublisher;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private Tour tour;
    private Booking booking;
    private CreateBookingRequestDTO request;

    @BeforeEach
    void setUp() {
        tour = new Tour();
        tour.setId("tour-1");
        tour.setName("Grand Tour");
        tour.setHotelName("Grand Hotel");
        tour.setCapacity(10);
        tour.setFreeCancelationDaysBefore(5);
        tour.setDestination("Paris");

        request = new CreateBookingRequestDTO();
        request.setTourId("tour-1");
        request.setUserId("user-1");
        request.setDate(LocalDate.now().plusDays(30));
        request.setDuration("7 nights");
        request.setMealPlan("BB");

        CreateBookingRequestDTO.Guests guests = new CreateBookingRequestDTO.Guests();
        guests.setAdult(2);
        guests.setChildren(1);
        request.setGuests(guests);

        CreateBookingRequestDTO.PersonalDetail pd = new CreateBookingRequestDTO.PersonalDetail();
        pd.setFirstName("John");
        pd.setLastName("Doe");
        request.setPersonalDetails(List.of(pd));

        booking = new Booking();
        booking.setId("booking-1");
        booking.setUserId("user-1");
        booking.setTourId("tour-1");
        booking.setDate(LocalDate.now().plusDays(30));
        booking.setDuration("7 nights");
        booking.setMealPlan("BB");
        booking.setState("BOOKED");
        booking.setFreeCancelation(LocalDate.now().plusDays(25));

        Booking.Guests bg = new Booking.Guests();
        bg.setAdult(2);
        bg.setChildren(1);
        booking.setGuests(bg);

        Booking.PersonalDetail bpd = new Booking.PersonalDetail();
        bpd.setFirstName("John");
        bpd.setLastName("Doe");
        booking.setPersonalDetails(List.of(bpd));
        booking.setDocuments(new ArrayList<>());

        // Default S3 mock setup for upload tests
        lenient().when(s3StorageProperties.getPrefix()).thenReturn("bookings");
        lenient().when(s3StorageProperties.getBucket()).thenReturn("test-bucket");
        lenient().doNothing().when(objectStorageService).upload(any(), anyString(), anyString());
        lenient().doNothing().when(objectStorageService).delete(anyString());
    }

    // ===== createBooking =====

    @Test
    void createBooking_success_withHotelName() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(5L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);

        assertThat(response).isNotNull();
        assertThat(response.getDetails()).contains("Grand Hotel");
        assertThat(response.getDetails()).contains("Breakfast (BB)");
        assertThat(response.getFreeCancelation()).isEqualTo(request.getDate().minusDays(5));
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void createBooking_success_withTourNameFallback() {
        tour.setHotelName(null);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);

        assertThat(response.getDetails()).contains("Grand Tour");
    }

    @Test
    void createBooking_success_hotelNameBlankFallbackToTourName() {
        tour.setHotelName("  ");
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);

        assertThat(response.getDetails()).contains("Grand Tour");
    }

    @Test
    void createBooking_tourNotFound_throwsTourNotFoundException() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.createBooking(request))
                .isInstanceOf(TourNotFoundException.class);
    }

    @Test
    void createBooking_overbooking_throwsBookingException() {
        tour.setCapacity(3);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(3L);

        assertThatThrownBy(() -> bookingService.createBooking(request))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("fully booked");
    }

    @Test
    void createBooking_capacityZero_skipsOverbookingCheck() {
        tour.setCapacity(0);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);

        assertThat(response).isNotNull();
        verify(bookingRepository, never()).countByTourIdAndDateAndStateNot(any(), any(), any());
    }

    @Test
    void createBooking_freeCancelationDaysBeforeZero_defaultsTen() {
        tour.setFreeCancelationDaysBefore(0);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);

        assertThat(response.getFreeCancelation()).isEqualTo(request.getDate().minusDays(10));
    }

    @Test
    void createBooking_mealPlanLabels() {
        String[] plans = {"BB", "HB", "FB", "AI", "UNKNOWN"};
        String[] labels = {"Breakfast (BB)", "Half-board (HB)", "Full-board (FB)", "All inclusive (AI)", "UNKNOWN"};

        for (int i = 0; i < plans.length; i++) {
            request.setMealPlan(plans[i]);
            when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
            when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CreateBookingResponseDTO response = bookingService.createBooking(request);
            assertThat(response.getDetails()).contains(labels[i]);
        }
    }

    @Test
    void createBooking_singleAdultNoChildren_guestSummary() {
        request.getGuests().setAdult(1);
        request.getGuests().setChildren(0);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);
        assertThat(response.getDetails()).contains("1 adult");
        assertThat(response.getDetails()).doesNotContain("child");
    }

    @Test
    void createBooking_multipleAdultsWithChildren_guestSummary() {
        request.getGuests().setAdult(3);
        request.getGuests().setChildren(2);
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));
        when(bookingRepository.countByTourIdAndDateAndStateNot(any(), any(), any())).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateBookingResponseDTO response = bookingService.createBooking(request);
        assertThat(response.getDetails()).contains("3 adults");
        assertThat(response.getDetails()).contains("2 child(ren)");
    }

    // ===== getBookingsForUser =====

    @Test
    void getBookingsForUser_returnsBookings() {
        when(bookingRepository.findByUserId("user-1")).thenReturn(List.of(booking));
        when(tourRepository.findAllById(anyCollection())).thenReturn(List.of(tour));

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-1");

        assertThat(result).hasSize(1);
        BookingResponseDTO dto = result.get(0);
        assertThat(dto.getId()).isEqualTo("booking-1");
        assertThat(dto.getState()).isEqualTo("BOOKED");
        assertThat(dto.getName()).isEqualTo("Grand Tour");
        assertThat(dto.getDestination()).isEqualTo("Paris");
        assertThat(dto.getTourDetails()).isNotNull();
        assertThat(dto.getTourDetails().getGuests()).contains("John Doe");
        assertThat(dto.getTourDetails().getMealPlan()).isEqualTo("Breakfast (BB)");
    }

    @Test
    void getBookingsForUser_emptyList() {
        when(bookingRepository.findByUserId("user-2")).thenReturn(List.of());

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-2");

        assertThat(result).isEmpty();
    }

    @Test
    void getBookingsForUser_tourNotFound_usesTourIdAsFallback() {
        when(bookingRepository.findByUserId("user-1")).thenReturn(List.of(booking));
        when(tourRepository.findAllById(anyCollection())).thenReturn(List.of());

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-1");

        assertThat(result).hasSize(1);
        // When tour not found, name falls back to tourId
        assertThat(result.get(0).getName()).isEqualTo("tour-1");
        assertThat(result.get(0).getTourImageUrl()).isNull();
    }

    @Test
    void getBookingsForUser_withDocuments_reflectedInDocumentCount() {
        Booking.BookingDocument doc = new Booking.BookingDocument();
        doc.setId("doc-1");
        doc.setFileName("passport.pdf");
        doc.setFileType("application/pdf");
        doc.setUploadedAt(LocalDate.now().toString());
        booking.setDocuments(new ArrayList<>(List.of(doc)));

        when(bookingRepository.findByUserId("user-1")).thenReturn(List.of(booking));
        when(tourRepository.findAllById(anyCollection())).thenReturn(List.of(tour));

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-1");

        assertThat(result.get(0).getTourDetails().getDocuments()).isEqualTo("1 items");
    }

    @Test
    void getBookingsForUser_nullDocuments_zeroDocumentCount() {
        booking.setDocuments(null);
        when(bookingRepository.findByUserId("user-1")).thenReturn(List.of(booking));
        when(tourRepository.findAllById(anyCollection())).thenReturn(List.of(tour));

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-1");

        assertThat(result.get(0).getTourDetails().getDocuments()).isEqualTo("0 items");
    }

    @Test
    void getBookingsForUser_travelAgentIsNull() {
        when(bookingRepository.findByUserId("user-1")).thenReturn(List.of(booking));
        when(tourRepository.findAllById(anyCollection())).thenReturn(List.of(tour));

        List<BookingResponseDTO> result = bookingService.getBookingsForUser("user-1");

        BookingResponseDTO.TravelAgent agent = result.get(0).getTravelAgent();
        assertThat(agent).isNotNull();
        assertThat(agent.getName()).isNull();
        assertThat(agent.getEmail()).isNull();
    }

    // ===== cancelBooking =====

    @Test
    void cancelBooking_success() {
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        bookingService.cancelBooking("booking-1", "user-1");

        assertThat(booking.getState()).isEqualTo("CANCELLED");
        verify(bookingRepository).save(booking);
    }

    @Test
    void cancelBooking_bookingNotFound_throwsBookingException() {
        when(bookingRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.cancelBooking("nonexistent", "user-1"))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void cancelBooking_wrongUser_throwsUnauthorizedException() {
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking("booking-1", "other-user"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void cancelBooking_alreadyCancelled_throwsBookingException() {
        booking.setState("CANCELLED");
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking("booking-1", "user-1"))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("already cancelled");
    }

    @Test
    void cancelBooking_afterFreeCancellationDate_throwsBookingException() {
        booking.setFreeCancelation(LocalDate.now().minusDays(1)); // expired
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking("booking-1", "user-1"))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("Free cancellation period has expired");
    }

    // ===== uploadDocument =====

    @Test
    void uploadDocument_success() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "passport.pdf", "application/pdf", "PDF content".getBytes()
        );
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String docId = bookingService.uploadDocument("booking-1", "user-1", file, null);

        assertThat(docId).isNotNull();
        assertThat(booking.getDocuments()).hasSize(1);
        assertThat(booking.getDocuments().get(0).getFileName()).isEqualTo("passport.pdf");
        assertThat(booking.getDocuments().get(0).getFileType()).isEqualTo("application/pdf");
    }

    @Test
    void uploadDocument_bookingNotFound_throwsBookingException() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);
        when(bookingRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.uploadDocument("nonexistent", "user-1", file, null))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void uploadDocument_wrongUser_throwsUnauthorizedException() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.uploadDocument("booking-1", "other-user", file, null))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void uploadDocument_cancelledBooking_throwsBookingException() {
        booking.setState("CANCELLED");
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.uploadDocument("booking-1", "user-1", file, null))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("CANCELLED");
    }

    @Test
    void uploadDocument_finishedBooking_throwsBookingException() {
        booking.setState("FINISHED");
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[0]);
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.uploadDocument("booking-1", "user-1", file, null))
                .isInstanceOf(BookingException.class)
                .hasMessageContaining("FINISHED");
    }

    @Test
    void uploadDocument_nullDocumentList_initializesAndAdds() {
        booking.setDocuments(null);
        MockMultipartFile file = new MockMultipartFile("file", "visa.jpg", "image/jpeg", "image bytes".getBytes());
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String docId = bookingService.uploadDocument("booking-1", "user-1", file, null);

        assertThat(docId).isNotNull();
        assertThat(booking.getDocuments()).hasSize(1);
        assertThat(booking.getDocuments().get(0).getFileName()).isEqualTo("visa.jpg");
    }

    @Test
    void uploadDocument_appendsToExistingDocuments() {
        Booking.BookingDocument existing = new Booking.BookingDocument();
        existing.setId("existing-doc");
        booking.setDocuments(new ArrayList<>(List.of(existing)));

        MockMultipartFile file = new MockMultipartFile("file", "new.pdf", "application/pdf", "data".getBytes());
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        bookingService.uploadDocument("booking-1", "user-1", file, null);

        assertThat(booking.getDocuments()).hasSize(2);
    }
}

