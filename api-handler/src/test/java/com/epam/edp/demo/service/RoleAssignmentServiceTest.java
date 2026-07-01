package com.epam.edp.demo.service;

import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.repository.TravelAgentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleAssignmentServiceTest {

    @Mock
    private TravelAgentRepository travelAgentRepository;

    @InjectMocks
    private RoleAssignmentService roleAssignmentService;

    @Test
    void assignRole_shouldReturnTravelAgentWhenEmailExists() {
        when(travelAgentRepository.existsByEmail("agent@example.com")).thenReturn(true);

        Role role = roleAssignmentService.assignRole("agent@example.com");

        assertEquals(Role.TRAVEL_AGENT, role);
    }

    @Test
    void assignRole_shouldReturnCustomerWhenEmailDoesNotExist() {
        when(travelAgentRepository.existsByEmail("user@example.com")).thenReturn(false);

        Role role = roleAssignmentService.assignRole("user@example.com");

        assertEquals(Role.CUSTOMER, role);
    }
}