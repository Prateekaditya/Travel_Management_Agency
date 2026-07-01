package com.epam.edp.demo.service;

import com.epam.edp.demo.model.TravelAgent;
import com.epam.edp.demo.repository.TravelAgentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for maintaining the predefined travel-agent email list.
 *
 * <p>The stored emails are used by the role-assignment logic to decide
 * whether a newly registered user should be treated as a travel agent.
 */
@Service
public class TravelAgentService {

    private final TravelAgentRepository repository;

    public TravelAgentService(TravelAgentRepository repository) {
        this.repository = repository;
    }

    /**
     * Validates and stores a new travel-agent email address.
     *
     * <p>The email must match the service-level pattern and must not already
     * exist in the travel-agent list.
     *
     * @param email email address to store
     * @return the persisted travel-agent record
     * @throws IllegalArgumentException if the email format is invalid or already exists
     */
    public TravelAgent addEmail(String email) {
        // Validate email format
        if (!isValidEmail(email)) {
            throw new IllegalArgumentException("Invalid email format");
        }

        // Check if already exists
        if (repository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in travel agent list");
        }

        TravelAgent travelAgentEmail = new TravelAgent();
        travelAgentEmail.setEmail(email);
        return repository.save(travelAgentEmail);
    }

    /**
     * Retrieves all stored travel-agent email records.
     *
     * @return all travel-agent records from the database
     */
    public List<TravelAgent> getAllEmails() {
        return repository.findAll();
    }

    /**
     * Removes a travel-agent record by its MongoDB document ID.
     *
     * @param id document ID of the travel-agent record to remove
     */
    public void removeEmail(String id) {
        repository.deleteById(id);
    }

    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
}