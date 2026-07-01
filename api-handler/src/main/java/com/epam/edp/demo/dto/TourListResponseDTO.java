package com.epam.edp.demo.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class TourListResponseDTO {

    @Data
    public static class TourDTO {
        private String id;
        private String name;
        private String destination;
        private String startDate;
        private List<String> startDates;
        private List<String> durations;
        private List<String> mealPlans;
        private String price;
        private Map<String, String> priceMap;
        private Map<String, String> mealSupplementsPerDay;
        private Double rating;
        private Integer reviews;
        private String freeCancelation;
        private List<String> imageUrls;
        private GuestQuantityDTO guestQuantity;
        private String tourType;
        private String travelAgentId;
    }

    @Data
    public static class GuestQuantityDTO {
        private Integer adultsMaxValue;
        private Integer childrenMaxValue;
        private Integer totalMaxVelue;
    }

    private List<TourDTO> tours;
    private Integer page;
    private Integer pageSize;
    private Integer totalPages;
    private Integer totalItems;
    // totalTours: total number of tours in the collection
    private Integer totalTours;
}
