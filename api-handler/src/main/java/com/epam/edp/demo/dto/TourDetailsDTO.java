package com.epam.edp.demo.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class TourDetailsDTO {
    private String id;
    private String name;
    private String destination;
    private Double rating;
    private Integer reviewCount;
    private List<String> imageUrls;
    private String summary;
    private Integer freeCancelationDaysBefore;
    private List<String> durations;
    private String accomodiation;        // matches OpenAPI spec field name
    private String hotelName;
    private String hotelDescription;
    private List<String> mealPlans;
    private Map<String, String> customDetails;
    private List<String> startDates;

    @Data
    public static class GuestQuantityDTO {
        private Integer adultsMaxValue;
        private Integer childrenMaxValue;
        private Integer totalMaxVelue;   // matches OpenAPI spec field name
    }

    private GuestQuantityDTO guestQuantity;
    private Map<String, String> price;
    private Map<String, String> mealSupplementsPerDay;
    private String tourType;
    private String travelAgentId;
}
