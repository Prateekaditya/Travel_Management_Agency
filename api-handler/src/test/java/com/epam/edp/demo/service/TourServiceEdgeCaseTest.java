package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.DuplicateReviewException;
import com.epam.edp.demo.mapper.TourMapper;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourServiceEdgeCaseTest {

    @Mock TourRepository tourRepository;
    @Mock TourMapper tourMapper;
    @Mock MongoTemplate mongoTemplate;
    @Mock UserRepository userRepository;
    @Mock BookingRepository bookingRepository;
    @InjectMocks TourServiceImpl tourService;

    private Tour mockTour;
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockTour = Tour.builder()
                .id("1").name("Test").destination("Bali, Indonesia")
                .startDates(List.of("2025-06-10"))
                .durations(List.of("7 days"))
                .rating(4.5).reviewCount(10)
                .reviews(new ArrayList<>())
                .guestQuantity(Tour.GuestQuantity.builder()
                        .adultsMaxValue(4).childrenMaxValue(2).totalMaxVelue(6).build())
                .build();

        mockUser = User.builder()
                .id("user-1").firstName("John").lastName("Doe").build();
    }

    // ─── Pagination edge cases ───────────────────────────────────────────────────

    @Test
    void nullPage_defaultsToOne() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(new TourListResponseDTO.TourDTO());

        TourListResponseDTO result = tourService.getAvailableTours(null, 6, null, null, null, null, null, null, null, null, "RATING_DESC");
        assertEquals(1, result.getPage());
    }

    @Test
    void nullPageSize_defaultsToNine() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(new TourListResponseDTO.TourDTO());

        TourListResponseDTO result = tourService.getAvailableTours(1, null, null, null, null, null, null, null, null, null, "RATING_DESC");
        assertEquals(9, result.getPageSize());
    }

    @Test
    void emptyTourList_returnsOneEmptyPage() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "RATING_DESC");

        assertEquals(1, result.getTotalPages());
        assertEquals(0, result.getTotalItems());
        assertTrue(result.getTours().isEmpty());
    }

    @Test
    void pageOutOfBounds_returnsEmptyTours() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        TourListResponseDTO result = tourService.getAvailableTours(999, 6, null, null, null, null, null, null, null, null, "RATING_DESC");

        assertTrue(result.getTours().isEmpty());
        assertEquals(1, result.getTotalItems());
    }

    // ─── Filter edge cases ───────────────────────────────────────────────────────

    @Test
    void anyDestination_isIgnored() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(new TourListResponseDTO.TourDTO());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, "Any destination", null, null, null, null, null, null, null, "RATING_DESC");
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void durationFilter_noMatch_returnsEmpty() {
        // Duration filter uses in-memory path; DB returns tour but it's filtered out (no "14 days" duration)
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, List.of("14 days"), null, null, null, null, "RATING_DESC");
        assertEquals(0, result.getTotalItems());
    }

    @Test
    void children_zero_isIgnored() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(new TourListResponseDTO.TourDTO());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, 0, "RATING_DESC");
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void nullGuestQuantity_doesNotThrow_whenAdultsFilterApplied() {
        // DB-level filter handles this; mock returns empty (adults=2 with null guestQuantity would not match)
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        assertDoesNotThrow(() -> tourService.getAvailableTours(1, 6, null, null, null, null, null, null, 2, null, "RATING_DESC"));
    }

    // ─── Reviews edge cases ──────────────────────────────────────────────────────

    @Test
    void getReviews_nullReviews_returnsEmpty() {
        Tour tour = mockTour.toBuilder().reviews(null).build();
        when(tourRepository.findById("1")).thenReturn(Optional.of(tour));

        ReviewListResponseDTO result = tourService.getReviewsByTourId("1", 1, 4, "RATING_DESC");
        assertNotNull(result.getReviews());
        assertTrue(result.getReviews().isEmpty());
    }

    @Test
    void getReviews_sortByOldest_doesNotThrow() {
        Tour.Review r = Tour.Review.builder().authorName("A").rate(4).createdAt("2024-06-01").reviewContent("ok").build();
        Tour tour = mockTour.toBuilder().reviews(List.of(r)).build();
        when(tourRepository.findById("1")).thenReturn(Optional.of(tour));

        assertDoesNotThrow(() -> tourService.getReviewsByTourId("1", 1, 4, "OLDEST"));
    }

    @Test
    void getReviews_sortByNewest_doesNotThrow() {
        Tour.Review r = Tour.Review.builder().authorName("A").rate(4).createdAt("2024-06-01").reviewContent("ok").build();
        Tour tour = mockTour.toBuilder().reviews(List.of(r)).build();
        when(tourRepository.findById("1")).thenReturn(Optional.of(tour));

        assertDoesNotThrow(() -> tourService.getReviewsByTourId("1", 1, 4, "NEWEST"));
    }

    @Test
    void getReviews_nullPageAndPageSize_useDefaults() {
        Tour.Review r = Tour.Review.builder().authorName("A").rate(4).createdAt("2024-06-01").reviewContent("ok").build();
        Tour tour = mockTour.toBuilder().reviews(List.of(r)).build();
        when(tourRepository.findById("1")).thenReturn(Optional.of(tour));

        ReviewListResponseDTO result = tourService.getReviewsByTourId("1", null, null, "RATING_DESC");
        assertEquals(1, result.getPage());
        assertNotNull(result.getPageSize());
    }

    // ─── Destinations edge cases ─────────────────────────────────────────────────

    @Test
    void getDestinations_blankQuery_returnsAll() {
        when(tourRepository.findAll()).thenReturn(List.of(mockTour));

        var result = tourService.getDestinations("   ");
        assertEquals(1, result.getDestinations().size());
    }

    @Test
    void getDestinations_noMatch_returnsEmpty() {
        when(tourRepository.findAll()).thenReturn(List.of(mockTour));

        var result = tourService.getDestinations("xyz123");
        assertTrue(result.getDestinations().isEmpty());
    }

    // ─── Feedback validation ─────────────────────────────────────────────────────

    @Test
    void submitFeedback_noBooking_throwsIllegalArgument() {
        when(tourRepository.findById("1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("STARTED", "FINISHED")))
                .thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> tourService.submitFeedback("1", "user-1", 4.0, "Great!"));
    }

    @Test
    void submitFeedback_lowRatingNoComment_throwsIllegalArgument() {
        when(tourRepository.findById("1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("STARTED", "FINISHED")))
                .thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> tourService.submitFeedback("1", "user-1", 2.0, null));
    }

    @Test
    void submitFeedback_lowRatingBlankComment_throwsIllegalArgument() {
        when(tourRepository.findById("1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("STARTED", "FINISHED")))
                .thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> tourService.submitFeedback("1", "user-1", 3.0, "   "));
    }

    @Test
    void submitFeedback_highRatingNoComment_succeeds() {
        when(tourRepository.findById("1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("STARTED", "FINISHED")))
                .thenReturn(true);

        assertDoesNotThrow(() -> tourService.submitFeedback("1", "user-1", 5.0, null));
        verify(tourRepository).save(any());
    }

    @Test
    void submitFeedback_duplicateReview_throwsDuplicateReviewException() {
        Tour.Review existing = Tour.Review.builder().userId("user-1").rate(4).reviewContent("ok").build();
        Tour tourWithReview = mockTour.toBuilder().reviews(new ArrayList<>(List.of(existing))).build();

        when(tourRepository.findById("1")).thenReturn(Optional.of(tourWithReview));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("STARTED", "FINISHED")))
                .thenReturn(true);

        assertThrows(DuplicateReviewException.class,
                () -> tourService.submitFeedback("1", "user-1", 4.0, "nice"));
    }

    @Test
    void updateFeedback_noFinishedBooking_throwsIllegalArgument() {
        Tour.Review existing = Tour.Review.builder().userId("user-1").rate(4).reviewContent("ok").build();
        Tour tourWithReview = mockTour.toBuilder().reviews(new ArrayList<>(List.of(existing))).build();

        when(tourRepository.findById("1")).thenReturn(Optional.of(tourWithReview));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("FINISHED")))
                .thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> tourService.updateFeedback("1", "user-1", 5.0, "updated"));
    }

    @Test
    void updateFeedback_lowRatingNoComment_throwsIllegalArgument() {
        Tour.Review existing = Tour.Review.builder().userId("user-1").rate(4).reviewContent("ok").build();
        Tour tourWithReview = mockTour.toBuilder().reviews(new ArrayList<>(List.of(existing))).build();

        when(tourRepository.findById("1")).thenReturn(Optional.of(tourWithReview));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("FINISHED")))
                .thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> tourService.updateFeedback("1", "user-1", 2.0, ""));
    }

    @Test
    void updateFeedback_valid_savesTour() {
        Tour.Review existing = Tour.Review.builder().userId("user-1").rate(4).reviewContent("ok").build();
        Tour tourWithReview = mockTour.toBuilder().reviews(new ArrayList<>(List.of(existing))).build();

        when(tourRepository.findById("1")).thenReturn(Optional.of(tourWithReview));
        when(bookingRepository.existsByUserIdAndTourIdAndStateIn("user-1", "1", List.of("FINISHED")))
                .thenReturn(true);

        assertDoesNotThrow(() -> tourService.updateFeedback("1", "user-1", 5.0, "updated comment"));
        verify(tourRepository).save(any());
    }
}
