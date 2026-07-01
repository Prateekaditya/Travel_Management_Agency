package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.DestinationListResponseDTO;
import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;

import java.util.List;

public interface TourService {
    TourDetailsDTO getTourById(String id);
    ReviewListResponseDTO getReviewsByTourId(String id, Integer page, Integer pageSize, String sortBy);
    TourListResponseDTO getAvailableTours(Integer page, Integer pageSize, String destination,
                                          String startDate, String endDate,
                                          List<String> duration, List<String> mealPlan, List<String> tourType,
                                          Integer adults, Integer children, String sortBy);
    DestinationListResponseDTO getDestinations(String destinationQuery);
    TourListResponseDTO getToursByAgentId(String agentId, Integer page, Integer pageSize, String sortBy);
    void submitFeedback(String tourId, String userId, double rating, String comment);
    void updateFeedback(String tourId, String userId, double rating, String comment);

}



