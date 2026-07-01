package com.epam.edp.demo.repository;

import com.epam.edp.demo.entity.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByUserId(String userId);

    long countByTourIdAndDateAndStateNot(String tourId, LocalDate date, String state);

    List<Booking> findByStateIn(List<String> states);
    List<Booking> findByTravelAgentId(String travelAgentId);

    boolean existsByUserIdAndTourIdAndStateIn(String userId, String tourId, List<String> states);
}

