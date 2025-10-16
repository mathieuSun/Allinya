-- ================================================
-- ALLINYA COMPLETE DATABASE SETUP
-- ================================================
-- Run this entire file in Supabase SQL Editor
-- It will set up everything you need
-- ================================================

-- ================================================
-- STEP 1: CLEAN UP OLD POLICIES AND TRIGGERS
-- ================================================

-- Drop all existing policies on our tables (if they exist)
DO $$ 
BEGIN
  -- Drop profile policies
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  
  -- Drop practitioner policies
  DROP POLICY IF EXISTS "Practitioners are viewable by everyone" ON practitioners;
  DROP POLICY IF EXISTS "Practitioners can update own record" ON practitioners;
  DROP POLICY IF EXISTS "Practitioners can insert own record" ON practitioners;
  
  -- Drop session policies  
  DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
  DROP POLICY IF EXISTS "Guests can create sessions" ON sessions;
  DROP POLICY IF EXISTS "Participants can update own sessions" ON sessions;
  
  -- Drop review policies
  DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
  DROP POLICY IF EXISTS "Guests can create reviews" ON reviews;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop all existing triggers (if they exist)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_practitioners_updated_at ON practitioners;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_rating_after_review ON reviews;

-- ================================================
-- STEP 2: CREATE TABLES
-- ================================================

-- Profiles table (for both guests and practitioners)
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

-- Practitioners table (additional data for practitioners only)
CREATE TABLE IF NOT EXISTS practitioners (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  in_service BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (healing sessions between guests and practitioners)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  phase TEXT NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting', 'room_timer', 'live', 'ended')),
  live_seconds INTEGER NOT NULL DEFAULT 900,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  practitioner_ready BOOLEAN DEFAULT FALSE,
  guest_ready BOOLEAN DEFAULT FALSE,
  agora_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_users CHECK (practitioner_id != guest_id)
);

-- Reviews table (guest reviews after sessions)
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

-- ================================================
-- STEP 3: CREATE INDEXES
-- ================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Practitioners indexes
CREATE INDEX IF NOT EXISTS idx_practitioners_online ON practitioners(is_online);
CREATE INDEX IF NOT EXISTS idx_practitioners_rating ON practitioners(rating DESC);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_practitioner ON sessions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_practitioner ON reviews(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guest ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 5: CREATE NEW RLS POLICIES
-- ================================================

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- PRACTITIONERS POLICIES
CREATE POLICY "Practitioners are viewable by everyone" 
  ON practitioners FOR SELECT 
  USING (true);

CREATE POLICY "Practitioners can update own record" 
  ON practitioners FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Practitioners can insert own record" 
  ON practitioners FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- SESSIONS POLICIES
CREATE POLICY "Users can view own sessions" 
  ON sessions FOR SELECT 
  USING (auth.uid() = practitioner_id OR auth.uid() = guest_id);

CREATE POLICY "Guests can create sessions" 
  ON sessions FOR INSERT 
  WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "Participants can update own sessions" 
  ON sessions FOR UPDATE 
  USING (auth.uid() = practitioner_id OR auth.uid() = guest_id);

-- REVIEWS POLICIES
CREATE POLICY "Reviews are viewable by everyone" 
  ON reviews FOR SELECT 
  USING (true);

CREATE POLICY "Guests can create reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (auth.uid() = guest_id);

-- ================================================
-- STEP 6: CREATE FUNCTIONS
-- ================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update practitioner rating after a review
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

-- ================================================
-- STEP 7: CREATE TRIGGERS
-- ================================================

-- Auto-update triggers
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

-- Rating update trigger
CREATE TRIGGER update_rating_after_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_rating();

-- ================================================
-- STEP 8: ENABLE REALTIME
-- ================================================

-- Enable realtime for practitioners (online status)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE practitioners;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for sessions (session updates)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- DONE! YOUR DATABASE IS READY
-- ================================================
-- Next steps:
-- 1. Go to Storage tab and create 3 PUBLIC buckets:
--    - avatars
--    - gallery
--    - videos
-- 2. Run the storage RLS setup (next file)
-- ================================================