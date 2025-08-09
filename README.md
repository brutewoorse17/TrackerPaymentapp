# Payment Tracker Pro - Source Code

## Setup Instructions

1. Install Node.js (v18 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5000 in your browser

## Features

- Client management with full CRUD operations
- Payment tracking and status management
- Philippine peso (PHP) currency formatting
- Dashboard with analytics and statistics
- Data export capabilities (CSV/ZIP)
- Responsive design optimized for mobile devices
- Source code download functionality

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: In-memory storage (easily replaceable with PostgreSQL)
- **UI Components**: Radix UI (shadcn/ui)
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query
- **Routing**: Wouter for lightweight client-side routing

## Project Structure

- `client/src/` - Frontend React application
  - `components/` - Reusable UI components
  - `pages/` - Application pages/routes
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions and configurations
- `server/` - Backend Express API
  - `routes.ts` - API route definitions
  - `storage.ts` - Data storage interface
- `shared/` - Shared types and schemas between frontend/backend

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Setup

This project is designed to work out of the box without additional configuration. 
The in-memory storage can be easily replaced with a real database by implementing 
the `IStorage` interface in `server/storage.ts`.

Generated on 2025-08-09T06:29:02.565Z
Built with PayTracker Pro
# TrackerPaymentapp
# TrackerPaymentapp
# TrackerPaymentapp
# TrackerPaymentapp
