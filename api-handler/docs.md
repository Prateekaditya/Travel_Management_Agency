# Travel Agency Backend Documentation

## Overview
The Travel Agency Backend is a Java-based Spring Boot application designed to provide a robust API for a tour management system. It handles tour discovery, details retrieval, reviews, and booking management.

## Tech Stack
- **Language**: Java 21
- **Framework**: Spring Boot 3.4.3
- **Database**: MongoDB
- **Security**: Spring Security with JWT (JSON Web Token)
- **Build Tool**: Maven
- **Utilities**: Lombok, MapStruct (implied by `mapper` package), Jakarta Validation

## Project Structure
The code follows a standard Spring Boot layered architecture:
- `config`: Configuration classes for Security and Web (CORS).
- `controller`: REST API controllers for handling HTTP requests.
- `dto`: Data Transfer Objects for API requests and responses.
- `entity`: MongoDB document mappings (e.g., `Tour`).
- `exception`: Global exception handling and custom exceptions.
- `mapper`: Mapping between entities and DTOs.
- `repository`: Spring Data MongoDB repositories.
- `security`: JWT filter and utility classes for authentication.
- `service`: Business logic layer (Interfaces and Implementations).

## Data Model (MongoDB)

### Tour Entity (`tours` collection)
| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier |
| `name` | String | Tour name |
| `destination` | String | Target destination |
| `tourType` | String | Type of tour (e.g., Adventure, Relax) |
| `rating` | Double | Average rating |
| `reviewCount` | Integer | Total number of reviews |
| `imageUrls` | List<String> | Gallery of tour images |
| `summary` | String | Brief description |
| `startDates` | List<String> | Available departure dates |
| `price` | Map<String, String> | Price details |
| `reviews` | List<Review> | Embedded list of reviews |

## API Endpoints

### Tour Controller (`/api/v1/tours`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/{id}` | Public | Get detailed information for a specific tour. |
| GET | `/{id}/reviews` | Public | Get paginated reviews for a tour. |

### Other Endpoints
- `GET /api/hello`: Simple connectivity check.
- `POST /api/v1/auth/**`: Authentication endpoints (Login/Registration).
- `POST /api/v1/bookings`: Create a new booking (Requires JWT).
- `GET /api/v1/bookings`: Retrieve user bookings (Requires JWT).

## Security Configuration
- **JWT Authentication**: Secured endpoints require a `Bearer` token in the `Authorization` header.
- **CORS**: Configured to allow requests from `http://localhost:5173` and `http://localhost:5174`.
- **Stateless**: Uses `SessionCreationPolicy.STATELESS` since authentication is token-based.

### Review Management
- **Embedded Reviews**: Reviews are stored as an embedded list within the `Tour` document for faster retrieval of tour details and associated feedback.
- **Manual Pagination**: The API handles pagination and sorting for reviews programmatically.
- **Sorting Options**:
    - `RATING_DESC` / `RATING_ASC`
    - `NEWEST` / `OLDEST` (Based on `createdAt` field)

### Pricing Logic
- **String Parsing**: The system handles localized or formatted price strings by extracting numeric values for sorting and comparison purposes.

## Configuration (application.yml)
- **MongoDB**: Connects to `localhost:27017` database `travel_agency_db`.
- **JWT Secret**: Managed via `app.jwt.secret`.

## How to Run
1. Ensure MongoDB is running on port 27017.
2. Navigate to the `api-handler` directory.
3. Run `mvn spring-boot:run`.