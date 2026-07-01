# Travel Agency API Handler

A Spring Boot backend for the Travel Agency platform. It powers authentication, tour data, booking workflows, travel-agent and admin operations, and email notifications for a complete travel booking experience.

## Overview

This service exposes a REST API that supports:

- user registration and sign-in
- JWT-based authentication
- tour discovery and detail retrieval
- booking creation and booking change requests
- travel-agent and admin workflows
- email confirmation and password reset flows
- OpenAPI documentation via Swagger UI

## Tech Stack

- Java 17
- Spring Boot 3.4.x
- Spring Web, Validation, and Security
- Spring Data MongoDB
- JWT authentication with JJWT
- RabbitMQ integration
- AWS SES and S3 support
- Maven
- Springdoc OpenAPI

## Project Structure

- src/main/java: application code, controllers, services, repositories, security, and DTOs
- src/main/resources: configuration files such as application.yml
- src/test: unit and integration tests
- docker-compose.yml: local MongoDB container setup

## Prerequisites

Before running the backend, make sure you have:

- Java 17+
- Maven 3.9+
- Docker Desktop (optional, for local MongoDB)
- MongoDB running locally or accessible via URI
- RabbitMQ running if you want the messaging flow enabled

## Local Development

### 1. Start MongoDB

If you do not already have MongoDB available, start it with Docker:

```bash
docker compose up -d mongodb
```

### 2. Configure environment variables

Set the required environment variables before starting the app:

```bash
export MONGO_URI=mongodb://localhost:27017/travel-agency
export MONGODB_DATABASE=travel-agency
export JWT_SECRET=your-strong-secret
export JWT_EXPIRATION_MS=86400000
export FRONTEND_URL=http://localhost:5173
export AWS_REGION=eu-west-1
export SES_FROM_EMAIL=your@email.com
```

Optional AWS settings for S3/SES integration:

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. Run the application

```bash
mvn spring-boot:run
```

The service will start on:

- http://localhost:8080/api/v1

### 4. Explore the API

Swagger UI is available at:

- http://localhost:8080/api/v1/swagger-ui.html

API docs JSON is available at:

- http://localhost:8080/api/v1/v3/api-docs

## Testing

Run the test suite with:

```bash
mvn test
```

## Build

Create a runnable JAR with:

```bash
mvn clean package
```

## Notes

- Sample tour data is seeded into MongoDB during startup.
- The backend is designed to work with the React frontend in the sibling project.
- Environment variables should be set in your shell, CI config, or deployment platform for production use.
