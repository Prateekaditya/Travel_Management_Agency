package com.epam.edp.demo.dto;

/**
 * Data Transfer Object returned after a successful user registration.
 * Contains a confirmation message and the route the client should navigate to next.
 */
public class RegisterUserResponse {

    private final String message;

    private final String nextRoute;

    /**
     * Constructs a registration response.
     *
     * @param message   the human-readable success message
     * @param nextRoute the frontend route to redirect to (e.g., {@code "/sign-in"})
     */
    public RegisterUserResponse(String message, String nextRoute) {
        this.message = message;
        this.nextRoute = nextRoute;
    }

    /**
     * Returns the confirmation message.
     *
     * @return the success message
     */
    public String getMessage() {
        return message;
    }

    /**
     * Returns the recommended next route for the client.
     *
     * @return the redirect route path
     */
    public String getNextRoute() {
        return nextRoute;
    }
}
