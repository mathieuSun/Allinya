# Allinya - Realtime Healing Sessions Platform

A wellness marketplace connecting guests with healing practitioners for instant 1-on-1 video sessions.

## 🚀 Quick Start

### 1. Database Setup (REQUIRED)

⚠️ **The database tables must be created in your Supabase project:**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy and paste the contents of `server/db-setup.sql`
5. Click **"Run"** to execute

This creates all tables, policies, and indexes needed for the app.

### 2. Verify Environment Variables

All required secrets should already be configured. The app needs:

**Backend:**
- SUPABASE_URL
- SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- SESSION_SECRET
- AGORA_APP_ID
- AGORA_APP_CERTIFICATE

**Frontend (VITE_ prefixed):**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_AGORA_APP_ID

### 3. Start Using the App

The application is already running at your Replit URL.

1. **Sign Up** as a Guest or Practitioner
2. **Complete Onboarding** to set up your profile
3. **Browse Practitioners** (guests) or **Go Online** (practitioners)
4. **Request a Session** and connect live!

## ✨ Features

- 🔐 **Secure Authentication** - Supabase email/password auth
- 👤 **Dual Roles** - Guest or Practitioner accounts
- 🟢 **Live Presence** - See who's available in real-time
- 📹 **Video Sessions** - HD video calls powered by Agora
- 🚪 **Waiting Room** - Two-phase session flow (waiting → live)
- ⭐ **Reviews & Ratings** - Post-session feedback system
- 💜 **Wellness Design** - Calming, trust-building UI

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind + Shadcn UI
- **Backend:** Express + Drizzle ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Authentication
- **Video:** Agora WebRTC SDK
- **Realtime:** Supabase Realtime for presence

### Database Schema

**profiles** - User profiles (guests & practitioners)
```sql
id, role, display_name, bio, avatar_url, specialties, ...
```

**practitioners** - Practitioner status & ratings
```sql
user_id, online, in_service, rating, review_count
```

**sessions** - Session state management
```sql
id, practitioner_id, guest_id, phase (waiting/live/ended), ...
```

**reviews** - Session feedback
```sql
id, session_id, guest_id, practitioner_id, rating, comment
```

### Session Flow

1. **Discovery** - Guest browses practitioners on /explore
2. **Request** - Guest requests session → enters waiting room
3. **Accept** - Practitioner accepts → both enter live video
4. **Complete** - Either party ends → review screen appears

## 📂 Project Structure

```
├── client/src/
│   ├── pages/          # Page components (auth, explore, session, etc.)
│   ├── components/     # Reusable UI components (Shadcn)
│   └── lib/           # Utilities, auth context, query client
├── server/
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Data access layer
│   ├── auth.ts        # Supabase auth middleware
│   └── db-setup.sql   # Database schema (RUN IN SUPABASE!)
├── shared/
│   └── schema.ts      # Shared types & Drizzle schema
└── design_guidelines.md
```

## 🔌 API Endpoints

### Profiles
- `POST /api/auth/role-init` - Initialize profile with role
- `PUT /api/profile` - Update user profile

### Practitioners
- `POST /api/presence/toggle` - Toggle online status
- `GET /api/practitioners/status` - Get practitioner status
- `GET /api/practitioners/online` - List online practitioners
- `GET /api/practitioners/:id` - Get practitioner profile

### Sessions
- `POST /api/sessions/request` - Request new session
- `GET /api/sessions/active` - Get active session
- `POST /api/sessions/:id/accept` - Accept session
- `POST /api/sessions/:id/ready` - Mark ready in waiting room
- `POST /api/sessions/:id/end` - End session
- `GET /api/sessions/:id/token` - Get Agora video token

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/practitioner/:id` - Get practitioner reviews

## 🎨 Design System

**Colors:**
- Primary: Deep Purple (#7C3AED) - Trust & spirituality
- Secondary: Soft Teal (#14B8A6) - Calm & healing  
- Accent: Warm Coral (#F97316) - Energy & warmth

**Typography:**
- Headings: Bold, clear hierarchy
- Body: Readable, generous spacing

See `design_guidelines.md` for complete specifications.

## ⚠️ Important Notes

### Authentication Flow
Auth is handled by **Supabase client on the frontend** - there are NO backend endpoints for signup/login. The flow is:

1. User signs up via Supabase client (`supabase.auth.signUp()`)
2. Supabase creates auth user automatically
3. User completes onboarding to create profile in database
4. Profile includes role (guest or practitioner)

### Database Setup
The `server/db-setup.sql` file **MUST be run in your Supabase dashboard**, not in the development database. It requires Supabase's `auth.users` table which only exists in Supabase.

### Environment Variables
Frontend needs VITE_ prefixed variables to access secrets in the browser. Backend uses non-prefixed versions for server-side operations.

## 🐛 Troubleshooting

**"Missing Supabase environment variables"**
→ Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

**Database connection errors**
→ Run `server/db-setup.sql` in your Supabase SQL Editor

**Video not working**
→ Check Agora credentials and browser camera permissions

**Profile not loading after signup**
→ Complete onboarding to create your profile

## 📝 Recent Changes

### 2024-10-12
- ✅ Full-stack architecture implemented
- ✅ Supabase auth integration
- ✅ Agora video integration
- ✅ Two-phase session flow (waiting → live)
- ✅ Practitioner presence system
- ✅ Review system
- ✅ Wellness-focused design system

## 📄 License

MIT
