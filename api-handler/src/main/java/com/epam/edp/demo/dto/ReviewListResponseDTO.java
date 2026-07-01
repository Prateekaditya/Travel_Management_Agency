package com.epam.edp.demo.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReviewListResponseDTO {
    @Data
    public static class ReviewDTO {
        private String authorName;
        private String authorImageUrl;
        private String createdAt;
        private Double rate;
        private String reviewContent;
    }

    private List<ReviewDTO> reviews;
    private Integer page;
    private Integer pageSize;
    private Integer totalPages;
    private Integer totalItems;
}
