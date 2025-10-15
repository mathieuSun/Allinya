-- ============================================
-- COMPLETE DATABASE SETUP FOR ALLINYA PLATFORM
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This creates all tables, indexes, RLS policies, and functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- Drop existing tables if needed (be careful in production!)
-- Uncomment these lines only if you want to reset your database
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS practitioners CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles table - supports both guest and practitioner roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('guest', 'practitioner')) NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  video_url TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Practitioners table - presence and rating info
CREATE TABLE IF NOT EXISTS practitioners (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  in_service BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sessions table - handles waiting room and live video phases
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  phase TEXT CHECK (phase IN ('waiting', 'live', 'ended')) NOT NULL,
  waiting_seconds INTEGER NOT NULL DEFAULT 300 CHECK (waiting_seconds > 0),
  live_seconds INTEGER NOT NULL CHECK (live_seconds > 0),
  waiting_started_at TIMESTAMPTZ,
  live_started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  agora_channel TEXT NOT NULL UNIQUE,
  agora_uid_practitioner TEXT NOT NULL,
  agora_uid_guest TEXT NOT NULL,
  ready_practitioner BOOLEAN NOT NULL DEFAULT FALSE,
  ready_guest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Ensure proper phase transitions
  CONSTRAINT valid_phase_timestamps CHECK (
    (phase = 'waiting' AND waiting_started_at IS NOT NULL AND live_started_at IS NULL AND ended_at IS NULL) OR
    (phase = 'live' AND waiting_started_at IS NOT NULL AND live_started_at IS NOT NULL AND ended_at IS NULL) OR
    (phase = 'ended' AND ended_at IS NOT NULL)
  )
);

-- Reviews table - session ratings and feedback
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Ensure one review per session
  CONSTRAINT unique_review_per_session UNIQUE (session_id, guest_id)
);

-- ============================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_practitioners_updated_at ON practitioners;
CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON practitioners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO UPDATE PRACTITIONER RATINGS
-- ============================================

CREATE OR REPLACE FUNCTION update_practitioner_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update practitioner's rating and review count
    UPDATE practitioners
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::NUMERIC, 2)
            FROM reviews
            WHERE practitioner_id = NEW.practitioner_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE practitioner_id = NEW.practitioner_id
        )
    WHERE user_id = NEW.practitioner_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update practitioner ratings when review is added
DROP TRIGGER IF EXISTS update_practitioner_rating_on_review ON reviews;
CREATE TRIGGER update_practitioner_rating_on_review
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_practitioner_rating();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything with profiles" ON profiles;

DROP POLICY IF EXISTS "Practitioners viewable by everyone" ON practitioners;
DROP POLICY IF EXISTS "Practitioners can update own status" ON practitioners;
DROP POLICY IF EXISTS "Practitioners can insert own status" ON practitioners;
DROP POLICY IF EXISTS "Service role can do anything with practitioners" ON practitioners;

DROP POLICY IF EXISTS "Sessions viewable by participants" ON sessions;
DROP POLICY IF EXISTS "Sessions updatable by participants" ON sessions;
DROP POLICY IF EXISTS "Sessions insertable by participants" ON sessions;
DROP POLICY IF EXISTS "Service role can do anything with sessions" ON sessions;

DROP POLICY IF EXISTS "Reviews viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Reviews insertable by guests" ON reviews;
DROP POLICY IF EXISTS "Service role can do anything with reviews" ON reviews;

-- PROFILES POLICIES
-- Everyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Service role bypass (for backend operations)
CREATE POLICY "Service role can do anything with profiles" 
ON profiles FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- PRACTITIONERS POLICIES
-- Everyone can view practitioners
CREATE POLICY "Practitioners viewable by everyone" 
ON practitioners FOR SELECT 
USING (true);

-- Practitioners can update their own status
CREATE POLICY "Practitioners can update own status" 
ON practitioners FOR UPDATE 
USING (auth.uid() = user_id);

-- Practitioners can insert their own record
CREATE POLICY "Practitioners can insert own status" 
ON practitioners FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role can do anything with practitioners" 
ON practitioners FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- SESSIONS POLICIES
-- Participants can view their sessions
CREATE POLICY "Sessions viewable by participants" 
ON sessions FOR SELECT 
USING (auth.uid() = guest_id OR auth.uid() = practitioner_id);

-- Participants can update their sessions
CREATE POLICY "Sessions updatable by participants" 
ON sessions FOR UPDATE 
USING (auth.uid() = guest_id OR auth.uid() = practitioner_id);

-- Authenticated users can create sessions
CREATE POLICY "Sessions insertable by participants" 
ON sessions FOR INSERT 
WITH CHECK (auth.uid() = guest_id OR auth.uid() = practitioner_id);

