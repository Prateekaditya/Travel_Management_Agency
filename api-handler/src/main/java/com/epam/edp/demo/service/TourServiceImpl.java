package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.DestinationListResponseDTO;
import com.epam.edp.demo.dto.ReviewListResponseDTO;
import com.epam.edp.demo.dto.TourDetailsDTO;
import com.epam.edp.demo.dto.TourListResponseDTO;
import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.exception.DuplicateReviewException;
import com.epam.edp.demo.exception.ResourceNotFoundException;
import com.epam.edp.demo.mapper.TourMapper;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
public class TourServiceImpl implements TourService {

    TourRepository tourRepository;
    TourMapper tourMapper;
    UserRepository userRepository;
    BookingRepository bookingRepository;
    MongoTemplate mongoTemplate;


    @Override
    public TourDetailsDTO getTourById(String id) {
        return tourRepository.findById(id)
                .map(tourMapper::toTourDetailsDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + id));
    }

    @Override
    public ReviewListResponseDTO getReviewsByTourId(String id, Integer page, Integer pageSize, String sortBy) {
        int pg = (page == null || page < 1) ? 1 : page;
        int pgSize = (pageSize == null || pageSize < 1) ? 4 : pageSize;

        Tour tour = tourRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + id));

        List<Tour.Review> allReviews = new ArrayList<>(
                tour.getReviews() != null ? tour.getReviews() : Collections.emptyList());

        // Public endpoint: only show PUBLISHED reviews
        allReviews = allReviews.stream()
                .filter(r -> !"HIDDEN".equalsIgnoreCase(r.getVisibility()))
                .collect(Collectors.toList());

        if ("RATING_DESC".equalsIgnoreCase(sortBy)) {
            allReviews.sort(Comparator.comparingDouble(Tour.Review::getRate).reversed());
        } else if ("RATING_ASC".equalsIgnoreCase(sortBy)) {
            allReviews.sort(Comparator.comparingDouble(Tour.Review::getRate));
        } else if ("OLDEST".equalsIgnoreCase(sortBy)) {
            allReviews.sort(Comparator.comparing(Tour.Review::getCreatedAt));
        } else {
            allReviews.sort(Comparator.comparing(Tour.Review::getCreatedAt).reversed());
        }

        int total = allReviews.size();
        int totalPages = (total == 0) ? 1 : (int) Math.ceil((double) total / pgSize);
        int fromIndex = Math.min((pg - 1) * pgSize, total);
        int toIndex = Math.min(fromIndex + pgSize, total);

        List<ReviewListResponseDTO.ReviewDTO> reviewDTOs = allReviews.subList(fromIndex, toIndex).stream()
                .map(r -> {
                    ReviewListResponseDTO.ReviewDTO dto = new ReviewListResponseDTO.ReviewDTO();
                    dto.setAuthorName(r.getAuthorName());
                    dto.setAuthorImageUrl(r.getAuthorImageUrl());
                    dto.setCreatedAt(r.getCreatedAt());
                    dto.setRate(r.getRate());
                    dto.setReviewContent(r.getReviewContent());
                    return dto;
                })
                .collect(Collectors.toList());

        ReviewListResponseDTO response = new ReviewListResponseDTO();
        response.setReviews(reviewDTOs);
        response.setPage(pg);
        response.setPageSize(pgSize);
        response.setTotalPages(totalPages);
        response.setTotalItems(total);
        return response;
    }

    @Override
    public TourListResponseDTO getAvailableTours(Integer page, Integer pageSize, String destination,
                                                  String startDate, String endDate,
                                                  List<String> duration, List<String> mealPlan, List<String> tourType,
                                                  Integer adults, Integer children, String sortBy) {
        int pg = (page == null || page < 1) ? 1 : page;
        int pgSize = (pageSize == null || pageSize < 1) ? 9 : pageSize;

        // Build MongoDB Criteria for DB-level filtering
        List<Criteria> ands = new ArrayList<>();

        if (destination != null && !destination.trim().isEmpty()
                && !"Any destination".equalsIgnoreCase(destination)
                && destination.trim().length() >= 3) {
            ands.add(Criteria.where("destination").regex(destination.trim(), "i"));
        }
        // tourType: exact match using $in (normalized to uppercase — seeder stores RESORT/HIKE/CRUISE)
        if (tourType != null && !tourType.isEmpty()) {
            List<String> normalizedTypes = tourType.stream()
                    .map(String::toUpperCase)
                    .collect(Collectors.toList());
            ands.add(Criteria.where("tourType").in(normalizedTypes));
        }
        // mealPlan: case-insensitive partial match on mealPlans array (e.g. "BB" matches "Breakfast (BB)")
        if (mealPlan != null && !mealPlan.isEmpty()) {
            ands.add(new Criteria().orOperator(
                mealPlan.stream()
                    .map(mp -> Criteria.where("mealPlans").regex(mp, "i"))
                    .toArray(Criteria[]::new)
            ));
        }
        if (adults != null && adults > 0) {
            ands.add(Criteria.where("guestQuantity.adultsMaxValue").gte(adults));
        }
        if (children != null && children > 0) {
            ands.add(Criteria.where("guestQuantity.childrenMaxValue").gte(children));
        }
        // startDate/endDate: startDates is List<String> in yyyy-MM-dd; lexicographic comparison works
        if (startDate != null && !startDate.trim().isEmpty()) {
            ands.add(Criteria.where("startDates").gte(startDate.trim()));
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            ands.add(Criteria.where("startDates").lte(endDate.trim()));
        }

        Criteria criteria = ands.isEmpty() ? new Criteria()
                : new Criteria().andOperator(ands.toArray(new Criteria[0]));

        long totalTours = tourRepository.count();

        // Duration/price/date sort require in-memory processing after DB filtering.
        boolean needsPriceSort = "PRICE_ASC".equalsIgnoreCase(sortBy) || "PRICE_DESC".equalsIgnoreCase(sortBy);
        boolean needsDateSort = "START_DATE_ASC".equalsIgnoreCase(sortBy) || "START_DATE_DESC".equalsIgnoreCase(sortBy);
        boolean hasDurationFilter = duration != null && !duration.isEmpty();

        if (hasDurationFilter || needsPriceSort || needsDateSort) {
            // Fetch all DB-filtered results; apply filters/sorts in memory
            List<Tour> dbFiltered = new ArrayList<>(mongoTemplate.find(new Query(criteria), Tour.class));

            if (hasDurationFilter) {
                dbFiltered = dbFiltered.stream()
                        .filter(t -> matchesDuration(t, duration))
                        .collect(Collectors.toList());
            }
            if (needsPriceSort) {
                Comparator<Tour> priceComp = Comparator.comparingDouble(this::getMinPrice);
                if ("PRICE_DESC".equalsIgnoreCase(sortBy)) priceComp = priceComp.reversed();
                dbFiltered.sort(priceComp);
            } else if (needsDateSort) {
                // Sort by earliest FUTURE start date (ignore past dates)
                LocalDate today = LocalDate.now();
                Comparator<Tour> dateComp = Comparator.comparing(
                    t -> getEarliestFutureStartDate(t, today));
                if ("START_DATE_DESC".equalsIgnoreCase(sortBy)) dateComp = dateComp.reversed();
                dbFiltered.sort(dateComp);
            } else {
                // Default: rating desc
                dbFiltered.sort(Comparator.comparingDouble(
                    (Tour t) -> t.getRating() != null ? t.getRating() : 0.0).reversed());
            }

            long totalItems = dbFiltered.size();
            int totalPages = (totalItems == 0) ? 1 : (int) Math.ceil((double) totalItems / pgSize);
            int from = Math.min((pg - 1) * pgSize, (int) totalItems);
            int to = Math.min(from + pgSize, (int) totalItems);
            List<TourListResponseDTO.TourDTO> tourDTOs = dbFiltered.subList(from, to).stream()
                    .map(tourMapper::toTourListDTO).collect(Collectors.toList());

            TourListResponseDTO response = new TourListResponseDTO();
            response.setTours(tourDTOs);
            response.setPage(pg);
            response.setPageSize(pgSize);
            response.setTotalPages(totalPages);
            response.setTotalItems((int) totalItems);
            response.setTotalTours((int) totalTours);
            return response;
        }

        // Standard path: count + paginated fetch from DB
        Sort dbSort = buildMongoSort(sortBy);
        Query countQuery = new Query(criteria);
        Query dataQuery = new Query(criteria).with(dbSort).skip((long)(pg - 1) * pgSize).limit(pgSize);

        long totalItems = mongoTemplate.count(countQuery, Tour.class);
        int totalPages = (totalItems == 0) ? 1 : (int) Math.ceil((double) totalItems / pgSize);
        List<Tour> tours = mongoTemplate.find(dataQuery, Tour.class);
        List<TourListResponseDTO.TourDTO> tourDTOs = tours.stream()
                .map(tourMapper::toTourListDTO).collect(Collectors.toList());

        TourListResponseDTO response = new TourListResponseDTO();
        response.setTours(tourDTOs);
        response.setPage(pg);
        response.setPageSize(pgSize);
        response.setTotalPages(totalPages);
        response.setTotalItems((int) totalItems);
        response.setTotalTours((int) totalTours);
        return response;
    }

    @Override
    public DestinationListResponseDTO getDestinations(String destinationQuery) {
        boolean filterActive = destinationQuery != null
                && destinationQuery.trim().length() >= 3;
        String query = filterActive ? destinationQuery.trim().toLowerCase() : null;

        List<String> destinations = tourRepository.findAll().stream()
                .map(Tour::getDestination)
                .filter(Objects::nonNull)
                .filter(d -> !filterActive || d.toLowerCase().contains(query))
                .distinct()
                .collect(Collectors.toList());

        DestinationListResponseDTO response = new DestinationListResponseDTO();
        response.setDestinations(destinations);
        return response;
    }

    @Override
    public TourListResponseDTO getToursByAgentId(String agentId, Integer page, Integer pageSize, String sortBy) {
        List<Tour> tours = tourRepository.findByTravelAgentId(agentId);

        // Sort
        Comparator<Tour> comparator = switch (sortBy == null ? "RATING_DESC" : sortBy) {
            case "RATING_ASC"      -> Comparator.comparingDouble(t -> (t.getRating() == null ? 0.0 : t.getRating()));
            case "PRICE_ASC"       -> Comparator.comparingDouble(t -> minPrice(t));
            case "PRICE_DESC"      -> Comparator.comparingDouble((Tour t) -> minPrice(t)).reversed();
            case "START_DATE_ASC"  -> Comparator.comparing((Tour t) -> getEarliestFutureStartDate(t, LocalDate.now()));
            case "START_DATE_DESC" -> Comparator.comparing((Tour t) -> getEarliestFutureStartDate(t, LocalDate.now())).reversed();
            default                -> Comparator.comparingDouble((Tour t) -> (t.getRating() == null ? 0.0 : t.getRating())).reversed();
        };
        tours = tours.stream().sorted(comparator).collect(Collectors.toList());

        int total = tours.size();
        int totalPages = (int) Math.ceil((double) total / pageSize);
        int fromIndex = Math.min((page - 1) * pageSize, total);
        int toIndex = Math.min(fromIndex + pageSize, total);
        List<Tour> paginated = tours.subList(fromIndex, toIndex);

        TourListResponseDTO response = new TourListResponseDTO();
        response.setTours(paginated.stream().map(tourMapper::toTourListDTO).collect(Collectors.toList()));
        response.setPage(page);
        response.setPageSize(pageSize);
        response.setTotalPages(totalPages);
        response.setTotalItems(total);
        return response;
    }

    private double minPrice(Tour t) {
        if (t.getPrice() == null || t.getPrice().isEmpty()) return Double.MAX_VALUE;
        return t.getPrice().values().stream()
                .filter(Objects::nonNull)
                .mapToDouble(v -> { try { return Double.parseDouble(v.replaceAll("[^0-9.]", "")); } catch (Exception e) { return Double.MAX_VALUE; } })
                .min().orElse(Double.MAX_VALUE);
    }

    
    // matchesDuration: used for in-memory duration filter (durations stored as strings e.g. "7 days")
    private boolean matchesDuration(Tour tour, List<String> durations) {
        if (durations == null || durations.isEmpty()) return true;
        if (tour.getDurations() == null) return false;
        return durations.stream().anyMatch(duration -> matchesSingleDuration(tour, duration));
    }

    private boolean matchesSingleDuration(Tour tour, String duration) {
        if (duration == null || duration.trim().isEmpty()) return true;
        if (tour.getDurations() == null) return false;

        if (duration.endsWith("+") || duration.contains("-")) {
            int lower, upper;
            if (duration.endsWith("+")) {
                lower = Integer.parseInt(duration.replace("+", "").trim());
                upper = Integer.MAX_VALUE;
            } else {
                String[] parts = duration.split("-");
                lower = Integer.parseInt(parts[0].trim());
                upper = Integer.parseInt(parts[1].trim());
            }
            int lo = lower, hi = upper;
            return tour.getDurations().stream().anyMatch(d -> {
                if (d == null) return false;
                String numStr = d.replaceAll("[^0-9]", "").trim();
                if (numStr.isEmpty()) return false;
                try { int num = Integer.parseInt(numStr); return num >= lo && num <= hi; }
                catch (NumberFormatException e) { return false; }
            });
        }
        return tour.getDurations().stream().anyMatch(d -> d != null && d.equalsIgnoreCase(duration));
    }

    private Sort buildMongoSort(String sortBy) {
        if (sortBy == null) return Sort.by(Sort.Direction.DESC, "rating");
        return switch (sortBy.toUpperCase()) {
            case "RATING_ASC" -> Sort.by(Sort.Direction.ASC, "rating");
            // PRICE, START_DATE handled in-memory
            case "PRICE_ASC", "PRICE_DESC", "START_DATE_ASC", "START_DATE_DESC" -> Sort.unsorted();
            default -> Sort.by(Sort.Direction.DESC, "rating");
        };
    }

    /** Returns the earliest future start date (>= today) for a tour, or LocalDate.MAX if none. */
    private LocalDate getEarliestFutureStartDate(Tour tour, LocalDate today) {
        if (tour.getStartDates() == null || tour.getStartDates().isEmpty()) return LocalDate.MAX;
        return tour.getStartDates().stream()
                .filter(Objects::nonNull)
                .map(sd -> { try { return LocalDate.parse(sd.trim()); } catch (Exception e) { return null; } })
                .filter(d -> d != null && !d.isBefore(today))
                .min(Comparator.naturalOrder())
                .orElse(LocalDate.MAX);
    }

    private double getMinPrice(Tour tour) {
        if (tour.getPrice() == null || tour.getPrice().isEmpty()) return Double.MAX_VALUE;
        return tour.getPrice().values().stream()
                .filter(Objects::nonNull)
                .mapToDouble(s -> {
                    try {
                        String numeric = s.replaceAll("[^0-9.]", "");
                        return numeric.isEmpty() ? Double.MAX_VALUE : Double.parseDouble(numeric);
                    } catch (NumberFormatException e) { return Double.MAX_VALUE; }
                })
                .min().orElse(Double.MAX_VALUE);
    }

    @Override
    public void submitFeedback(String tourId, String userId, double rating, String comment) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + tourId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        boolean hasStartedBooking = bookingRepository.existsByUserIdAndTourIdAndStateIn(
                userId, tourId, List.of("STARTED", "FINISHED"));
        if (!hasStartedBooking) {
            throw new IllegalArgumentException("Feedback can only be submitted for tours that are started or finished.");
        }

        if (rating <= 3 && (comment == null || comment.isBlank())) {
            throw new IllegalArgumentException("A comment is required for ratings of 3 stars or below.");
        }

        if (tour.getReviews() != null &&
                tour.getReviews().stream().anyMatch(r -> userId.equals(r.getUserId()))) {
            throw new DuplicateReviewException("You have already submitted a review for this tour");
        }

        Tour.Review review = Tour.Review.builder()
                .userId(userId)
                .authorName(Stream.of(user.getFirstName(), user.getLastName())
                        .filter(s -> s != null && !s.isBlank())
                        .collect(Collectors.joining(" ")))
                .authorImageUrl(null)
                .createdAt(LocalDate.now().toString())
                .rate(rating)
                .reviewContent(comment)
                .visibility("PUBLISHED")
                .flagged(false)
                .build();

        // Auto-flag if comment contains prohibited keywords
        if (comment != null && !comment.isBlank()) {
            String lowerComment = comment.toLowerCase();
            List<String> prohibited = List.of("spam", "fake", "scam", "fraud", "hate",
                    "racist", "sexist", "abuse", "abusive", "offensive", "inappropriate",
                    "refund", "lawsuit", "illegal", "cheat", "cheating");
            String matched = prohibited.stream()
                    .filter(lowerComment::contains)
                    .findFirst()
                    .orElse(null);
            if (matched != null) {
                review.setFlagged(true);
                review.setFlagReason("Auto-flagged: contains prohibited keyword \"" + matched + "\"");
                review.setVisibility("PUBLISHED"); // still published until admin reviews it
            }
        }

        if (tour.getReviews() == null) {
            tour.setReviews(new ArrayList<>());
        }
        tour.getReviews().add(review);

        recalculateRating(tour);
        tourRepository.save(tour);
    }

    @Override
    public void updateFeedback(String tourId, String userId, double rating, String comment) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + tourId));

        boolean hasFinishedBooking = bookingRepository.existsByUserIdAndTourIdAndStateIn(
                userId, tourId, List.of("FINISHED"));
        if (!hasFinishedBooking) {
            throw new IllegalArgumentException("Feedback can only be updated for finished tours.");
        }

        if (rating <= 3 && (comment == null || comment.isBlank())) {
            throw new IllegalArgumentException("A comment is required for ratings of 3 stars or below.");
        }

        if (tour.getReviews() == null) {
            throw new ResourceNotFoundException("No review found for this user on tour: " + tourId);
        }

        Tour.Review existing = tour.getReviews().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No review found for this user on tour: " + tourId));

        existing.setRate(rating);
        existing.setReviewContent(comment);

        recalculateRating(tour);
        tourRepository.save(tour);
    }

    private void recalculateRating(Tour tour) {
        List<Tour.Review> published = tour.getReviews().stream()
                .filter(r -> !"HIDDEN".equalsIgnoreCase(r.getVisibility()))
                .collect(Collectors.toList());
        double avg = published.stream()
                .mapToDouble(Tour.Review::getRate)
                .average()
                .orElse(0.0);
        tour.setRating(Math.round(avg * 10.0) / 10.0);
        tour.setReviewCount(published.size());
    }

}
