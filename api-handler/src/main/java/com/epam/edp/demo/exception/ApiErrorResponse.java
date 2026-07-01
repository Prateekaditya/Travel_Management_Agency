package com.epam.edp.demo.exception;

import java.time.Instant;
import java.util.List;

/**
 * Standardized API error response payload returned for all error conditions.
 * Provides a consistent JSON structure for frontend error handling.
 */
public class ApiErrorResponse {

    private final Instant timestamp;
    private final int status;
    private final String error;
    private final List<String> details;

    /**
     * Constructs an API error response.
     *
     * @param timestamp the time the error occurred
     * @param status    the HTTP status code
     * @param error     a short error category label
     * @param details   a list of human-readable detail messages
     */
    public ApiErrorResponse(Instant timestamp, int status, String error, List<String> details) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.details = details;
    }

    /**
     * Returns the timestamp when the error occurred.
     *
     * @return the error timestamp
     */
    public Instant getTimestamp() {
        return timestamp;
    }

    /**
     * Returns the HTTP status code.
     *
     * @return the status code
     */
    public int getStatus() {
        return status;
    }

    /**
     * Returns the short error category label.
     *
     * @return the error label
     */
    public String getError() {
        return error;
    }

    /**
     * Returns the list of detailed error messages.
     *
     * @return the error details
     */
    public List<String> getDetails() {
        return details;
    }
}
