package com.epam.edp.demo.service;

import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.DuplicateReviewException;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.mapper.TourMapper;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourReviewServiceTest {

    @Mock TourRepository tourRepository;
    @Mock TourMapper tourMapper;
    @Mock UserRepository userRepository;
    @Mock BookingRepository bookingRepository;
    @InjectMocks TourServiceImpl tourService;

    private Tour mockTour;
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockTour = Tour.builder()
                .id("tour-1")
                .name("Tropical Caribe")
                .reviews(new ArrayList<>())
                .build();

        mockUser = new User();
        mockUser.setId("user-1");
        mockUser.setFirstName("John");
        mockUser.setLastName("Doe");

        lenient().when(bookingRepository.existsByUserIdAndTourIdAndStateIn(
                anyString(), anyString(), anyList())).thenReturn(true);
    }

    // ─── Happy path ──────────────────────────────────────────────────────────────

    @Test
    void submitFeedback_savesReviewWithCorrectFields() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 5, "Amazing tour!");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        Tour saved = captor.getValue();
        assertEquals(1, saved.getReviews().size());

        Tour.Review review = saved.getReviews().get(0);
        assertEquals("John Doe", review.getAuthorName());
        assertNull(review.getAuthorImageUrl());
        assertEquals(5, review.getRate());
        assertEquals("Amazing tour!", review.getReviewContent());
        assertNotNull(review.getCreatedAt());
    }

    @Test
    void submitFeedback_appendsToExistingReviews() {
        Tour.Review existing = Tour.Review.builder()
                .authorName("Jane Smith").rate(4).reviewContent("Good.").build();
        mockTour.setReviews(new ArrayList<>(List.of(existing)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 5, "Excellent!");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals(2, captor.getValue().getReviews().size());
    }

    @Test
    void submitFeedback_withNullReviewsList_initializesListAndSaves() {
        mockTour.setReviews(null);

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 3, "Decent.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertNotNull(captor.getValue().getReviews());
        assertEquals(1, captor.getValue().getReviews().size());
    }

    @Test
    void submitFeedback_withEmptyComment_savesNullComment() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, null);

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertNull(captor.getValue().getReviews().get(0).getReviewContent());
    }

    @Test
    void submitFeedback_authorNameBuiltFromFirstAndLastName() {
        mockUser.setFirstName("Alice");
        mockUser.setLastName("Wonder");

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 5, "Perfect!");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals("Alice Wonder", captor.getValue().getReviews().get(0).getAuthorName());
    }

    // ─── Sad path ────────────────────────────────────────────────────────────────

    @Test
    void submitFeedback_invalidTourId_throwsResourceNotFoundException() {
        when(tourRepository.findById("bad-tour")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> tourService.submitFeedback("bad-tour", "user-1", 5, "Nice!"));

        assertTrue(ex.getMessage().contains("bad-tour"));
        verify(tourRepository, never()).save(any());
    }

    @Test
    void submitFeedback_invalidUserId_throwsResourceNotFoundException() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("bad-user")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> tourService.submitFeedback("tour-1", "bad-user", 5, "Nice!"));

        assertTrue(ex.getMessage().contains("bad-user"));
        verify(tourRepository, never()).save(any());
    }

    @Test
    void submitFeedback_tourNotFound_neverCallsUserRepository() {
        when(tourRepository.findById("bad-tour")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> tourService.submitFeedback("bad-tour", "user-1", 5, "Nice!"));

        verify(userRepository, never()).findById(any());
    }

    // ─── Null name handling ──────────────────────────────────────────────────────

    @Test
    void submitFeedback_nullFirstName_usesLastNameOnly() {
        mockUser.setFirstName(null);
        mockUser.setLastName("Doe");

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, "Good.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals("Doe", captor.getValue().getReviews().get(0).getAuthorName());
    }

    @Test
    void submitFeedback_nullLastName_usesFirstNameOnly() {
        mockUser.setFirstName("John");
        mockUser.setLastName(null);

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, "Good.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals("John", captor.getValue().getReviews().get(0).getAuthorName());
    }

    @Test
    void submitFeedback_bothNamesNull_usesEmptyString() {
        mockUser.setFirstName(null);
        mockUser.setLastName(null);

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, "Good.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals("", captor.getValue().getReviews().get(0).getAuthorName());
    }

    // ─── Duplicate review prevention ────────────────────────────────────────────

    @Test
    void submitFeedback_duplicateUser_throwsDuplicateReviewException() {
        Tour.Review existing = Tour.Review.builder().userId("user-1").rate(4).reviewContent("Old.").build();
        mockTour.setReviews(new ArrayList<>(List.of(existing)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        assertThrows(DuplicateReviewException.class,
                () -> tourService.submitFeedback("tour-1", "user-1", 5, "Again!"));

        verify(tourRepository, never()).save(any());
    }

    // ─── updateFeedback ──────────────────────────────────────────────────────────

    @Test
    void updateFeedback_updatesExistingReviewFields() {
        Tour.Review existing = Tour.Review.builder()
                .userId("user-1").rate(3).reviewContent("Meh.").createdAt("2025-01-01").build();
        mockTour.setReviews(new ArrayList<>(List.of(existing)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));

        tourService.updateFeedback("tour-1", "user-1", 5, "Now excellent!");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        Tour.Review updated = captor.getValue().getReviews().get(0);
        assertEquals(5, updated.getRate());
        assertEquals("Now excellent!", updated.getReviewContent());
        assertNotNull(updated.getCreatedAt());
    }

    @Test
    void updateFeedback_recalculatesRatingAfterUpdate() {
        Tour.Review r1 = Tour.Review.builder().userId("user-1").rate(2).build();
        Tour.Review r2 = Tour.Review.builder().userId("user-2").rate(4).build();
        mockTour.setReviews(new ArrayList<>(List.of(r1, r2)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));

        tourService.updateFeedback("tour-1", "user-1", 4, "Better now");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals(4.0, captor.getValue().getRating()); // (4+4)/2 = 4.0
    }

    @Test
    void updateFeedback_tourNotFound_throwsResourceNotFoundException() {
        when(tourRepository.findById("bad-tour")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> tourService.updateFeedback("bad-tour", "user-1", 5, "Nice!"));

        verify(tourRepository, never()).save(any());
    }

    @Test
    void updateFeedback_noReviewForUser_throwsResourceNotFoundException() {
        Tour.Review other = Tour.Review.builder().userId("other-user").rate(3).build();
        mockTour.setReviews(new ArrayList<>(List.of(other)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));

        assertThrows(ResourceNotFoundException.class,
                () -> tourService.updateFeedback("tour-1", "user-1", 5, "Nice!"));

        verify(tourRepository, never()).save(any());
    }

    @Test
    void updateFeedback_nullReviewsList_throwsResourceNotFoundException() {
        mockTour.setReviews(null);

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));

        assertThrows(ResourceNotFoundException.class,
                () -> tourService.updateFeedback("tour-1", "user-1", 5, "Nice!"));
    }

    // ─── Rating & reviewCount recalculation ─────────────────────────────────────

    @Test
    void submitFeedback_updatesRatingToReviewAverage() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, "Good.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals(4.0, captor.getValue().getRating());
    }

    @Test
    void submitFeedback_averagesRatingAcrossAllReviews() {
        Tour.Review existing = Tour.Review.builder().rate(2).build();
        mockTour.setReviews(new ArrayList<>(List.of(existing)));

        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 4, "Better.");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals(3.0, captor.getValue().getRating());
    }

    @Test
    void submitFeedback_updatesReviewCount() {
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(mockUser));

        tourService.submitFeedback("tour-1", "user-1", 5, "Excellent!");

        ArgumentCaptor<Tour> captor = ArgumentCaptor.forClass(Tour.class);
        verify(tourRepository).save(captor.capture());

        assertEquals(1, captor.getValue().getReviewCount());
    }
}
