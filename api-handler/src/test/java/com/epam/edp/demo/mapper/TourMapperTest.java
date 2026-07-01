package com.epam.edp.demo.mapper;

import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TourMapperTest {

    private TourMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new TourMapper();
    }

    private Tour buildTour() {
        return Tour.builder()
                .id("tour-1")
                .name("Garden Resort & Spa")
                .destination("Punta Cana, Dominican Republic")
                .rating(5.0)
                .reviewCount(19)
                .startDates(List.of("2025-06-10", "2025-06-20"))
                .durations(List.of("7 days", "10 days", "12 days"))
                .mealPlans(List.of("Breakfast (BB)", "Full-board (FB)"))
                .imageUrls(List.of("https://example.com/img1.jpg"))
                .freeCancelationDate("2025-05-31")
                .price(Map.of("7 days", "$1400", "10 days", "$1900"))
                .summary("An amazing resort in the Caribbean.")
                .freeCancelationDaysBefore(10)
                .accomodiation("Hotel room")
                .hotelName("Tropical Hotel")
                .hotelDescription("Luxury beachfront hotel")
                .customDetails(Map.of("Transfer", "Organized"))
                .mealSupplementsPerDay(Map.of("BB", "$0", "HB", "$25"))
                .guestQuantity(Tour.GuestQuantity.builder()
                        .adultsMaxValue(4).childrenMaxValue(2).totalMaxVelue(6).build())
                .build();
    }

    // ─── toTourListDTO ────────────────────────────────────────────────────────────

    @Test
    void toTourListDTO_mapsBasicFieldsCorrectly() {
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(buildTour());

        assertEquals("tour-1", dto.getId());
        assertEquals("Garden Resort & Spa", dto.getName());
        assertEquals("Punta Cana, Dominican Republic", dto.getDestination());
        assertEquals(5.0, dto.getRating());
        assertEquals(19, dto.getReviews());
    }

    @Test
    void toTourListDTO_setsDurationsAndMealPlans() {
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(buildTour());

        assertEquals(List.of("7 days", "10 days", "12 days"), dto.getDurations());
        assertEquals(List.of("Breakfast (BB)", "Full-board (FB)"), dto.getMealPlans());
    }

    @Test
    void toTourListDTO_setsEarliestStartDate() {
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(buildTour());
        assertEquals("2025-06-10", dto.getStartDate());
    }

    @Test
    void toTourListDTO_setsFreeCancelationDate() {
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(buildTour());
        assertEquals("2025-05-31", dto.getFreeCancelation());
    }

    @Test
    void toTourListDTO_computesMinPrice() {
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(buildTour());
        assertNotNull(dto.getPrice());
        assertTrue(dto.getPrice().startsWith("from $"));
        assertTrue(dto.getPrice().contains("1400"));
    }

    @Test
    void toTourListDTO_nullStartDates_doesNotThrow() {
        Tour tour = buildTour().toBuilder().startDates(null).build();
        assertDoesNotThrow(() -> mapper.toTourListDTO(tour));
    }

    @Test
    void toTourListDTO_nullPrice_priceRemainsNull() {
        Tour tour = buildTour().toBuilder().price(null).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertNull(dto.getPrice());
    }

    // ─── toTourDetailsDTO ─────────────────────────────────────────────────────────

    @Test
    void toTourDetailsDTO_mapsAllFields() {
        TourDetailsDTO dto = mapper.toTourDetailsDTO(buildTour());

        assertEquals("tour-1", dto.getId());
        assertEquals("Garden Resort & Spa", dto.getName());
        assertEquals("Punta Cana, Dominican Republic", dto.getDestination());
        assertEquals(5.0, dto.getRating());
        assertEquals(19, dto.getReviewCount());
        assertEquals("An amazing resort in the Caribbean.", dto.getSummary());
        assertEquals(10, dto.getFreeCancelationDaysBefore());
        assertEquals("Hotel room", dto.getAccomodiation());
        assertEquals("Tropical Hotel", dto.getHotelName());
        assertEquals("Luxury beachfront hotel", dto.getHotelDescription());
    }

    @Test
    void toTourDetailsDTO_mapsGuestQuantity() {
        TourDetailsDTO dto = mapper.toTourDetailsDTO(buildTour());

        assertNotNull(dto.getGuestQuantity());
        assertEquals(4, dto.getGuestQuantity().getAdultsMaxValue());
        assertEquals(2, dto.getGuestQuantity().getChildrenMaxValue());
        assertEquals(6, dto.getGuestQuantity().getTotalMaxVelue());
    }

    @Test
    void toTourDetailsDTO_nullGuestQuantity_doesNotThrow() {
        Tour tour = buildTour().toBuilder().guestQuantity(null).build();
        assertDoesNotThrow(() -> mapper.toTourDetailsDTO(tour));
        assertNull(mapper.toTourDetailsDTO(tour).getGuestQuantity());
    }

    @Test
    void toTourDetailsDTO_mapsCustomDetailsAndMealSupplements() {
        TourDetailsDTO dto = mapper.toTourDetailsDTO(buildTour());
        assertNotNull(dto.getCustomDetails());
        assertNotNull(dto.getMealSupplementsPerDay());
    }
}
