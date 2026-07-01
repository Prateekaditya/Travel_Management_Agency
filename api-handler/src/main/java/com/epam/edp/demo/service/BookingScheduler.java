package com.epam.edp.demo.service;

import com.epam.edp.demo.entity.Booking;
import com.epam.edp.demo.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final BookingEventPublisherService bookingEventPublisher;

    /**
     * Runs every day at midnight.
     * BOOKED/CONFIRMED → STARTED (when tour start date arrives)
     * STARTED → FINISHED (when tour end date has passed)
     */
    @Scheduled(cron = "0 0 0 * * *")  // every day at midnight
    public void updateBookingStates() {
        log.info("Running booking state scheduler...");

        LocalDate today = LocalDate.now();

        List<Booking> activeBookings = bookingRepository
                .findByStateIn(List.of("BOOKED", "CONFIRMED", "STARTED"));

        for (Booking booking : activeBookings) {
            LocalDate startDate = booking.getDate();
            LocalDate endDate = calculateEndDate(startDate, booking.getDuration());

            if ("BOOKED".equals(booking.getState()) || "CONFIRMED".equals(booking.getState())) {
                // Start date has arrived → mark as STARTED
                if (!today.isBefore(startDate)) {
                    String prevState = booking.getState();
                    booking.setState("STARTED");
                    bookingRepository.save(booking);
                    bookingEventPublisher.publishBookingStateChanged(booking, "STARTED", prevState);
                    log.info("Booking {} marked as STARTED", booking.getId());
                }
            } else if ("STARTED".equals(booking.getState())) {
                // End date has arrived → mark as FINISHED
                if (!today.isBefore(endDate)) {
                    booking.setState("FINISHED");
                    bookingRepository.save(booking);
                    bookingEventPublisher.publishBookingStateChanged(booking, "FINISHED", "STARTED");
                    log.info("Booking {} marked as FINISHED", booking.getId());
                }
            }
        }

        log.info("Booking state scheduler completed.");
    }

    /**
     * Parses duration like "7 days", "14 days" → adds to start date
     */
    private LocalDate calculateEndDate(LocalDate startDate, String duration) {
        try {
            // duration format: "7 days" or "14 days"
            int days = Integer.parseInt(duration.trim().split(" ")[0]);
            return startDate.plusDays(days);
        } catch (Exception e) {
            log.warn("Could not parse duration '{}', defaulting to 7 days", duration);
            return startDate.plusDays(7);
        }
    }
}
