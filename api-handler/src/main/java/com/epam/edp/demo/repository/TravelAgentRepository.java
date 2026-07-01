package com.epam.edp.demo.repository;

import com.epam.edp.demo.model.TravelAgent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TravelAgentRepository extends MongoRepository<TravelAgent, String> {
    boolean existsByEmail(String email);
}