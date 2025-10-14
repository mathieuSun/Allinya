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

### 2024-10-14 (Critical Bug Fixes - Complete)
- **Fixed image upload persistence**:
  - Added `form.setValue()` in all upload handlers (avatar, video, gallery)
  - Uploads now immediately update form state with public URLs
  - Gallery images append to existing instead of replacing
  - Fixed issue where uploaded media was lost on subsequent form submissions

- **Fixed practitioner session notifications**:
  - Replaced unreliable Supabase realtime with robust polling system
  - Increased poll frequency to 1 second for immediate updates
  - Tracks session count changes to detect new incoming requests
  - Shows toast notification + plays audio for new session alerts
  - Fixed critical bug where first session wouldn't trigger notification
  - Uses `hasLoadedSessions` flag to properly detect initial sessions

- **Verified session transition notifications**:
  - Toast notifications work for all phase changes (waiting → live)
  - Real-time updates via Supabase subscriptions for session state
  - Notifications for: practitioner ready, guest ready, session starting, session ended

### 2024-10-14 (Session Flow & Dashboard Implementation - Complete)
- **Created practitioner dashboard with real-time session management**:
  - Added `/dashboard` route for practitioners to manage incoming sessions
  - Implemented `/api/sessions/practitioner` endpoint to fetch pending/active sessions
  - Added accept/reject buttons with dedicated endpoints (`/api/sessions/accept`, `/api/sessions/reject`)
  - Dashboard shows real-time updates via Supabase subscriptions
  - Added navigation button from profile to dashboard for practitioners

- **Fixed automatic video transition**:
  - Sessions now automatically transition from waiting room to live video when both parties mark ready
  - Added timer logic to check both `readyPractitioner` and `readyGuest` states
  - Query invalidation triggers automatic phase change to "live"

- **Added real-time toast notifications**:
  - Practitioner ready notification shows when practitioner marks ready
  - Guest ready notification shows when guest marks ready  
  - Session starting notification when transitioning to video
  - Session ended notification when session completes
  - All notifications use Supabase realtime subscriptions for instant updates

- **Session Flow Working End-to-End**:
  - Guest requests session from explore page
  - Practitioner sees request on dashboard with accept/reject options
  - Accept creates waiting room, reject cancels session
  - Both parties mark ready in waiting room
  - Automatic transition to live video when both ready
  - Either party can end session
  - Review prompt after session ends

### 2024-10-14 (Media Persistence Fix - Complete)
- **Fixed uploaded media not persisting after form submission**:
  - **Root cause**: Form's defaultValues were set only on mount and not synced when profile refreshed after uploads
  - **Secondary issue**: When form submitted, it sent stale values that overwrote the newly uploaded media
  - **Solution implemented**: 
    1. Added useEffect to sync form values with profile data whenever profile updates
    2. Removed redundant state variables (uploadedAvatarUrl, uploadedVideoUrl, uploadedGalleryUrls)
    3. Form now properly resets with fresh data after each upload via `form.reset()`
    4. Simplified upload handlers to only save to DB and refresh profile
  - **Result**: Uploaded avatars, videos, and gallery images now persist correctly through all operations

### 2024-10-13 (Media & Session Flow Fixes)
- **Fixed media upload and display**:
  - Migrated public images (avatars, gallery, videos) from private to public object storage
  - Created `getPublicObjectUploadURL()` method and `/api/objects/upload-public` endpoint
  - Updated profile endpoints to accept `publicPath` and save as `/public-objects/<path>`
  - Images/videos now accessible via `/public-objects/*` route without authentication
  - Resolves 404 errors where `<img>` and `<video>` tags couldn't send auth headers
- **Fixed session flow property mismatches**:
  - Corrected all snake_case properties to camelCase in session.tsx (guestId, agoraUidGuest, readyGuest, etc.)
  - Fixed Date object serialization for timer calculations
  - Resolved all 12 LSP errors, session flow now progresses correctly to live video
- **Added Remember Email feature**:
  - Checkbox on login screens persists email to localStorage
  - Auto-fills email field on return visits

### 2024-10-13 (Critical Bug Fixes - File Upload, Logout, Session Creation)
- **Fixed file upload modal not displaying**:
  - Added Uppy CSS CDN link to index.html
  - Modal now properly displays file picker for avatar/video/gallery uploads
- **Fixed session creation timestamp error**:
  - Updated toSnakeCase() to properly handle Date objects by converting to ISO strings
  - Resolved "Invalid input syntax for type timestamp" database error
- **Fixed logout error handling**:
  - Added try-catch block with toast notifications for logout failures
  - Removed redundant manual navigation (auth listener handles redirect)
  - Prevents silent logout failures
- **Added file type restrictions**:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Videos: .mp4, .mov, .avi, .mkv, .webm

### 2024-10-13 (Auth & UX Overhaul)
- **Fixed critical auth token forwarding**:
  - AuthContext now properly attaches Supabase access_token as Bearer header to all API requests
  - Fixed refresh loops by gracefully handling transient token unavailability during sign-in/sign-up
  - Profile data now persists correctly after page reload
- **Redesigned auth page with role selection**:
  - Two-step flow: first select Guest vs Practitioner role, then sign in/up
  - Clear visual cards showing "I'm a Guest" vs "I'm a Practitioner"
  - Role-specific messaging and automatic role initialization
- **Enhanced explore page**:
  - Now shows ALL practitioners (not just online ones)
  - Visual distinction: online practitioners in full color with green badge, offline greyed out with grey badge
  - Disabled "Start Session" button for offline practitioners
  - Real-time updates for practitioner status changes
- **All critical bugs fixed**: Auth flow works end-to-end, data persists correctly

### 2024-10-12 (Testing & Bug Fixes)
- **Authentication fixes**:
  - Added /login route (aliased to /auth)
  - Added logout buttons to all authenticated pages (profile, explore)
- **Critical data persistence fix**:
  - Added `toCamelCase()` helper to convert snake_case DB fields to camelCase for frontend
  - Applied conversion to ALL storage layer GET operations (profiles, practitioners, sessions, reviews)
  - Fixed AuthContext to use backend API (/api/profile) instead of direct Supabase queries
  - Added missing GET /api/profile endpoint

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
