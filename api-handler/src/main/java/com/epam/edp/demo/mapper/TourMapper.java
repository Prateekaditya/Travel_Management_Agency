package com.epam.edp.demo.mapper;

import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class TourMapper {

    public TourListResponseDTO.TourDTO toTourListDTO(Tour tour) {
        TourListResponseDTO.TourDTO dto = new TourListResponseDTO.TourDTO();
        dto.setId(tour.getId());
        dto.setName(tour.getName());
        dto.setDestination(tour.getDestination());
        dto.setRating(tour.getRating());
        dto.setReviews(tour.getReviewCount());
        dto.setDurations(tour.getDurations());
        dto.setMealPlans(tour.getMealPlans());
        dto.setImageUrls(tour.getImageUrls());
        dto.setPriceMap(tour.getPrice());
        dto.setMealSupplementsPerDay(tour.getMealSupplementsPerDay());

        // Filter to future/today start dates only; fall back to all dates if none are upcoming
        LocalDate today = LocalDate.now();
        List<String> futureDates = List.of();
        if (tour.getStartDates() != null && !tour.getStartDates().isEmpty()) {
            futureDates = tour.getStartDates().stream()
                    .filter(Objects::nonNull)
                    .filter(sd -> isFutureOrToday(sd, today))
                    .sorted()
                    .collect(Collectors.toList());
            List<String> effectiveDates = futureDates.isEmpty() ? tour.getStartDates() : futureDates;
            dto.setStartDates(effectiveDates);
            dto.setStartDate(effectiveDates.get(0));
        }

        // Compute freeCancelation deadline dynamically: nextFutureStartDate − freeCancelationDaysBefore
        // Falls back to the stored freeCancelationDate if no future dates or daysBefore is null
        String freeCancelation = tour.getFreeCancelationDate();
        if (tour.getFreeCancelationDaysBefore() != null && !futureDates.isEmpty()) {
            freeCancelation = computeFreeCancelation(freeCancelation, tour.getFreeCancelationDaysBefore(), futureDates);
        }
        dto.setFreeCancelation(freeCancelation);

        dto.setPrice(computeMinPrice(tour.getPrice()));
        dto.setTourType(tour.getTourType());
        dto.setTravelAgentId(tour.getTravelAgentId());

        if (tour.getGuestQuantity() != null) {
            TourListResponseDTO.GuestQuantityDTO gq = new TourListResponseDTO.GuestQuantityDTO();
            gq.setAdultsMaxValue(tour.getGuestQuantity().getAdultsMaxValue());
            gq.setChildrenMaxValue(tour.getGuestQuantity().getChildrenMaxValue());
            gq.setTotalMaxVelue(tour.getGuestQuantity().getTotalMaxVelue());
            dto.setGuestQuantity(gq);
        }

        return dto;
    }

    public TourDetailsDTO toTourDetailsDTO(Tour tour) {
        TourDetailsDTO dto = new TourDetailsDTO();
        dto.setId(tour.getId());
        dto.setName(tour.getName());
        dto.setDestination(tour.getDestination());
        dto.setRating(tour.getRating());
        dto.setReviewCount(tour.getReviewCount());
        dto.setImageUrls(tour.getImageUrls());
        dto.setSummary(tour.getSummary());
        dto.setFreeCancelationDaysBefore(tour.getFreeCancelationDaysBefore());
        dto.setDurations(tour.getDurations());
        dto.setAccomodiation(tour.getAccomodiation());
        dto.setHotelName(tour.getHotelName());
        dto.setHotelDescription(tour.getHotelDescription());
        dto.setMealPlans(tour.getMealPlans());
        dto.setCustomDetails(tour.getCustomDetails());
        dto.setStartDates(tour.getStartDates());
        dto.setPrice(tour.getPrice());
        dto.setMealSupplementsPerDay(tour.getMealSupplementsPerDay());
        dto.setTourType(tour.getTourType());
        dto.setTravelAgentId(tour.getTravelAgentId());

        if (tour.getGuestQuantity() != null) {
            TourDetailsDTO.GuestQuantityDTO gq = new TourDetailsDTO.GuestQuantityDTO();
            gq.setAdultsMaxValue(tour.getGuestQuantity().getAdultsMaxValue());
            gq.setChildrenMaxValue(tour.getGuestQuantity().getChildrenMaxValue());
            gq.setTotalMaxVelue(tour.getGuestQuantity().getTotalMaxVelue()); // matches OpenAPI spec field name
            dto.setGuestQuantity(gq);
        }

        return dto;
    }

    private boolean isFutureOrToday(String dateStr, LocalDate today) {
        try {
            return !LocalDate.parse(dateStr.trim()).isBefore(today);
        } catch (java.time.format.DateTimeParseException e) {
            return false;
        }
    }

    private String computeFreeCancelation(String fallback, Integer daysBefore, List<String> futureDates) {
        try {
            return LocalDate.parse(futureDates.get(0).trim()).minusDays(daysBefore).toString();
        } catch (java.time.format.DateTimeParseException e) {
            return fallback;
        }
    }

    private String computeMinPrice(Map<String, String> priceMap) {
        if (priceMap == null || priceMap.isEmpty()) return null;

        return priceMap.entrySet().stream()
                .filter(e -> !e.getKey().equalsIgnoreCase("child"))
                .map(Map.Entry::getValue)
                .filter(Objects::nonNull)
                .filter(s -> {
                    String numeric = s.replaceAll("[^0-9.]", "");
                    if (numeric.isEmpty()) return false;
                    try { Double.parseDouble(numeric); return true; }
                    catch (NumberFormatException e) { return false; }
                })
                .min((a, b) -> {
                    double da = Double.parseDouble(a.replaceAll("[^0-9.]", ""));
                    double db = Double.parseDouble(b.replaceAll("[^0-9.]", ""));
                    return Double.compare(da, db);
                })
                .map(s -> {
                    String numeric = s.replaceAll("[^0-9.]", "");
                    double val = Double.parseDouble(numeric);
                    long rounded = (long) val;
                    return "from $" + rounded;
                })
                .orElse(null);
    }
}
