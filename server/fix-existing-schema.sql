-- Fix Existing Schema - Add Missing Columns
-- This script adds missing columns to existing tables

-- ===========================================
-- 1. Add missing columns to existing tables
-- ===========================================

-- Add missing columns to sessions table if they don't exist
DO $$ 
BEGIN
  -- Add started_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='sessions' AND column_name='started_at') THEN
    ALTER TABLE sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Add ended_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='sessions' AND column_name='ended_at') THEN
    ALTER TABLE sessions ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='sessions' AND column_name='created_at') THEN
    ALTER TABLE sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='sessions' AND column_name='updated_at') THEN
    ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Add missing columns to practitioners table if they don't exist
DO $$ 
BEGIN
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='practitioners' AND column_name='created_at') THEN
    ALTER TABLE practitioners ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='practitioners' AND column_name='updated_at') THEN
    ALTER TABLE practitioners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Add missing columns to reviews table if they don't exist
DO $$ 
BEGIN
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='reviews' AND column_name='created_at') THEN
    ALTER TABLE reviews ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='reviews' AND column_name='updated_at') THEN
    ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- ===========================================
-- 2. NOW CREATE INDEXES (these should work after columns are added)
-- ===========================================

-- Drop existing indexes if they exist (to avoid conflicts)
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_practitioners_online;
DROP INDEX IF EXISTS idx_practitioners_in_service;
DROP INDEX IF EXISTS idx_practitioners_rating;
DROP INDEX IF EXISTS idx_sessions_guest_id;
DROP INDEX IF EXISTS idx_sessions_practitioner_id;
DROP INDEX IF EXISTS idx_sessions_phase;
DROP INDEX IF EXISTS idx_sessions_started_at;
DROP INDEX IF EXISTS idx_sessions_agora_channel;
DROP INDEX IF EXISTS idx_reviews_practitioner_id;
DROP INDEX IF EXISTS idx_reviews_session_id;
DROP INDEX IF EXISTS idx_reviews_guest_id;
DROP INDEX IF EXISTS idx_reviews_created_at;

-- Recreate indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_practitioners_online ON practitioners(online);
CREATE INDEX idx_practitioners_in_service ON practitioners(in_service);
CREATE INDEX idx_practitioners_rating ON practitioners(rating DESC);
CREATE INDEX idx_sessions_guest_id ON sessions(guest_id);
CREATE INDEX idx_sessions_practitioner_id ON sessions(practitioner_id);
CREATE INDEX idx_sessions_phase ON sessions(phase);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_agora_channel ON sessions(agora_channel);
CREATE INDEX idx_reviews_practitioner_id ON reviews(practitioner_id);
CREATE INDEX idx_reviews_session_id ON reviews(session_id);
CREATE INDEX idx_reviews_guest_id ON reviews(guest_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ===========================================
-- 3. DROP AND RECREATE POLICIES (safer approach)
-- ===========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "practitioners_select_policy" ON practitioners;
DROP POLICY IF EXISTS "practitioners_insert_policy" ON practitioners;
DROP POLICY IF EXISTS "practitioners_update_policy" ON practitioners;
DROP POLICY IF EXISTS "sessions_select_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_update_policy" ON sessions;
DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "practitioners_select_policy" ON practitioners
  FOR SELECT USING (true);

CREATE POLICY "practitioners_insert_policy" ON practitioners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "practitioners_update_policy" ON practitioners
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_select_policy" ON sessions
  FOR SELECT USING (
    auth.uid() = guest_id OR 
    auth.uid() = practitioner_id
  );

CREATE POLICY "sessions_insert_policy" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "sessions_update_policy" ON sessions
  FOR UPDATE USING (
    auth.uid() = guest_id OR 
    auth.uid() = practitioner_id
  );

CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- ===========================================
-- 4. CREATE OR REPLACE FUNCTIONS AND TRIGGERS
-- ===========================================

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_practitioners_updated_at ON practitioners;
CREATE TRIGGER update_practitioners_updated_at 
  BEFORE UPDATE ON practitioners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at 
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create practitioner rating update function
CREATE OR REPLACE FUNCTION update_practitioner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE practitioners
  SET 
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE practitioner_id = NEW.practitioner_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE practitioner_id = NEW.practitioner_id
    )
  WHERE user_id = NEW.practitioner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ratings
DROP TRIGGER IF EXISTS update_practitioner_rating_trigger ON reviews;
CREATE TRIGGER update_practitioner_rating_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_rating();

-- ===========================================
-- 5. VERIFY THE CHANGES
-- ===========================================

-- Check that all columns exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'practitioners', 'sessions', 'reviews')
  AND column_name IN ('created_at', 'updated_at', 'started_at', 'ended_at')
ORDER BY table_name, column_name;

-- Check that indexes were created
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews')
ORDER BY tablename, indexname;

-- Success message
SELECT 'Schema fix completed successfully!' as message;