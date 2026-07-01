package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.DestinationListResponseDTO;
import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.mapper.TourMapper;
import com.epam.edp.demo.repository.TourRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourServiceTest {

    @Mock TourRepository tourRepository;
    @Mock TourMapper tourMapper;
    @Mock MongoTemplate mongoTemplate;
    @InjectMocks TourServiceImpl tourService;

    private Tour mockTour;
    private TourListResponseDTO.TourDTO mockDTO;

    @BeforeEach
    void setUp() {
        mockTour = Tour.builder()
                .id("tour-1")
                .name("Garden Resort & Spa")
                .destination("Punta Cana, Dominican Republic")
                .startDates(List.of("2025-06-10", "2025-06-20"))
                .durations(List.of("7 days", "10 days"))
                .mealPlans(List.of("Full-board (FB)", "All inclusive (AI)"))
                .rating(5.0)
                .reviewCount(19)
                .tourType("RESORT")
                .guestQuantity(Tour.GuestQuantity.builder()
                        .adultsMaxValue(4).childrenMaxValue(2).totalMaxVelue(6).build())
                .build();

        mockDTO = new TourListResponseDTO.TourDTO();
        mockDTO.setId("tour-1");
        mockDTO.setName("Garden Resort & Spa");
    }

    // ─── Pagination ──────────────────────────────────────────────────────────────

    @Test
    void pagination_totalPagesCalculatedCorrectly() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);

        TourListResponseDTO result = tourService.getAvailableTours(1, 1, null, null, null, null, null, null, null, null, "RATING_DESC");

        assertEquals(1, result.getTotalPages());
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void pagination_pageNumberPassedThrough() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "RATING_DESC");

        assertEquals(1, result.getPage());
    }

    @Test
    void emptyResult_returnsEmptyList() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "RATING_DESC");

        assertTrue(result.getTours().isEmpty());
        assertEquals(0, result.getTotalItems());
    }

    // ─── Sorting ─────────────────────────────────────────────────────────────────

    @Test
    void sortByRatingDesc_doesNotThrow() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);
        assertDoesNotThrow(() -> tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "RATING_DESC"));
    }

    @Test
    void sortByRatingAsc_doesNotThrow() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);
        assertDoesNotThrow(() -> tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "RATING_ASC"));
    }

    @Test
    void sortByPriceDesc_doesNotThrow() {
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);
        assertDoesNotThrow(() -> tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "PRICE_DESC"));
    }

    @Test
    void sortByPriceAsc_doesNotThrow() {
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);
        assertDoesNotThrow(() -> tourService.getAvailableTours(1, 6, null, null, null, null, null, null, null, null, "PRICE_ASC"));
    }

    // ─── Filters ─────────────────────────────────────────────────────────────────

    @Test
    void destinationFilter_matchesCaseInsensitive() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, "punta cana", null, null, null, null, null, null, null, "RATING_DESC");
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void destinationFilter_noMatch_returnsEmpty() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, "Paris", null, null, null, null, null, null, null, "RATING_DESC");
        assertEquals(0, result.getTotalItems());
    }

    @Test
    void tourTypeFilter_matchesCaseInsensitive() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, List.of("RESORT"), null, null, "RATING_DESC");
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void mealPlanFilter_matchesCode() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of(mockTour));
        when(tourMapper.toTourListDTO(any())).thenReturn(mockDTO);

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, List.of("FB"), null, null, null, "RATING_DESC");
        assertEquals(1, result.getTotalItems());
    }

    @Test
    void adultsFilter_excludesTourWithInsufficientCapacity() {
        when(mongoTemplate.count(any(Query.class), any(Class.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), any(Class.class))).thenReturn(List.of());

        TourListResponseDTO result = tourService.getAvailableTours(1, 6, null, null, null, null, null, null, 10, null, "RATING_DESC");
        assertEquals(0, result.getTotalItems());
    }

    // ─── Destinations ────────────────────────────────────────────────────────────

    @Test
    void getDestinations_returnsDistinctValues() {
        Tour tour1 = mockTour.toBuilder().destination("Bali, Indonesia").build();
        Tour tour2 = mockTour.toBuilder().destination("Bali, Indonesia").build();
        Tour tour3 = mockTour.toBuilder().destination("Paris, France").build();

        when(tourRepository.findAll()).thenReturn(List.of(tour1, tour2, tour3));

        // "a" is present in both "Bali, Indonesia" and "Paris, France"
        DestinationListResponseDTO result = tourService.getDestinations("a");

        assertEquals(2, result.getDestinations().size());
        assertTrue(result.getDestinations().contains("Bali, Indonesia"));
    }

    @Test
    void getDestinations_nullQuery_returnsAll() {
        when(tourRepository.findAll()).thenReturn(List.of(mockTour));

        DestinationListResponseDTO result = tourService.getDestinations(null);
        assertEquals(1, result.getDestinations().size());
    }

    // ─── getTourById ─────────────────────────────────────────────────────────────

    @Test
    void getTourById_found_returnsDTO() {
        TourDetailsDTO detailsDTO = new TourDetailsDTO();
        detailsDTO.setId("tour-1");
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(mockTour));
        when(tourMapper.toTourDetailsDTO(mockTour)).thenReturn(detailsDTO);

        TourDetailsDTO result = tourService.getTourById("tour-1");
        assertEquals("tour-1", result.getId());
    }

    @Test
    void getTourById_notFound_throwsResourceNotFoundException() {
        when(tourRepository.findById("bad-id")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> tourService.getTourById("bad-id"));
    }

    // ─── getReviewsByTourId ──────────────────────────────────────────────────────

    @Test
    void getReviews_tourNotFound_throwsResourceNotFoundException() {
        when(tourRepository.findById("bad-id")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> tourService.getReviewsByTourId("bad-id", 1, 4, "RATING_DESC"));
    }

    @Test
    void getReviews_emptyReviews_returnsEmptyList() {
        Tour tour = mockTour.toBuilder().reviews(List.of()).build();
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));

        ReviewListResponseDTO result = tourService.getReviewsByTourId("tour-1", 1, 4, "RATING_DESC");
        assertTrue(result.getReviews().isEmpty());
        assertEquals(0, result.getTotalItems());
    }

    @Test
    void getReviews_sortedByRatingDesc() {
        Tour.Review r1 = Tour.Review.builder().authorName("A").rate(3).createdAt("2024-01-01").reviewContent("ok").build();
        Tour.Review r2 = Tour.Review.builder().authorName("B").rate(5).createdAt("2024-01-02").reviewContent("great").build();
        Tour tour = mockTour.toBuilder().reviews(List.of(r1, r2)).build();
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));

        ReviewListResponseDTO result = tourService.getReviewsByTourId("tour-1", 1, 10, "RATING_DESC");
        assertEquals(5, result.getReviews().get(0).getRate());
    }

    @Test
    void getReviews_paginationWorks() {
        List<Tour.Review> reviews = List.of(
                Tour.Review.builder().authorName("A").rate(5).createdAt("2024-01-01").reviewContent("1").build(),
                Tour.Review.builder().authorName("B").rate(4).createdAt("2024-01-02").reviewContent("2").build(),
                Tour.Review.builder().authorName("C").rate(3).createdAt("2024-01-03").reviewContent("3").build()
        );
        Tour tour = mockTour.toBuilder().reviews(reviews).build();
        when(tourRepository.findById("tour-1")).thenReturn(Optional.of(tour));

        ReviewListResponseDTO result = tourService.getReviewsByTourId("tour-1", 1, 2, "RATING_DESC");
        assertEquals(2, result.getReviews().size());
        assertEquals(3, result.getTotalItems());
        assertEquals(2, result.getTotalPages());
    }
}
