# Travel Agency Project

This workspace contains a full-stack travel booking application with a Spring Boot backend and a React frontend.

## Project Structure

- api-handler: backend API service built with Java and Spring Boot
- travel-agency-frontend: frontend application built with React, TypeScript, and Vite

## Backend

The backend provides:

- user authentication and authorization
- tour management and booking APIs
- travel-agent and admin workflows
- email notifications and password reset support
- Swagger/OpenAPI documentation

See [api-handler/Readme.md](api-handler/Readme.md) for backend setup and usage.

## Frontend

The frontend provides:

- tour browsing and detail views
- sign-in and registration flows
- booking management
- role-based dashboard experiences for customers, agents, and admins

See [travel-agency-frontend/README.md](travel-agency-frontend/README.md) for frontend setup and usage.

## Quick Start

### 1. Start the backend

```bash
cd api-handler
mvn spring-boot:run
```

### 2. Start the frontend

```bash
cd travel-agency-frontend
npm install
npm run dev
```

## Technology Summary

- Backend: Java, Spring Boot, Spring Security, MongoDB, JWT
- Frontend: React, TypeScript, Vite, Tailwind CSS

## Notes

Make sure the backend is running before using the frontend, and ensure the frontend API base URL points to the backend service.