-- Service role bypass
CREATE POLICY "Service role can do anything with sessions" 
ON sessions FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- REVIEWS POLICIES
-- Everyone can view reviews
CREATE POLICY "Reviews viewable by everyone" 
ON reviews FOR SELECT 
USING (true);

-- Only guests can insert reviews for their sessions
CREATE POLICY "Reviews insertable by guests" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = guest_id);

-- Service role bypass
CREATE POLICY "Service role can do anything with reviews" 
ON reviews FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Practitioners indexes
CREATE INDEX IF NOT EXISTS idx_practitioners_online 
ON practitioners(online) 
WHERE online = true;

CREATE INDEX IF NOT EXISTS idx_practitioners_user_id 
ON practitioners(user_id);

CREATE INDEX IF NOT EXISTS idx_practitioners_rating 
ON practitioners(rating DESC);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_phase 
ON sessions(phase) 
WHERE phase IN ('waiting', 'live');

CREATE INDEX IF NOT EXISTS idx_sessions_practitioner 
ON sessions(practitioner_id);

CREATE INDEX IF NOT EXISTS idx_sessions_guest 
ON sessions(guest_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
ON sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_agora_channel 
ON sessions(agora_channel);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_session_id 
ON reviews(session_id);

CREATE INDEX IF NOT EXISTS idx_reviews_practitioner_id 
ON reviews(practitioner_id);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
ON reviews(created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at DESC);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for practitioners with their profile information
CREATE OR REPLACE VIEW practitioner_profiles AS
SELECT 
    p.*,
    pr.online,
    pr.in_service,
    pr.rating,
    pr.review_count,
    pr.created_at as practitioner_created_at,
    pr.updated_at as practitioner_updated_at
FROM profiles p
JOIN practitioners pr ON p.id = pr.user_id
WHERE p.role = 'practitioner';

-- View for active sessions with participant details
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.*,
    gp.display_name as guest_name,
    gp.avatar_url as guest_avatar,
    pp.display_name as practitioner_name,
    pp.avatar_url as practitioner_avatar,
    pp.specialties as practitioner_specialties
FROM sessions s
JOIN profiles gp ON s.guest_id = gp.id
JOIN profiles pp ON s.practitioner_id = pp.id
WHERE s.phase IN ('waiting', 'live');

-- View for session history with reviews
CREATE OR REPLACE VIEW session_history AS
SELECT 
    s.*,
    r.rating as review_rating,
    r.comment as review_comment,
    r.created_at as review_created_at,
    gp.display_name as guest_name,
    pp.display_name as practitioner_name
FROM sessions s
LEFT JOIN reviews r ON s.id = r.session_id
JOIN profiles gp ON s.guest_id = gp.id
JOIN profiles pp ON s.practitioner_id = pp.id
WHERE s.phase = 'ended'
ORDER BY s.ended_at DESC;

-- ============================================
-- NO TEST DATA - Use real users only
-- ============================================
-- This application uses REAL user accounts only:
-- - Practitioner: chefmat2018@gmail.com (ID: 1a20c2b4-469d-4187-96ff-3e3da2a1d3a6)
-- - Guest: cheekyma@hotmail.com (ID: 38774353-63f2-40f7-a5d1-546b4804e5e3)
--
-- Create profiles through the application after authenticating with these accounts.

-- ============================================
-- GRANT PERMISSIONS (For Supabase)
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON practitioners TO authenticated;
GRANT ALL ON sessions TO authenticated;
GRANT ALL ON reviews TO authenticated;

-- Grant permissions to service role
GRANT ALL ON profiles TO service_role;
GRANT ALL ON practitioners TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON reviews TO service_role;

-- Grant permissions on views
GRANT SELECT ON practitioner_profiles TO authenticated;
GRANT SELECT ON active_sessions TO authenticated;
GRANT SELECT ON session_history TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- VALIDATION QUERIES (Run these to verify setup)
-- ============================================

/*
-- Check all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews');

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews')
ORDER BY tablename, indexname;

-- Check views exist
SELECT viewname FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('practitioner_profiles', 'active_sessions', 'session_history');
*/

-- ============================================
-- END OF SETUP SCRIPT
-- ============================================
-- Your Allinya database is now fully configured!
-- Remember to set up your environment variables:
-- - DATABASE_URL
-- - SUPABASE_URL
-- - SUPABASE_ANON_KEY
-- - SUPABASE_SERVICE_ROLE_KEY
-- - SESSION_SECRET
-- - AGORA_APP_ID
-- - AGORA_APP_CERTIFICATE