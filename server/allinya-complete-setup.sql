-- ================================================
-- ALLINYA DATABASE SETUP - COMPLETE AND CLEAN
-- ================================================
-- This file creates all tables, indexes, and RLS policies
-- for the Allinya healing sessions platform
-- ================================================

-- ================================================
-- 1. PROFILES TABLE
-- ================================================
-- Core user profiles for both guests and practitioners
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('guest', 'practitioner')),
  display_name TEXT NOT NULL,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ================================================
-- 2. PRACTITIONERS TABLE
-- ================================================
-- Additional practitioner-specific data
CREATE TABLE IF NOT EXISTS practitioners (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  in_service BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for practitioners
CREATE INDEX IF NOT EXISTS idx_practitioners_online ON practitioners(is_online);
CREATE INDEX IF NOT EXISTS idx_practitioners_rating ON practitioners(rating DESC);

-- ================================================
-- 3. SESSIONS TABLE
-- ================================================
-- Healing session records
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  phase TEXT NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting', 'room_timer', 'live', 'ended')),
  live_seconds INTEGER NOT NULL DEFAULT 900, -- 15 minutes default
  started_at TIMESTAMPTZ DEFAULT NOW(),
  practitioner_ready BOOLEAN DEFAULT FALSE,
  guest_ready BOOLEAN DEFAULT FALSE,
  agora_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_users CHECK (practitioner_id != guest_id)
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_practitioner ON sessions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- ================================================
-- 4. REVIEWS TABLE
-- ================================================
-- Post-session reviews from guests
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_review_per_session UNIQUE(session_id)
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_practitioner ON reviews(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guest ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Practitioners are viewable by everyone" ON practitioners;
DROP POLICY IF EXISTS "Practitioners can update own record" ON practitioners;
DROP POLICY IF EXISTS "Practitioners can insert own record" ON practitioners;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Guests can create sessions" ON sessions;
DROP POLICY IF EXISTS "Participants can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Guests can create reviews" ON reviews;

-- PROFILES POLICIES
-- Anyone can view profiles
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

-- PRACTITIONERS POLICIES
-- Anyone can view practitioners
CREATE POLICY "Practitioners are viewable by everyone" 
  ON practitioners FOR SELECT 
  USING (true);

-- Practitioners can update their own record
CREATE POLICY "Practitioners can update own record" 
  ON practitioners FOR UPDATE 
  USING (auth.uid() = user_id);

-- Practitioners can insert their own record
CREATE POLICY "Practitioners can insert own record" 
  ON practitioners FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- SESSIONS POLICIES
-- Participants can view their own sessions
CREATE POLICY "Users can view own sessions" 
  ON sessions FOR SELECT 
  USING (auth.uid() = practitioner_id OR auth.uid() = guest_id);

-- Guests can create sessions
CREATE POLICY "Guests can create sessions" 
  ON sessions FOR INSERT 
  WITH CHECK (auth.uid() = guest_id);

-- Participants can update their own sessions
CREATE POLICY "Participants can update own sessions" 
  ON sessions FOR UPDATE 
  USING (auth.uid() = practitioner_id OR auth.uid() = guest_id);

-- REVIEWS POLICIES
-- Anyone can view reviews
CREATE POLICY "Reviews are viewable by everyone" 
  ON reviews FOR SELECT 
  USING (true);

-- Guests can create reviews for their sessions
CREATE POLICY "Guests can create reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (auth.uid() = guest_id);

-- ================================================
-- 6. REALTIME SUBSCRIPTIONS
-- ================================================

-- Enable realtime for practitioners table (online status)
ALTER PUBLICATION supabase_realtime ADD TABLE practitioners;

-- Enable realtime for sessions table (session updates)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- ================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_practitioners_updated_at ON practitioners;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_rating_after_review ON reviews;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at 
  BEFORE UPDATE ON practitioners 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update practitioner rating after review
CREATE OR REPLACE FUNCTION update_practitioner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE practitioners
  SET 
    rating = (
      SELECT AVG(rating)::NUMERIC(2,1) 
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

-- Trigger to update rating after new review
CREATE TRIGGER update_rating_after_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_rating();

-- ================================================
-- 8. STORAGE BUCKETS SETUP
-- ================================================
-- Note: Run these in Supabase Dashboard under Storage

-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('avatars', 'avatars', true),
--   ('gallery', 'gallery', true),
--   ('videos', 'videos', true);

-- ================================================
-- 9. STORAGE RLS POLICIES
-- ================================================
-- Note: Run these after creating storage buckets

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated users can upload avatars"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can upload gallery"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can upload videos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Allow public read access
-- CREATE POLICY "Public can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- CREATE POLICY "Public can view gallery"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'gallery');

-- CREATE POLICY "Public can view videos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'videos');

-- Allow users to update their own files
-- CREATE POLICY "Users can update own avatars"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = owner);

-- CREATE POLICY "Users can update own gallery"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'gallery' AND auth.uid()::text = owner);

-- CREATE POLICY "Users can update own videos"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'videos' AND auth.uid()::text = owner);

-- Allow users to delete their own files
-- CREATE POLICY "Users can delete own avatars"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = owner);

-- CREATE POLICY "Users can delete own gallery"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'gallery' AND auth.uid()::text = owner);

-- CREATE POLICY "Users can delete own videos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'videos' AND auth.uid()::text = owner);

-- ================================================
-- END OF SETUP
-- ================================================
-- Your Allinya database is now ready!
-- 
-- Next steps:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Create storage buckets in Storage tab
-- 3. Apply storage RLS policies (uncomment section 9)
-- 4. Test with your production accounts:
--    - chefmat2018@gmail.com (practitioner)
--    - cheekyma@hotmail.com (guest)
-- ================================================