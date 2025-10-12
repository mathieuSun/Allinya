# Allinya - Realtime Healing Sessions Platform

A wellness marketplace platform enabling instant 1-on-1 healing sessions with live video capabilities.

## Overview

Allinya connects guests with healing practitioners for realtime video sessions. The platform features a two-phase session flow (Waiting Room → Live Video), practitioner presence management, and role-based authentication.

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Shadcn UI** with Tailwind CSS
- **Agora SDK** for video calls
- **Supabase** for authentication

### Backend
- **Express** server
- **Drizzle ORM** with PostgreSQL (Supabase)
- **Agora Token** generation for secure video
- Session management and presence tracking

## Architecture

### Database Schema
- **profiles**: User profiles (guests and practitioners)
- **practitioners**: Practitioner-specific data with online status
- **sessions**: Session state management (waiting_room, live, ended)
- **reviews**: Session ratings and reviews

### Session Flow
1. **Discovery**: Guests browse practitioners on /explore with realtime presence indicators
2. **Request**: Guest requests a session, entering the waiting room
3. **Accept**: Practitioner accepts, both enter live video session
4. **Complete**: Either party can end, triggering review flow

### Authentication
- Supabase Auth with email/password
- Role-based access (guest vs practitioner)
- Protected routes and session validation

## Key Features

- **Realtime Presence**: Green indicators show available practitioners
- **Two-Phase Sessions**: Waiting room before video connects
- **Live Video**: Agora-powered HD video calls
- **Practitioner Profiles**: Specialties, ratings, bios
- **Review System**: Post-session feedback

## Environment Variables

### Required Secrets
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (backend only)
- `SESSION_SECRET`: Express session secret
- `AGORA_APP_ID`: Agora application ID
- `AGORA_APP_CERTIFICATE`: Agora app certificate (backend only)
- `DATABASE_URL`: PostgreSQL connection string

### Frontend Variables (VITE_ prefixed)
- `VITE_SUPABASE_URL`: Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY`: Same as SUPABASE_ANON_KEY
- `VITE_AGORA_APP_ID`: Same as AGORA_APP_ID

## Setup Instructions

### 1. Database Setup
Run `server/db-setup.sql` in your Supabase SQL Editor to create all tables, RLS policies, and indexes.

### 2. Environment Configuration
All required secrets should be configured in Replit Secrets.

### 3. Running the Application
The workflow "Start application" runs `npm run dev` which starts both Express backend and Vite frontend on port 5000.

## File Structure

```
├── client/src/
│   ├── pages/          # Route components
│   ├── components/     # Reusable UI components
│   └── lib/           # Supabase, query client, utils
├── server/
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Data access layer
│   └── db-setup.sql   # Database schema
├── shared/
│   └── schema.ts      # Shared types and Drizzle schema
└── design_guidelines.md # UI/UX design system
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/user` - Get current user

### Profiles
- `GET /api/profiles/:id` - Get profile
- `PATCH /api/profiles/:id` - Update profile

### Practitioners
- `GET /api/practitioners` - List all practitioners
- `GET /api/practitioners/:id` - Get practitioner details
- `POST /api/practitioners` - Create practitioner profile
- `PATCH /api/practitioners/:id/status` - Toggle online status

### Sessions
- `POST /api/sessions` - Request new session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id/accept` - Accept session request
- `PATCH /api/sessions/:id/end` - End active session
- `GET /api/sessions/:id/token` - Get Agora video token

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/practitioner/:id` - Get practitioner reviews

## Design System

The platform follows a wellness-focused design with:
- **Primary Color**: Deep purple (#7C3AED) - trust and spirituality
- **Secondary Color**: Soft teal (#14B8A6) - calm and healing
- **Accent Color**: Warm coral (#F97316) - energy and warmth
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent padding/margins for visual harmony

See `design_guidelines.md` for complete design specifications.

## Test User Setup

### Test User Accounts
The following test users are configured in Supabase:

- **Practitioner**: chefmat2018@gmail.com / Rickrick01
- **Guest**: cheekyma@hotmail.com / Rickrick01

To set up their profiles, run `server/create-test-users.sql` in Supabase SQL Editor.

## Recent Changes

### 2024-10-12 (Testing & Bug Fixes)
- **Authentication fixes**:
  - Added /login route (aliased to /auth)
  - Added logout buttons to all authenticated pages (profile, explore)
- **Critical data persistence fix**:
  - Added `toCamelCase()` helper to convert snake_case DB fields to camelCase for frontend
  - Applied conversion to ALL storage layer GET operations (profiles, practitioners, sessions, reviews)
  - Fixed AuthContext to use backend API (/api/profile) instead of direct Supabase queries
  - Added missing GET /api/profile endpoint
- **Known issue**: Auth session persistence needs investigation (Supabase session not properly restored on page reload)

### 2024-10-12 (Schema & Configuration)
- Fixed practitioners table missing created_at/updated_at timestamps
- Created centralized backend configuration (`server/config.ts`)  
- Fixed all TypeScript/LSP errors
- Generated production-ready SQL schemas
- Backend: snake_case for DB, frontend: camelCase with automatic conversion

### 2024-10-12 (Initial)
- Initial full-stack setup completed
- All authentication, session, and profile flows implemented
- Video integration with Agora configured
- Design system established with Shadcn UI components
- Database schema created (ready for manual SQL execution)
