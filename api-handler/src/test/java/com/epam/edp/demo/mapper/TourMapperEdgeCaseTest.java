package com.epam.edp.demo.mapper;

import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TourMapperEdgeCaseTest {

    private TourMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new TourMapper();
    }

    private Tour base() {
        return Tour.builder()
                .id("1").name("Test Tour").destination("Bali")
                .startDates(List.of("2025-06-10"))
                .durations(List.of("7 days"))
                .mealPlans(List.of("Full-board (FB)"))
                .rating(4.5).reviewCount(10)
                .freeCancelationDate("2025-05-31")
                .freeCancelationDaysBefore(5)
                .price(Map.of("7 days", "$1000"))
                .guestQuantity(Tour.GuestQuantity.builder()
                        .adultsMaxValue(4).childrenMaxValue(2).totalMaxVelue(6).build())
                .build();
    }

    // ─── toTourListDTO edge cases ─────────────────────────────────────────────────

    @Test
    void nullStartDates_doesNotThrowNPE() {
        Tour tour = base().toBuilder().startDates(null).build();
        assertDoesNotThrow(() -> mapper.toTourListDTO(tour));
    }

    @Test
    void nullStartDates_startDateIsNull() {
        Tour tour = base().toBuilder().startDates(null).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertNull(dto.getStartDate());
    }

    @Test
    void emptyStartDates_startDateIsNull() {
        Tour tour = base().toBuilder().startDates(List.of()).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertNull(dto.getStartDate());
    }

    @Test
    void nullPrice_priceRemainsNull() {
        Tour tour = base().toBuilder().price(null).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertNull(dto.getPrice());
    }

    @Test
    void emptyPrice_priceRemainsNull() {
        Tour tour = base().toBuilder().price(Map.of()).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertNull(dto.getPrice());
    }

    @Test
    void priceWithNonNumericValue_doesNotThrow() {
        Tour tour = base().toBuilder().price(Map.of("7 days", "N/A")).build();
        assertDoesNotThrow(() -> mapper.toTourListDTO(tour));
    }

    @Test
    void multipleStartDates_firstIsPicked() {
        Tour tour = base().toBuilder().startDates(List.of("2025-06-10", "2025-07-15")).build();
        TourListResponseDTO.TourDTO dto = mapper.toTourListDTO(tour);
        assertEquals("2025-06-10", dto.getStartDate());
    }

    // ─── toTourDetailsDTO edge cases ──────────────────────────────────────────────

    @Test
    void nullGuestQuantity_guestQuantityIsNull() {
        Tour tour = base().toBuilder().guestQuantity(null).build();
        TourDetailsDTO dto = mapper.toTourDetailsDTO(tour);
        assertNull(dto.getGuestQuantity());
    }

    @Test
    void nullCustomDetails_customDetailsIsNull() {
        Tour tour = base().toBuilder().customDetails(null).build();
        TourDetailsDTO dto = mapper.toTourDetailsDTO(tour);
        assertNull(dto.getCustomDetails());
    }

    @Test
    void nullHotelName_isAllowed() {
        Tour tour = base().toBuilder().hotelName(null).build();
        TourDetailsDTO dto = mapper.toTourDetailsDTO(tour);
        assertNull(dto.getHotelName());
    }

    @Test
    void allNullOptionalFields_doesNotThrow() {
        Tour tour = Tour.builder()
                .id("2").name("Minimal").destination("Nowhere")
                .rating(3.0).reviewCount(0)
                .build();
        assertDoesNotThrow(() -> mapper.toTourDetailsDTO(tour));
    }
}
