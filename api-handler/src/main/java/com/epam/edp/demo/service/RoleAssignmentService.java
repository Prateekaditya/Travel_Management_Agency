package com.epam.edp.demo.service;

import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.repository.TravelAgentRepository;
import org.springframework.stereotype.Service;

/**
 * Service responsible for determining the automatic role of a user during registration.
 *
 * <p>If the user's email is present in the predefined travel-agent list,
 * the user is assigned the {@code TRAVEL_AGENT} role; otherwise the user
 * receives the default {@code CUSTOMER} role.
 */
@Service
public class RoleAssignmentService {
    private final TravelAgentRepository travelAgentRepository;

    /**
     * Creates a new role-assignment service.
     *
     * @param travelAgentRepository repository used to check the travel-agent email list
     */
    public RoleAssignmentService(TravelAgentRepository travelAgentRepository) {
        this.travelAgentRepository = travelAgentRepository;
    }

    /**
     * Determines the role for a user based on the user's email address.
     *
     * @param email email address to evaluate
     * @return {@code TRAVEL_AGENT} if the email exists in the travel-agent list, otherwise {@code CUSTOMER}
     */
    public Role assignRole(String email) {
        if (travelAgentRepository.existsByEmail(email)) {
            return Role.TRAVEL_AGENT;
        }
        return Role.CUSTOMER;
    }
}
