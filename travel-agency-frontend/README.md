# Travel Agency Frontend

A modern React and TypeScript frontend for the Travel Agency platform. It provides a polished experience for browsing tours, viewing detailed itineraries, signing in, and completing bookings.

## Overview

This application allows users to:

- browse available tours
- view tour details and reviews
- sign up or sign in
- create and manage bookings
- manage profile and booking change requests
- access role-based views for customers, travel agents, and admins

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Context API for auth and booking state

## Project Structure

- src/components: reusable UI building blocks
- src/context: authentication, booking, and routing state
- src/pages: route-level screens such as tours, detail view, profile, and admin pages
- src/features: feature-based modules for tours and related flows
- src/api: API client functions for backend communication
- src/types: shared TypeScript types

## Prerequisites

Make sure you have:

- Node.js 18+
- npm 9+

## Installation

From the project folder, install dependencies:

```bash
npm install
```

## Environment Configuration

Create a .env file in the frontend project root if needed:

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_REGISTER_ENDPOINT=/auth/sign-up
```

## Development Server

Start the app locally:

```bash
npm run dev
```

Then open the local URL shown by Vite in your browser.

## Production Build

Build the app for production:

```bash
npm run build
```

The production bundle will be generated in the dist folder.

## Notes

- The frontend expects the backend to be running on the URL configured in VITE_API_BASE_URL.
- Authentication and booking flows rely on the backend API and JWT tokens.
- The app is designed to work seamlessly with the Spring Boot backend in the sibling api-handler project.
