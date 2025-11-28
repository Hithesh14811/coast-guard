# CoastGuard Lite - GPS Tracking & Drift Prediction System

## Overview

CoastGuard Lite is a real-time GPS tracking and drift prediction system designed to help coast guard teams locate fishermen at sea. The system tracks fishermen via GPS when network connectivity exists and automatically predicts drift locations when GPS signal is lost using marine weather data (wind, currents, waves).

## Architecture

### Frontend (React + TypeScript)
- **Home Page** (`/`) - Landing page with overview of features and links to both apps
- **Fisherman App** (`/fisherman`) - Mobile-first web app for fishermen to share GPS location
- **Coast Guard Dashboard** (`/dashboard`) - Full tracking dashboard with map, drift simulation, and alerts

### Backend (Express + TypeScript)
- In-memory storage for development (easily swappable for PostgreSQL)
- REST API for GPS tracking, drift simulation, and marine weather
- Integration with Open-Meteo Marine API for real weather data

### Key Technologies
- React with wouter for routing
- TanStack Query for data fetching
- Leaflet.js for interactive maps
- Tailwind CSS + shadcn/ui for styling
- Open-Meteo Marine API for weather data

## Project Structure

```
├── client/src/
│   ├── components/          # Reusable UI components
│   │   ├── map/             # Leaflet map components
│   │   ├── ui/              # shadcn UI components
│   │   ├── alert-banner.tsx
│   │   ├── coordinate-display.tsx
│   │   ├── marine-weather-card.tsx
│   │   ├── simulation-controls.tsx
│   │   ├── status-badge.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── use-geolocation.ts
│   │   ├── use-theme.ts
│   │   └── use-toast.ts
│   ├── pages/               # Page components
│   │   ├── dashboard.tsx    # Coast Guard dashboard
│   │   ├── fisherman-app.tsx # Fisherman mobile app
│   │   ├── home.tsx         # Landing page
│   │   └── not-found.tsx
│   └── App.tsx              # Main app with routing
├── server/
│   ├── drift-engine.ts      # Monte Carlo drift simulation
│   ├── marine-api.ts        # Open-Meteo API integration
│   ├── routes.ts            # API endpoints
│   └── storage.ts           # Data storage interface
└── shared/
    └── schema.ts            # Shared TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fisherman/location` | Save fisherman GPS location |
| GET | `/api/fisherman/:id` | Get fisherman state and last location |
| GET | `/api/dashboard/fisherman` | Get fisherman data for dashboard |
| POST | `/api/fisherman/trigger-drift` | Manually trigger drift mode |
| GET | `/api/marine-weather?lat=&lng=` | Fetch marine weather data |
| POST | `/api/simulation/run` | Run Monte Carlo drift simulation |
| GET | `/api/drift-result/:fishermanId` | Get latest drift result |
| GET | `/api/alerts` | Get all alerts |
| PATCH | `/api/alerts/:alertId/dismiss` | Dismiss an alert |

## Features

### GPS Tracking
- Uses browser's `navigator.geolocation.watchPosition` API
- Sends updates every 10 seconds when sharing is active
- Automatic signal loss detection after 60 seconds of no updates

### Drift Prediction Engine
- Monte Carlo simulation generating 50-200 randomized drift paths
- Uses real marine weather data (wind speed/direction, ocean currents)
- Wind speed variation: ±20%, Current speed variation: ±15%
- Direction variation: ±10-20 degrees
- Generates heatmap of probable search areas

### Marine Weather Integration
- Open-Meteo Marine API for wave height
- Open-Meteo Weather API for wind speed/direction
- Simulated ocean current data based on wind patterns
- 30-minute caching for API responses

## Running the Project

The application runs on port 5000:
```bash
npm run dev
```

This starts both the Express backend and Vite development server.

## User Preferences

- Dark mode toggle available on all pages
- Auto-refresh toggle on dashboard (5-second intervals)
- Simulation hours adjustable (1-12 hours)
- Heatmap and drift path visibility toggles

## Recent Changes

- Initial implementation with full GPS tracking
- Monte Carlo drift simulation engine
- Open-Meteo Marine API integration
- Leaflet map with heatmap visualization
- Alert system for signal loss and simulation completion
