package com.epam.edp.demo.repository;

import com.epam.edp.demo.entity.Tour;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TourRepository extends MongoRepository<Tour, String> {
    List<Tour> findByTravelAgentId(String travelAgentId);
    Optional<Tour> findByName(String name);
}

