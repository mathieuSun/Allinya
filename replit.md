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
- **Supabase** for authentication and storage

### Backend
- **Express** server
- **Drizzle ORM** with PostgreSQL (Supabase)
- **Agora Token** generation for secure video
- Session management and presence tracking
- **Supabase Storage** for file uploads (avatars, gallery, videos)

## Architecture

### Database Schema
- **profiles**: User profiles (guests and practitioners)
- **practitioners**: Practitioner-specific data with online status
- **sessions**: Session state management (waiting_room, live, ended)
- **reviews**: Session ratings and reviews

### Storage Buckets (Supabase Storage)
- **avatars**: Profile pictures (5MB limit, public)
- **gallery**: Portfolio images (10MB limit, public)
- **videos**: Introduction videos (50MB limit, public)

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
- **File Uploads**: Supabase Storage for avatars, galleries, and videos
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
Run `server/complete-db-setup.sql` in your Supabase SQL Editor to create all tables, RLS policies, and indexes.

### 2. Storage Setup (CRITICAL)
Run `server/WORKING-storage-rls-fix.sql` in your Supabase SQL Editor to enable file uploads. This script:
- Creates proper RLS policies for storage.objects
- Configures public buckets for avatars, gallery, and videos
- Enables authenticated uploads and public read access

### 3. Environment Configuration
All required secrets should be configured in Replit Secrets.

### 4. Running the Application
The workflow "Start application" runs `npm run dev` which starts both Express backend and Vite frontend on port 5000.

### 5. Testing Uploads
After applying the storage RLS fix, run `node test-upload-after-fix.mjs` to verify uploads work.

## File Structure

```
├── client/src/
│   ├── pages/          # Route components
│   ├── components/     # Reusable UI components
│   └── lib/           # Supabase, query client, utils
├── server/
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Data access layer
│   ├── supabaseStorage.ts # Supabase Storage integration
│   ├── complete-db-setup.sql # Database schema
│   └── WORKING-storage-rls-fix.sql # Storage RLS fix
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

### Storage
- `PUT /api/objects/upload` - Upload file to Supabase Storage
- Requires headers: Authorization, Content-Type, x-bucket-name, x-file-name

## Design System

The platform follows a wellness-focused design with:
- **Primary Color**: Deep purple (#7C3AED) - trust and spirituality
- **Secondary Color**: Soft teal (#14B8A6) - calm and healing
- **Accent Color**: Warm coral (#F97316) - energy and warmth
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent padding/margins for visual harmony

See `design_guidelines.md` for complete design specifications.

## Test User Accounts

The following test users are configured in Supabase:
- **Practitioner**: chefmat2018@gmail.com / Rickrick01
- **Guest**: cheekyma@hotmail.com / Rickrick01

## Recent Changes

### 2024-10-15 (Storage RLS Fix & Complete Solution)
- **Fixed Supabase Storage RLS policies**:
  - Created `server/WORKING-storage-rls-fix.sql` with proper type casting
  - Resolved UUID vs text comparison errors
  - Enabled permissive policies for authenticated uploads
  - Configured public read access for all buckets
  - Tested and verified with comprehensive test scripts

- **Fixed frontend upload issues**:
  - Removed duplicate Authorization headers in ObjectUploader
  - Signed URLs already contain auth tokens
  - Improved error handling and logging

- **Fixed video session implementation**:
  - Added proper useEffect dependencies for Agora initialization
  - Improved cleanup functions with state checks
  - Enhanced error logging for better debugging
  - Added comprehensive error messages

- **Fixed Agora token generation**:
  - Endpoint now returns token, appId, and uid
  - All users set to PUBLISHER role for video calls
  - Unique UIDs with p_ and g_ prefixes

### 2024-10-14 (Critical Bug Fixes - Complete)
- Fixed image upload persistence with proper form state management
- Fixed practitioner session notifications with polling system
- Verified session transition notifications work for all phase changes

### 2024-10-14 (Session Flow & Dashboard Implementation - Complete)
- Created practitioner dashboard with real-time session management
- Fixed automatic video transition when both parties ready
- Added real-time toast notifications for session events
- Session flow working end-to-end

### 2024-10-14 (Media Persistence Fix - Complete)
- Fixed uploaded media not persisting after form submission
- Synced form values with profile data on updates
- Simplified upload handlers to only save to DB and refresh

### 2024-10-13 (Media & Session Flow Fixes)
- Migrated public images from private to public object storage
- Fixed session flow property mismatches (snake_case to camelCase)
- Added Remember Email feature with localStorage

### 2024-10-13 (Critical Bug Fixes)
- Fixed file upload modal display with Uppy CSS
- Fixed session creation timestamp errors
- Fixed logout error handling with try-catch
- Added file type restrictions for uploads

## Troubleshooting

### If uploads still don't work:
1. Check Supabase Dashboard > Storage > Buckets are "Public"
2. Ensure RLS is enabled on storage.objects table
3. Try test upload in Supabase Dashboard directly
4. Run `node test-upload-after-fix.mjs` to verify
5. Check browser console for client-side errors

### If video doesn't work:
1. Verify AGORA_APP_ID and AGORA_APP_CERTIFICATE are correct
2. Test on physical devices (not emulators)
3. Use Chrome 65+, Safari 12+, or Firefox 70+
4. Grant camera/microphone permissions
5. Ensure 2+ Mbps internet connection

## GitHub Repository

https://github.com/mathieuSun/allinya