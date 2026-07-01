package com.epam.edp.demo.config;

import com.epam.edp.demo.entity.Tour;
import com.epam.edp.demo.model.Role;
import com.epam.edp.demo.model.User;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Seeds the database with default users and tours on application startup.
 * Existing records are updated (upserted) rather than duplicated.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSeederConfigFile implements CommandLineRunner {

    // Shared BCrypt hash of "password123" — all seed accounts use this for easy testing
    private static final String DEFAULT_PASSWORD_HASH =
            "$2a$10$WDHziujyXsy9lXQLuwTtHunFPNfaxalzD5e.o8TDZEKeAR8m17smS";

    private static final String AGENT_1_EMAIL = "mohit@gmail.com";
    private static final String AGENT_2_EMAIL = "priya@gmail.com";

    private final TourRepository tourRepository;
    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        seedUsers();           // Step 1 — users must exist before tours reference their IDs
        seedTours();           // Step 2 — seed tours with real agent IDs
        assignAgentsToTours(); // Step 3 — repair/rebalance any tours with stale agent IDs
    }

    // -------------------------------------------------------------------------
    // User seeding
    // -------------------------------------------------------------------------

    private void seedUsers() {
        List<User> seedUsers = buildSeedUsers();

        for (User user : seedUsers) {
            userRepository.findByEmail(user.getEmail()).ifPresentOrElse(
                    existing -> syncPassword(existing, user.getPassword()),
                    () -> createUser(user)
            );
        }
    }

    private void syncPassword(User existing, String newPasswordHash) {
        existing.setPassword(newPasswordHash);
        userRepository.save(existing);
        log.info("Updated password for existing seed user: {} ({})", existing.getEmail(), existing.getRole());
    }

    private void createUser(User user) {
        userRepository.save(user);
        log.info("Seeded new user: {} ({})", user.getEmail(), user.getRole());
    }

    private List<User> buildSeedUsers() {
        return List.of(
                buildUser("Avinaba", "Das",   "avinaba_das@epam.com", Role.CUSTOMER),
                buildUser("Mohit",   "Chaudhary", AGENT_1_EMAIL,      Role.TRAVEL_AGENT),
                buildUser("Priya",   "Sharma",    AGENT_2_EMAIL,      Role.TRAVEL_AGENT),
                buildUser("Lohit",   "Reddy",     "lohit@gmail.com",  Role.ADMIN)
        );
    }

    private User buildUser(String firstName, String lastName, String email, Role role) {
        return User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .password(DEFAULT_PASSWORD_HASH)
                .role(role)
                .build();
    }

    // -------------------------------------------------------------------------
    // Tour seeding
    // -------------------------------------------------------------------------

    private void seedTours() {
        String agentId1 = resolveAgentId(AGENT_1_EMAIL, null);
        String agentId2 = resolveAgentId(AGENT_2_EMAIL, agentId1);

        log.info("Seeding tours — agent1={}, agent2={}", agentId1, agentId2);

        List<Tour> seedTours = buildSeedTours(agentId1, agentId2);

        int created = 0, updated = 0;
        for (Tour seedTour : seedTours) {
            Optional<Tour> existing = tourRepository.findByName(seedTour.getName());
            if (existing.isPresent()) {
                mergeTour(seedTour, existing.get());
                updated++;
            } else {
                tourRepository.save(seedTour);
                created++;
            }
        }
        log.info("Tour seed complete: {} created, {} updated.", created, updated);
    }

    /**
     * Merges a seed tour into an existing DB document, preserving identity,
     * agent assignment, user-submitted reviews, and the recalculated rating.
     */
    private void mergeTour(Tour seedTour, Tour dbTour) {
        seedTour.setId(dbTour.getId()); // preserve MongoDB _id to avoid duplicate documents

        if (isValidAgentId(dbTour.getTravelAgentId())) {
            seedTour.setTravelAgentId(dbTour.getTravelAgentId());
        }

        if (dbTour.getReviews() != null && !dbTour.getReviews().isEmpty()) {
            seedTour.setReviews(dbTour.getReviews());
            seedTour.setRating(dbTour.getRating());
            seedTour.setReviewCount(dbTour.getReviewCount());
        }

        tourRepository.save(seedTour);
    }

    // -------------------------------------------------------------------------
    // Agent assignment / rebalancing
    // -------------------------------------------------------------------------

    /**
     * Repairs tours that have a missing, blank, or unrecognised travelAgentId.
     * Also rebalances tours if all were previously assigned to a single agent
     * but a second agent now exists.
     */
    private void assignAgentsToTours() {
        String agentId1 = resolveAgentId(AGENT_1_EMAIL, null);
        if (agentId1 == null) {
            log.warn("No travel agent found — skipping agent assignment.");
            return;
        }
        String agentId2 = resolveAgentId(AGENT_2_EMAIL, agentId1);

        List<Tour> allTours = tourRepository.findAll();
        boolean secondAgentUnused = isSecondAgentUnused(agentId1, agentId2, allTours);

        List<Tour> toFix = allTours.stream()
                .filter(t -> !isRecognisedAgentId(t.getTravelAgentId(), agentId1, agentId2))
                .toList();

        if (toFix.isEmpty() && !secondAgentUnused) {
            log.info("All tours already have correct travelAgentId — skipping agent assignment.");
            return;
        }

        if (secondAgentUnused) {
            rebalanceToursBetweenAgents(allTours, agentId1, agentId2);
            return;
        }

        assignAgentsRoundRobin(toFix, agentId1, agentId2);
    }

    private void rebalanceToursBetweenAgents(List<Tour> allTours, String agentId1, String agentId2) {
        log.info("Re-balancing tours between agents {} and {}", agentId1, agentId2);
        List<Tour> sorted = allTours.stream()
                .sorted(Comparator.comparing(t -> t.getName() == null ? "" : t.getName()))
                .toList();

        for (int i = 0; i < sorted.size(); i++) {
            sorted.get(i).setTravelAgentId(i % 2 == 0 ? agentId1 : agentId2);
        }
        tourRepository.saveAll(sorted);
        log.info("Re-balanced {} tour(s) across two agents.", sorted.size());
    }

    private void assignAgentsRoundRobin(List<Tour> tours, String agentId1, String agentId2) {
        String[] agents = {agentId1, agentId2};
        for (int i = 0; i < tours.size(); i++) {
            tours.get(i).setTravelAgentId(agents[i % agents.length]);
        }
        tourRepository.saveAll(tours);
        log.info("Fixed travelAgentId on {} tour(s).", tours.size());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String resolveAgentId(String email, String fallback) {
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElse(fallback);
    }

    private boolean isValidAgentId(String agentId) {
        return agentId != null && !agentId.isBlank();
    }

    private boolean isRecognisedAgentId(String agentId, String agentId1, String agentId2) {
        return agentId1.equals(agentId) || agentId2.equals(agentId);
    }

    private boolean isSecondAgentUnused(String agentId1, String agentId2, List<Tour> tours) {
        return agentId2 != null
                && !agentId2.equals(agentId1)
                && tours.stream().noneMatch(t -> agentId2.equals(t.getTravelAgentId()));
    }

    // -------------------------------------------------------------------------
    // Tour data definitions
    // -------------------------------------------------------------------------

    private List<Tour> buildSeedTours(String agentId1, String agentId2) {
        return List.of(
                buildKyotoTour(agentId1),
                buildSerengetiTour(agentId2),
                buildAmalfiTour(agentId1),
                buildMachuPicchuTour(agentId2),
                buildIcelandTour(agentId1),
                buildMoroccoTour(agentId2),
                buildBaliTour(agentId1),
                buildSantoriniTour(agentId2),
                buildPatagoniaTour(agentId1)
        );
    }

    private Tour buildKyotoTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Kyoto Sakura Dreams")
                .destination("Kyoto, Japan")
                .tourType("RESORT")
                .rating(4.9)
                .reviewCount(87)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80",
                        "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80",
                        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80",
                        "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=900&q=80",
                        "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=900&q=80",
                        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80",
                        "https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=900&q=80",
                        "https://images.unsplash.com/photo-1557409518-691ebcd96038?w=900&q=80",
                        "https://images.unsplash.com/photo-1533050487297-09b450131914?w=900&q=80",
                        "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=900&q=80"
                ))
                .summary("Immerse yourself in ancient Japan — wander beneath thousands of torii gates at Fushimi Inari, stroll the Arashiyama bamboo grove, and experience a traditional tea ceremony in a centuries-old machiya townhouse.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-24")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("5-star traditional ryokan in the scenic Arashiyama district with tatami rooms and private onsen.")
                .hotelName("Ryokan Arashiyama Besso")
                .hotelDescription("A historic ryokan nestled in the Arashiyama district with stunning views of the Oi River, private onsen baths, and authentic kaiseki dining.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Japanese",
                        "smallGroup", "Maximum number of participants: 12",
                        "transfer", "Organized transfer from Kansai International Airport."
                ))
                .startDates(List.of("2026-06-03", "2026-07-08", "2026-08-05", "2026-09-09"))
                .price(Map.of("5 days", "1350", "7 days", "1720", "10 days", "2100"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "30", "FB", "50"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(12)
                .reviews(List.of(
                        review("Yuki Tanaka",   "https://i.pravatar.cc/150?img=47", "2026-04-02", 5, "The ryokan was beyond words — waking up to misty river views and a freshly prepared kaiseki breakfast every morning. The guide's knowledge of Shinto history made Fushimi Inari feel like a truly sacred experience."),
                        review("Marco Reyes",   "https://i.pravatar.cc/150?img=32", "2026-03-18", 5, "Perfect group size — never felt rushed or crowded. The tea ceremony was a highlight I'll never forget. Worth every penny for the 10-day option."),
                        review("Sophie Laurent","https://i.pravatar.cc/150?img=5",  "2026-02-27", 4, "Beautifully organized tour. The bamboo grove at dawn was absolutely magical. Docking one star only because the airport transfer was slightly delayed — otherwise flawless.")
                ))
                .build();
    }

    private Tour buildSerengetiTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Serengeti Safari Odyssey")
                .destination("Serengeti, Tanzania")
                .tourType("HIKE")
                .rating(4.8)
                .reviewCount(63)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=900&q=80",
                        "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=900&q=80",
                        "https://images.unsplash.com/photo-1589825743127-df68a0a5f33a?w=900&q=80",
                        "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?w=900&q=80",
                        "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=80",
                        "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=900&q=80",
                        "https://images.unsplash.com/photo-1549366021-9f761d040a94?w=900&q=80"
                ))
                .summary("Witness the Great Migration up close — track the Big Five across vast golden plains, sleep under a canopy of stars in a luxury tented camp, and experience the raw heartbeat of the African wild.")
                .freeCancelationDaysBefore(14)
                .freeCancelationDate("2026-05-20")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("Luxury tented safari camps with en-suite facilities and panoramic savannah views.")
                .hotelName("Serengeti Under Canvas")
                .hotelDescription("An award-winning mobile tented camp that follows the Great Migration, offering gourmet bush dining, guided game drives, and private sundowner experiences.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Swahili",
                        "smallGroup", "Maximum number of participants: 10",
                        "transfer", "Organized transfer from Julius Nyerere International Airport."
                ))
                .startDates(List.of("2026-06-10", "2026-07-15", "2026-08-12", "2026-09-16"))
                .price(Map.of("5 days", "2200", "7 days", "2950", "10 days", "3800"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "45", "FB", "75"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(10)
                .reviews(List.of(
                        review("James Okafor", "https://i.pravatar.cc/150?img=11", "2026-04-10", 5, "Seeing a lion hunt at sunrise from the jeep was something I will never forget for the rest of my life. The guides were extraordinarily knowledgeable and the camp was pure luxury in the middle of nowhere."),
                        review("Clara Müller",  "https://i.pravatar.cc/150?img=9",  "2026-03-22", 5, "We caught the wildebeest crossing on day three — timing was perfect. The full-board option was absolutely worth it; bush dinners under the stars were magical."),
                        review("Ravi Nair",     "https://i.pravatar.cc/150?img=18", "2026-02-14", 4, "Incredible wildlife and an exceptionally comfortable camp. Subtracting one star because the 10-day itinerary had a slightly slow middle stretch, but the first and last days alone justify the trip.")
                ))
                .build();
    }

    private Tour buildAmalfiTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Amalfi Coast Dolce Vita")
                .destination("Amalfi Coast, Italy")
                .tourType("CRUISE")
                .rating(4.7)
                .reviewCount(104)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=900&q=80",
                        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&q=80",
                        "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=900&q=80",
                        "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=900&q=80",
                        "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=900&q=80",
                        "https://images.unsplash.com/photo-1574045390-f1a78564b0a9?w=900&q=80",
                        "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=900&q=80",
                        "https://images.unsplash.com/photo-1605649461784-dc680b45a9b4?w=900&q=80",
                        "https://images.unsplash.com/photo-1612690669207-fed642192c40?w=900&q=80",
                        "https://images.unsplash.com/photo-1570197571499-166b36435e9f?w=900&q=80"
                ))
                .summary("Sail turquoise coves, linger over limoncello in clifftop villages, and discover the sun-drenched charm of Positano, Ravello, and Amalfi on Italy's most glamorous coastline.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-28")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("5-star cliffside boutique hotel in Positano with infinity pool and sea-view terraces.")
                .hotelName("Villa Le Sirene Positano")
                .hotelDescription("A whitewashed clifftop retreat perched above the Tyrrhenian Sea, with private beach access, a Michelin-starred restaurant, and panoramic terrace suites.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Italian",
                        "smallGroup", "Maximum number of participants: 14",
                        "transfer", "Organized transfer from Naples International Airport."
                ))
                .startDates(List.of("2026-06-07", "2026-07-05", "2026-08-02", "2026-09-06"))
                .price(Map.of("5 days", "1600", "7 days", "2100", "10 days", "2750"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "40", "FB", "65"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(14)
                .reviews(List.of(
                        review("Elena Rossi",  "https://i.pravatar.cc/150?img=25", "2026-04-05", 5, "Everything from the private boat trip around Capri to the sunset dinner on the terrace was perfection. Our guide Francesco knew every hidden path and tiny trattoria worth visiting."),
                        review("Tom Hendricks","https://i.pravatar.cc/150?img=52", "2026-03-30", 5, "The villa suite was breathtaking — woke up to the sound of the sea every morning. Highly recommend upgrading to full-board; the dinner menu changes daily and is extraordinary."),
                        review("Ayasha Patel", "https://i.pravatar.cc/150?img=44", "2026-02-20", 4, "Gorgeous scenery and a wonderfully paced itinerary. The coastal roads can be nerve-wracking for anxious passengers, but the views absolutely reward the journey.")
                ))
                .build();
    }

    private Tour buildMachuPicchuTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Machu Picchu & Sacred Valley")
                .destination("Cusco & Machu Picchu, Peru")
                .tourType("HIKE")
                .rating(4.9)
                .reviewCount(91)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=900&q=80",
                        "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=900&q=80",
                        "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=80",
                        "https://images.unsplash.com/photo-1580639696641-a5c8d3a4d8cd?w=900&q=80",
                        "https://images.unsplash.com/photo-1602602026150-8bc7fd4e5e45?w=900&q=80",
                        "https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=900&q=80",
                        "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=900&q=80",
                        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=900&q=80",
                        "https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=900&q=80",
                        "https://images.unsplash.com/photo-1553194587-b010a16f4e6e?w=900&q=80"
                ))
                .summary("Trek the legendary Inca Trail through cloud forest and mountain passes, emerge at the Sun Gate at dawn, and explore the ancient citadel of Machu Picchu with an expert archaeologist guide.")
                .freeCancelationDaysBefore(14)
                .freeCancelationDate("2026-05-22")
                .durations(List.of("7 days", "10 days", "14 days"))
                .accomodiation("Boutique eco-lodge in the Sacred Valley with mountain views and traditional Andean décor.")
                .hotelName("Inkaterra Hacienda Urubamba")
                .hotelDescription("A colonial-style hacienda set on 11 acres of Andean farmland, offering farm-to-table cuisine, guided nature walks, and stunning views of the Sacred Valley.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Spanish, Quechua",
                        "smallGroup", "Maximum number of participants: 12",
                        "transfer", "Organized transfer from Alejandro Velasco Astete International Airport."
                ))
                .startDates(List.of("2026-06-14", "2026-07-19", "2026-08-16", "2026-09-20"))
                .price(Map.of("7 days", "2400", "10 days", "3100", "14 days", "4000"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "35", "FB", "60"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(1).totalMaxVelue(3).build())
                .capacity(12)
                .reviews(List.of(
                        review("Lila Fernandez","https://i.pravatar.cc/150?img=29", "2026-04-18", 5, "Arriving at the Sun Gate as the mist lifted to reveal Machu Picchu below was the single most powerful moment of my life. Our archaeologist guide brought every stone to life with stories."),
                        review("David Chen",    "https://i.pravatar.cc/150?img=61", "2026-03-12", 5, "The acclimatization days in Cusco were perfectly planned — we felt strong on the trail. The eco-lodge in the Sacred Valley far exceeded expectations. Book the 14-day if you can."),
                        review("Nora Walsh",    "https://i.pravatar.cc/150?img=16", "2026-02-09", 4, "Phenomenal experience overall. The Inca Trail is genuinely challenging — come physically prepared. The hacienda dinners made the tough days absolutely worth pushing through.")
                ))
                .build();
    }

    private Tour buildIcelandTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Iceland Northern Lights Escape")
                .destination("Reykjavik & Golden Circle, Iceland")
                .tourType("RESORT")
                .rating(4.8)
                .reviewCount(76)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=900&q=80",
                        "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=900&q=80",
                        "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=900&q=80",
                        "https://images.unsplash.com/photo-1520637836862-4d197d17c5a4?w=900&q=80",
                        "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=900&q=80",
                        "https://images.unsplash.com/photo-1550159930-40066082a4fc?w=900&q=80",
                        "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=900&q=80",
                        "https://images.unsplash.com/photo-1617275249641-322ed29db98a?w=900&q=80",
                        "https://images.unsplash.com/photo-1491472885939-b952e14d4a59?w=900&q=80",
                        "https://images.unsplash.com/photo-1605459535-a3d8f1fde0da?w=900&q=80"
                ))
                .summary("Chase the aurora borealis across Iceland's volcanic landscapes, soak in steaming hot springs beneath starlit skies, and explore glaciers, geysers, and thundering waterfalls on the legendary Ring Road.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-26")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("4-star glass-roofed aurora cabin outside Reykjavik for optimal northern lights viewing.")
                .hotelName("Borealis Glass Lodges")
                .hotelDescription("Secluded glass-roofed cabins set in the lava fields south of Reykjavik, designed for unobstructed aurora viewing from the comfort of your bed, with geothermal hot tubs and Nordic spa.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Icelandic",
                        "smallGroup", "Maximum number of participants: 10",
                        "transfer", "Organized transfer from Keflavík International Airport."
                ))
                .startDates(List.of("2026-09-20", "2026-10-11", "2026-11-08", "2026-12-06"))
                .price(Map.of("5 days", "1900", "7 days", "2500", "10 days", "3300"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "50"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(1).totalMaxVelue(3).build())
                .capacity(10)
                .reviews(List.of(
                        review("Ingrid Svensson","https://i.pravatar.cc/150?img=38", "2026-01-28", 5, "We saw the aurora on three out of five nights — the guide tracked forecasts obsessively and drove us to the darkest spots. Waking up in the glass cabin to green ribbons overhead was surreal."),
                        review("Paul Kruger",    "https://i.pravatar.cc/150?img=67", "2025-12-14", 5, "The glacier hike on day four was the highlight — crampons on, ice all around you. Pair that with a private hot tub session under the Milky Way and you have a perfect trip."),
                        review("Mei Lin",        "https://i.pravatar.cc/150?img=56", "2025-11-30", 4, "Outstanding experience. Iceland in winter is raw and beautiful in equal measure. The 5-day option felt slightly rushed; I would go for 7 days if I could do it again.")
                ))
                .build();
    }

    private Tour buildMoroccoTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Moroccan Imperial Cities")
                .destination("Marrakech, Fez & Sahara, Morocco")
                .tourType("CRUISE")
                .rating(4.7)
                .reviewCount(58)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=900&q=80",
                        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=900&q=80",
                        "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=900&q=80",
                        "https://images.unsplash.com/photo-1562408590-e32931084e23?w=900&q=80",
                        "https://images.unsplash.com/photo-1590073844006-33379778ae09?w=900&q=80",
                        "https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=900&q=80",
                        "https://images.unsplash.com/photo-1553851905-c51bb92cb21b?w=900&q=80",
                        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80",
                        "https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?w=900&q=80",
                        "https://images.unsplash.com/photo-1529520426590-8ee2a40a3fe2?w=900&q=80"
                ))
                .summary("Journey through labyrinthine medinas, vivid souks, and ancient madrasas, then spend a night beneath the Saharan stars in a luxury desert camp among the golden dunes of Merzouga.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-25")
                .durations(List.of("7 days", "10 days", "14 days"))
                .accomodiation("Boutique riad in Marrakech and luxury desert camp in Merzouga with traditional Berber furnishings.")
                .hotelName("Riad Jnan Tamsna & Merzouga Desert Camp")
                .hotelDescription("A lush garden riad in the heart of Marrakech's medina, paired with a luxury Berber desert camp offering camel treks, stargazing sessions, and traditional music evenings.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, French, Arabic, Berber",
                        "smallGroup", "Maximum number of participants: 12",
                        "transfer", "Organized transfer from Marrakech Menara Airport."
                ))
                .startDates(List.of("2026-06-21", "2026-07-26", "2026-09-13", "2026-10-18"))
                .price(Map.of("7 days", "1850", "10 days", "2400", "14 days", "3100"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "35", "FB", "55"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(12)
                .reviews(List.of(
                        review("Amara Diallo","https://i.pravatar.cc/150?img=23", "2026-04-07", 5, "Sleeping in the Sahara was unlike anything I've experienced. No light pollution, camel ride at sunset, and a Gnawa music session by the fire — I left a piece of my heart in those dunes."),
                        review("Stefan Novak","https://i.pravatar.cc/150?img=72", "2026-03-02", 5, "The tanneries in Fez seen from the rooftop terrace were straight out of National Geographic. Our guide navigated the medina maze flawlessly and got us into a leather workshop most tourists never see."),
                        review("Grace Osei",  "https://i.pravatar.cc/150?img=41", "2026-02-16", 4, "Incredibly rich itinerary — almost too rich. We barely had time to absorb Fez before moving on. The riad in Marrakech, however, was a sanctuary I could have stayed in for a week.")
                ))
                .build();
    }

    private Tour buildBaliTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Bali Spiritual & Wellness Journey")
                .destination("Ubud & Uluwatu, Bali, Indonesia")
                .tourType("RESORT")
                .rating(4.8)
                .reviewCount(112)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80",
                        "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&q=80",
                        "https://images.unsplash.com/photo-1554481923-a6918bd997bc?w=900&q=80",
                        "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=900&q=80",
                        "https://images.unsplash.com/photo-1611647832580-377268dba7cb?w=900&q=80",
                        "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=900&q=80",
                        "https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80",
                        "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=900&q=80",
                        "https://images.unsplash.com/photo-1534008897995-27a23e859048?w=900&q=80",
                        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80"
                ))
                .summary("Reset mind, body, and spirit — practise sunrise yoga in the jungle, bathe in sacred water temple pools, learn the art of Balinese cooking, and watch Kecak fire dancers perform at clifftop Uluwatu.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-30")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("5-star jungle retreat in Ubud with private plunge pool villas and world-class spa.")
                .hotelName("COMO Uma Ubud")
                .hotelDescription("A serene hillside retreat nestled in the Tjampuhan ridge jungle, featuring infinity-edge pool villas, an award-winning COMO Shambhala spa, and daily wellness programming.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Balinese, Indonesian",
                        "smallGroup", "Maximum number of participants: 10",
                        "transfer", "Organized transfer from Ngurah Rai International Airport."
                ))
                .startDates(List.of("2026-06-17", "2026-07-22", "2026-08-19", "2026-09-23"))
                .price(Map.of("5 days", "1450", "7 days", "1900", "10 days", "2500"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "30", "FB", "50"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(10)
                .reviews(List.of(
                        review("Hana Kobayashi",  "https://i.pravatar.cc/150?img=49", "2026-04-14", 5, "The water purification ritual at Tirta Empul temple was profoundly moving. I'm not particularly spiritual but came away genuinely transformed. The spa treatments are on another level entirely."),
                        review("Ben Carter",       "https://i.pravatar.cc/150?img=59", "2026-03-25", 5, "I came skeptical about the 'wellness' angle and left as a full convert. Jungle yoga at 6am, cooking class at noon, Uluwatu sunset at dusk — every day felt like the best day of my life."),
                        review("Fatima Al-Rashid", "https://i.pravatar.cc/150?img=33", "2026-02-28", 4, "Ubud is magical and the villa exceeded every expectation. One star off only because the cooking class was slightly oversold for intermediate cooks — still delicious, just less of a challenge.")
                ))
                .build();
    }

    private Tour buildSantoriniTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Santorini Sunset & Aegean Cruise")
                .destination("Santorini & Mykonos, Greece")
                .tourType("CRUISE")
                .rating(4.9)
                .reviewCount(138)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80",
                        "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=900&q=80",
                        "https://images.unsplash.com/photo-1601581975053-7c199b727c8e?w=900&q=80",
                        "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&q=80",
                        "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=900&q=80",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
                        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&q=80",
                        "https://images.unsplash.com/photo-1602610628022-86440dbbd7be?w=900&q=80",
                        "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=900&q=80",
                        "https://images.unsplash.com/photo-1548625519-720459e0e5e0?w=900&q=80"
                ))
                .summary("Drift between volcanic islands on a private yacht, sip crisp Assyrtiko wine in Oia's iconic blue-domed villages, and swim in the electric-blue Aegean caldera below one of Earth's most romantic sunsets.")
                .freeCancelationDaysBefore(10)
                .freeCancelationDate("2026-05-27")
                .durations(List.of("5 days", "7 days", "10 days"))
                .accomodiation("5-star caldera-view cave hotel in Oia with private infinity plunge pool and butler service.")
                .hotelName("Canaves Oia Suites")
                .hotelDescription("Iconic cave suites carved into the caldera cliffs of Oia, featuring private terraces, bespoke butler service, and direct access to Oia's most celebrated sunset panorama.")
                .mealPlans(List.of("Breakfast (BB)", "Half-board (HB)", "Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Greek",
                        "smallGroup", "Maximum number of participants: 14",
                        "transfer", "Organized transfer from Santorini International Airport."
                ))
                .startDates(List.of("2026-06-06", "2026-07-11", "2026-08-08", "2026-09-05"))
                .price(Map.of("5 days", "1750", "7 days", "2350", "10 days", "3000"))
                .mealSupplementsPerDay(Map.of("BB", "0", "HB", "45", "FB", "70"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(2).totalMaxVelue(4).build())
                .capacity(14)
                .reviews(List.of(
                        review("Isabelle Moreau","https://i.pravatar.cc/150?img=13", "2026-04-22", 5, "Watching the Oia sunset from our private plunge pool with a glass of local wine in hand — I genuinely could not believe that moment was real. The private catamaran day to the volcanic hot springs was equally unforgettable."),
                        review("Lucas Oliveira", "https://i.pravatar.cc/150?img=77", "2026-03-09", 5, "The 10-day option gives you enough time to breathe. Mykonos was a vibrant contrast to the serene romance of Santorini. The cave suite was the most beautiful room I have ever stayed in."),
                        review("Priya Sharma",   "https://i.pravatar.cc/150?img=21", "2026-02-11", 5, "From the airport greeting to the farewell dinner, every detail was thoughtfully arranged. The local food tour on day two was an unexpected highlight — the guide knew every chef personally.")
                ))
                .build();
    }

    private Tour buildPatagoniaTour(String agentId) {
        return Tour.builder()
                .travelAgentId(agentId)
                .name("Patagonia End of the World Trek")
                .destination("Torres del Paine, Chile & Patagonia, Argentina")
                .tourType("HIKE")
                .rating(4.9)
                .reviewCount(44)
                .imageUrls(List.of(
                        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80",
                        "https://images.unsplash.com/photo-1531761535209-180857e963b9?w=900&q=80",
                        "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&q=80",
                        "https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=900&q=80",
                        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
                        "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=900&q=80",
                        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80",
                        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80",
                        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80",
                        "https://images.unsplash.com/photo-1485470733090-0aae1788d5af?w=900&q=80"
                ))
                .summary("Conquer the iconic W-Trek through Torres del Paine, kayak beside glowing glaciers on the Perito Moreno icefields, and experience the wild solitude of the world's last great wilderness at the bottom of the Earth.")
                .freeCancelationDaysBefore(21)
                .freeCancelationDate("2026-05-15")
                .durations(List.of("10 days", "14 days"))
                .accomodiation("Eco-lodge mountain camps along the W-Trek route with panoramic views of the Torres granite towers.")
                .hotelName("EcoCamp Patagonia")
                .hotelDescription("The world's first geodesic dome hotel, positioned inside Torres del Paine National Park, offering astronomy domes, guided treks with expert naturalists, and sustainable gourmet dining.")
                .mealPlans(List.of("Full-board (FB)"))
                .customDetails(Map.of(
                        "tourGuide", "English, Spanish",
                        "smallGroup", "Maximum number of participants: 8",
                        "transfer", "Organized transfer from Punta Arenas International Airport."
                ))
                .startDates(List.of("2026-11-08", "2026-12-06", "2027-01-10", "2027-02-07"))
                .price(Map.of("10 days", "4200", "14 days", "5500"))
                .mealSupplementsPerDay(Map.of("FB", "0"))
                .guestQuantity(Tour.GuestQuantity.builder().adultsMaxValue(2).childrenMaxValue(0).totalMaxVelue(2).build())
                .capacity(8)
                .reviews(List.of(
                        review("Oliver Hansen",   "https://i.pravatar.cc/150?img=64", "2026-02-05", 5, "The moment the clouds parted and the three granite towers emerged above us after two days of wind and rain — I broke down in tears. No photo prepares you for it. The most physically and emotionally intense trip of my life."),
                        review("Valentina Cruz",  "https://i.pravatar.cc/150?img=36", "2025-12-20", 5, "Kayaking beside Perito Moreno as chunks of ice thundered into the water around us was terrifying and magnificent. The geodesic domes at EcoCamp are surprisingly cozy and warm after a long day on the trail."),
                        review("Sam Whitfield",   "https://i.pravatar.cc/150?img=53", "2025-11-18", 5, "Come fully fit — this is not a leisure tour. But if you put in the work, EcoCamp's guides will reward you with experiences that simply don't exist anywhere else on the planet. The 14-day option is the definitive version.")
                ))
                .build();
    }

    private Tour.Review review(String author, String avatarUrl, String date, int rating, String content) {
        return Tour.Review.builder()
                .authorName(author)
                .authorImageUrl(avatarUrl)
                .createdAt(date)
                .rate(rating)
                .reviewContent(content)
                .build();
    }
}

