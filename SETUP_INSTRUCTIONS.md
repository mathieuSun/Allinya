# Allinya Setup Instructions

## ⚠️ IMPORTANT: Database Setup Required

The application is ready to run, but **the database tables must be created first**. Follow these steps:

### Step 1: Create Database Tables

1. **Open your Supabase project dashboard** at https://supabase.com/dashboard
2. **Navigate to the SQL Editor** (left sidebar → SQL Editor)
3. **Click "New Query"**
4. **Copy the entire contents** of `server/db-setup.sql`
5. **Paste into the SQL Editor**
6. **Click "Run"** to execute the SQL

This will create:
- `profiles` table - User profiles (guests and practitioners)  
- `practitioners` table - Practitioner-specific data with online status
- `sessions` table - Session management (waiting_room, live, ended)
- `reviews` table - Session reviews and ratings
- Row Level Security (RLS) policies
- Indexes for performance

### Step 2: Verify Environment Variables

Make sure these secrets are configured in Replit Secrets:

#### Backend Secrets:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `AGORA_APP_ID` - Your Agora application ID
- `AGORA_APP_CERTIFICATE` - Your Agora app certificate

#### Frontend Secrets (VITE_ prefixed):
- `VITE_SUPABASE_URL` - Same value as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY` - Same value as SUPABASE_ANON_KEY
- `VITE_AGORA_APP_ID` - Same value as AGORA_APP_ID

### Step 3: Start the Application

The application is already running via the "Start application" workflow.

### Step 4: Test the Application

1. **Visit the homepage** - You should see the authentication page
2. **Create a guest account** - Sign up with an email and password
3. **Complete onboarding** - Set your display name and interests
4. **Create a practitioner account** (in another browser/incognito):
   - Sign up with a different email
   - Choose "Practitioner" role during onboarding
   - Set up practitioner profile (bio, specialties, rate)
   - Toggle online status to "Available"
5. **Test session flow**:
   - As guest: Browse practitioners on /explore
   - Request a session with an online practitioner
   - As practitioner: Accept the session request
   - Both users enter live video session
   - End session and leave a review

## Authentication Flow

The app uses **Supabase Authentication** handled entirely on the frontend:

1. User signs up with email/password via Supabase client
2. Supabase creates auth user automatically
3. User completes onboarding to create profile in database
4. Role is set during onboarding (guest or practitioner)

**Note:** There are NO backend auth endpoints (`/api/auth/signup`, `/api/auth/login`). Auth is handled by Supabase client directly.

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct in secrets
- Check Supabase project is active
- Ensure tables were created successfully (check Supabase Table Editor)

### Frontend Not Loading
- Verify VITE_ prefixed environment variables are set
- Restart the workflow to reload environment variables
- Check browser console for errors

### Video Not Working
- Verify Agora credentials are correct
- Check browser permissions for camera/microphone
- Ensure VITE_AGORA_APP_ID matches AGORA_APP_ID

## Architecture Notes

- **Frontend:** React + Vite + Supabase Client for auth
- **Backend:** Express + Drizzle ORM for database operations
- **Auth:** Supabase handles all authentication
- **Video:** Agora SDK for WebRTC video calls
- **Database:** PostgreSQL via Supabase

The backend provides API endpoints for:
- Profile management
- Practitioner status/presence
- Session creation/management
- Agora token generation
- Reviews

But auth signup/login/logout is handled by Supabase client on the frontend.
