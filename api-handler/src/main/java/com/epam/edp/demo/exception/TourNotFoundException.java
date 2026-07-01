package com.epam.edp.demo.exception;

public class TourNotFoundException extends RuntimeException {
    public TourNotFoundException(String tourId) {
        super("Tour not found with id: " + tourId);
    }
}

