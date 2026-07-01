package com.epam.edp.demo;

import com.epam.edp.demo.controller.TourController;
import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.service.TourService;
import com.epam.edp.demo.security.JwtAuthenticationFilter;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import org.springframework.security.test.context.support.WithMockUser;

import com.epam.edp.demo.exception.DuplicateReviewException;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = TourController.class, excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class})
@AutoConfigureMockMvc(addFilters = false)
public class TourControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TourService tourService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthFilter;

    @Test
    public void getTourById_Success() throws Exception {
        TourDetailsDTO dto = new TourDetailsDTO();
        dto.setId("123");
        dto.setName("Test Tour");

        String tourId = "550e8400-e29b-41d4-a716-446655440000";
        dto.setId(tourId);
        when(tourService.getTourById(tourId)).thenReturn(dto);

        mockMvc.perform(get("/tours/" + tourId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(tourId))
                .andExpect(jsonPath("$.name").value("Test Tour"));
    }

    @Test
    public void getTourById_NotFound() throws Exception {
        String missingId = "550e8400-e29b-41d4-a716-446655440001";
        when(tourService.getTourById(missingId)).thenThrow(new ResourceNotFoundException("Not found"));

        mockMvc.perform(get("/tours/" + missingId))
                .andExpect(status().isNotFound());
    }

    @Test
    public void getReviewsByTourId_Success() throws Exception {
        ReviewListResponseDTO response = new ReviewListResponseDTO();
        response.setReviews(Collections.emptyList());
        response.setPage(1);
        response.setPageSize(4);
        response.setTotalItems(0);
        response.setTotalPages(1);

        String tourId = "550e8400-e29b-41d4-a716-446655440000";
        when(tourService.getReviewsByTourId(eq(tourId), anyInt(), anyInt(), anyString()))
                .thenReturn(response);

        mockMvc.perform(get("/tours/" + tourId + "/reviews")
                        .param("page", "1")
                        .param("pageSize", "4")
                        .param("sortBy", "RATING_DESC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(4));
    }

    // ─── POST /tours/{id}/feedbacks ──────────────────────────────────────────────

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_validRequest_returns201() throws Exception {
        doNothing().when(tourService).submitFeedback(eq("tour-1"), eq("user-1"), eq(5.0), eq("Amazing!"));

        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 5, \"comment\": \"Amazing!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Your feedback has been submitted."));
    }

    @Test
    public void submitFeedback_noAuthHeader_returns401() throws Exception {
        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 5, \"comment\": \"Amazing!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void submitFeedback_invalidToken_returns401() throws Exception {
        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 5, \"comment\": \"Amazing!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_missingRating_returns400() throws Exception {
        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\": \"No rating here\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_ratingBelowMin_returns400() throws Exception {
        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 0, \"comment\": \"Bad rating\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_ratingAboveMax_returns400() throws Exception {
        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 6, \"comment\": \"Too high\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_nullComment_returns201() throws Exception {
        doNothing().when(tourService).submitFeedback(eq("tour-1"), eq("user-1"), eq(4.0), isNull());

        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 4}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_tourNotFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Tour not found with id: bad-tour"))
                .when(tourService).submitFeedback(eq("bad-tour"), eq("user-1"), anyDouble(), any());

        mockMvc.perform(post("/tours/bad-tour/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 3, \"comment\": \"Hmm\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void submitFeedback_duplicateReview_returns409() throws Exception {
        doThrow(new DuplicateReviewException("You have already submitted a review for this tour"))
                .when(tourService).submitFeedback(eq("tour-1"), eq("user-1"), anyDouble(), any());

        mockMvc.perform(post("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 4, \"comment\": \"Again\"}"))
                .andExpect(status().isConflict());
    }

    // ─── PATCH /tours/{id}/feedbacks ─────────────────────────────────────────────

    @Test
    @WithMockUser(username = "user-1")
    public void updateFeedback_validRequest_returns200() throws Exception {
        doNothing().when(tourService).updateFeedback(eq("tour-1"), eq("user-1"), eq(3.0), eq("Updated!"));

        mockMvc.perform(patch("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 3, \"comment\": \"Updated!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Your feedback has been updated."));
    }

    @Test
    public void updateFeedback_noAuth_returns401() throws Exception {
        mockMvc.perform(patch("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 3, \"comment\": \"Updated!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void updateFeedback_tourNotFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Tour not found with id: bad-tour"))
                .when(tourService).updateFeedback(eq("bad-tour"), eq("user-1"), anyDouble(), any());

        mockMvc.perform(patch("/tours/bad-tour/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 3, \"comment\": \"Hmm\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void updateFeedback_noExistingReview_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("No review found for this user on tour: tour-1"))
                .when(tourService).updateFeedback(eq("tour-1"), eq("user-1"), anyDouble(), any());

        mockMvc.perform(patch("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 3, \"comment\": \"Hmm\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "user-1")
    public void updateFeedback_invalidRating_returns400() throws Exception {
        mockMvc.perform(patch("/tours/tour-1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 0, \"comment\": \"Bad\"}"))
                .andExpect(status().isBadRequest());
    }

    // ─── GET /tours/available validation (TC-API-TOURS-011/012/015) ──────────────

    @Test
    public void getAvailableTours_validParams_returns200() throws Exception {
        TourListResponseDTO response = new TourListResponseDTO();
        response.setTours(Collections.emptyList());
        response.setPage(1);
        response.setPageSize(6);
        response.setTotalPages(1);
        response.setTotalItems(0);
        response.setTotalTours(9);
        when(tourService.getAvailableTours(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(response);

        mockMvc.perform(get("/tours/available")
                        .param("page", "1")
                        .param("pageSize", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalTours").value(9));
    }

    @Test
    public void getAvailableTours_invalidMealPlan_returns400() throws Exception {
        // TC-API-TOURS-011: mealPlan=INVALID should return 400
        mockMvc.perform(get("/tours/available")
                        .param("mealPlan", "INVALID"))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getAvailableTours_invalidTourType_returns400() throws Exception {
        // TC-API-TOURS-012: tourType=BOAT should return 400
        mockMvc.perform(get("/tours/available")
                        .param("tourType", "BOAT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getAvailableTours_invalidStartDateFormat_returns400() throws Exception {
        // TC-API-TOURS-015: startDate=15-01-2025 (dd-MM-yyyy) should return 400
        mockMvc.perform(get("/tours/available")
                        .param("startDate", "15-01-2025"))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getAvailableTours_invalidDestinationFormat_returns400() throws Exception {
        mockMvc.perform(get("/tours/available")
                        .param("destination", "Kyoto123!"))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getTourById_invalidUuidFormat_returns400() throws Exception {
        mockMvc.perform(get("/tours/not-a-uuid"))
                .andExpect(status().isBadRequest());
    }
}
