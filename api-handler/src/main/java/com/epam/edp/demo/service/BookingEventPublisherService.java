package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.BookingStateChangedEvent;
import com.epam.edp.demo.entity.Booking;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingEventPublisherService {

    private final RabbitTemplate rabbitTemplate;
    private final TourRepository tourRepository;
    private final UserRepository userRepository;

    @Value("${rabbitmq.exchange}")
    private String exchange;

    @Value("${rabbitmq.routing-key}")
    private String routingKey;

    public void publishBookingStateChanged(Booking booking, String newState, String previousState) {
        try {
            Tour tour = tourRepository.findById(booking.getTourId()).orElse(null);
            String tourName = tour != null ? tour.getName() : "";
            String destination = tour != null ? tour.getDestination() : "";
            int adults = booking.getGuests() != null ? booking.getGuests().getAdult() : 1;
            String totalPrice = tour != null ? resolveTotalPrice(tour, booking.getDuration(), booking.getMealPlan(), adults) : "";

            String agentName = "";
            String agentEmail = "";
            if (booking.getTravelAgentId() != null) {
                User agent = userRepository.findById(booking.getTravelAgentId()).orElse(null);
                if (agent != null) {
                    agentName = ((agent.getFirstName() != null ? agent.getFirstName() : "") + " "
                            + (agent.getLastName() != null ? agent.getLastName() : "")).trim();
                    agentEmail = agent.getEmail() != null ? agent.getEmail() : "";
                }
            }

            int guestCount = 0;
            if (booking.getGuests() != null) {
                guestCount = booking.getGuests().getAdult() + booking.getGuests().getChildren();
            }

            BookingStateChangedEvent event = BookingStateChangedEvent.builder()
                    .bookingId(booking.getId())
                    .tourId(booking.getTourId())
                    .tourName(tourName)
                    .destination(destination)
                    .agentId(booking.getTravelAgentId())
                    .agentName(agentName)
                    .agentEmail(agentEmail)
                    .userId(booking.getUserId())
                    .newState(newState)
                    .previousState(previousState)
                    .eventTimestamp(LocalDateTime.now())
                    .totalPrice(totalPrice)
                    .duration(booking.getDuration())
                    .mealPlan(booking.getMealPlan())
                    .guestCount(guestCount)
                    .build();

            rabbitTemplate.convertAndSend(exchange, routingKey, event);
            log.info("Published BookingStateChangedEvent: bookingId={}, {} -> {}", booking.getId(), previousState, newState);
        } catch (Exception e) {
            log.error("Failed to publish BookingStateChangedEvent for bookingId={}: {}", booking.getId(), e.getMessage(), e);
        }
    }

    private String resolveTotalPrice(Tour tour, String duration, String mealPlanCode, int adults) {
        if (tour.getPrice() == null || tour.getPrice().isEmpty()) return "";
        Map<String, String> p = tour.getPrice();
        String raw = p.containsKey(duration) ? p.get(duration)
                : p.containsKey(mealPlanCode) ? p.get(mealPlanCode)
                : p.values().stream().filter(v -> v != null && !v.isBlank()).findFirst().orElse(null);
        if (raw == null) return "";
        String numeric = raw.trim().replace("$", "").replace(",", "").trim();
        try {
            long perPerson = (long) Double.parseDouble(numeric);
            long total = perPerson * Math.max(1, adults);
            return "$" + String.format("%,d", total);
        } catch (NumberFormatException e) {
            return raw;
        }
    }
}
