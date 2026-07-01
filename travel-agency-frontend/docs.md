# Travel Agency Frontend Documentation

## Overview
The Travel Agency Frontend is a modern, responsive web application built with React and TypeScript. It allows users to browse tours, view detailed information, read reviews, and book travel packages.

## Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Context API
- **Routing**: Custom Context-based Router (RouterContext)
- **HTTP Client**: Native Fetch API (centralized in `api.ts`)

## Project Structure
- `src/assets`: Static assets like images, logos, and Figma exports.
- `src/components`: Reusable UI components (Navbar, Hero, BookingSidebar, etc.).
- `src/context`: Application state and routing logic (Auth, Booking, Router).
- `src/hooks`: Custom React hooks for data fetching and logic (e.g., `useTourDetail`).
- `src/pages`: Main view components (ToursPage, TourDetailPage).
- `src/utils`: Utility functions for formatting and calculations.
- `src/types.ts`: Centralized TypeScript interface definitions.
- `src/api.ts`: API service layer for backend communication.

## Core Features

### Tour Browsing & Filtering
- **Dynamic Search**: Filters tours by destination, duration, meal plan, and guest count.
- **Pagination & Sorting**: Supports server-side pagination and sorting by price or rating.

### Tour Details
- **Rich Content**: Displays tour summaries, hotel descriptions, images, and schedules.
- **Responsive Gallery**: Visual showcase of tour destinations.

### Booking System
- **Real-time Pricing**: Calculates costs based on selected options and guest counts.
- **Authentication**: Integrated booking flow requiring JWT authentication.

### Reviews
- **User Feedback**: Paginated review section with ratings and author information.

## API Integration (`api.ts`)
The frontend communicates with the Spring Boot backend at `http://localhost:8080/api/v1` (configurable via `VITE_API_BASE_URL`).
- `getAvailableTours`: Fetches list of tours with filters.
- `getTourDetails`: Retrieves comprehensive data for a single tour.
- `getTourReviews`: Fetches paginated reviews.
- `postBooking`: Submits booking data with an Authorization header.

## Styling & Design
- **Tailwind CSS**: Utility-first approach for consistent and responsive design.
- **Custom Components**: Bespoke UI elements like `CustomSelect` for a polished user experience.

## Environment Variables
- `VITE_API_BASE_URL`: The base URL for the backend API.

## How to Run
1. Navigate to the `travel-agency-frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```