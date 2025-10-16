-- ============================================
-- COMPLETE DATABASE FIX FOR ALLINYA
-- ============================================
-- This script fixes ALL database issues:
-- 1. Correct primary keys (practitioners.id not user_id)
-- 2. Correct field names (is_online not online)
-- 3. All RLS policies
-- 4. Storage bucket permissions
-- ============================================

-- STEP 1: DROP EVERYTHING AND START FRESH
-- ============================================

-- Disable RLS temporarily
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS practitioners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;

-- Drop all existing tables
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS practitioners CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- STEP 2: CREATE TABLES WITH CORRECT SCHEMA
-- ============================================

-- Profiles table (base user data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('guest', 'practitioner')) NOT NULL,
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

-- Practitioners table (CRITICAL: using 'id' as primary key and 'is_online' field)
CREATE TABLE practitioners (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,  -- IMPORTANT: is_online not online!
  in_service BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  phase TEXT CHECK (phase IN ('waiting', 'live', 'ended')) NOT NULL,
  waiting_seconds INTEGER NOT NULL DEFAULT 300,
  live_seconds INTEGER NOT NULL,
  waiting_started_at TIMESTAMPTZ,
  live_started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  agora_channel TEXT NOT NULL,
  agora_uid_practitioner TEXT NOT NULL,
  agora_uid_guest TEXT NOT NULL,
  ready_practitioner BOOLEAN NOT NULL DEFAULT FALSE,
  ready_guest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_practitioners_is_online ON practitioners(is_online);
CREATE INDEX idx_practitioners_rating ON practitioners(rating DESC);
CREATE INDEX idx_sessions_practitioner ON sessions(practitioner_id);
CREATE INDEX idx_sessions_guest ON sessions(guest_id);
CREATE INDEX idx_sessions_phase ON sessions(phase);
CREATE INDEX idx_reviews_practitioner ON reviews(practitioner_id);
CREATE INDEX idx_reviews_session ON reviews(session_id);

-- STEP 4: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid()::text = id::text);

CREATE POLICY "Enable insert for authenticated users only" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

-- Practitioners policies
CREATE POLICY "Practitioners are viewable by everyone" 
  ON practitioners FOR SELECT 
  USING (true);

CREATE POLICY "Practitioners can update own data" 
  ON practitioners FOR UPDATE 
  USING (auth.uid()::text = id::text);

CREATE POLICY "Enable insert for authenticated users" 
  ON practitioners FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

-- Sessions policies
CREATE POLICY "Sessions viewable by participants" 
  ON sessions FOR SELECT 
  USING (
    auth.uid()::text = practitioner_id::text OR 
    auth.uid()::text = guest_id::text
  );

CREATE POLICY "Guests can create sessions" 
  ON sessions FOR INSERT 
  WITH CHECK (auth.uid()::text = guest_id::text);

CREATE POLICY "Participants can update sessions" 
  ON sessions FOR UPDATE 
  USING (
    auth.uid()::text = practitioner_id::text OR 
    auth.uid()::text = guest_id::text
  );

-- Reviews policies
CREATE POLICY "Reviews are public" 
  ON reviews FOR SELECT 
  USING (true);

CREATE POLICY "Guests can create reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (auth.uid()::text = guest_id::text);

-- STEP 6: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- STEP 7: FIX STORAGE.OBJECTS RLS POLICIES
-- ============================================

-- First check if storage schema exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Drop all existing storage policies
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable select for everyone" ON storage.objects;
    DROP POLICY IF EXISTS "Enable update for users based on bucket_id" ON storage.objects;
    DROP POLICY IF EXISTS "Enable delete for users based on bucket_id" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
    
    -- Create new policies with proper type casting
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (true);
    
    CREATE POLICY "Allow public downloads" ON storage.objects
      FOR SELECT TO public
      USING (true);
    
    CREATE POLICY "Allow authenticated updates" ON storage.objects
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = owner::text)
      WITH CHECK (auth.uid()::text = owner::text);
    
    CREATE POLICY "Allow authenticated deletes" ON storage.objects
      FOR DELETE TO authenticated
      USING (auth.uid()::text = owner::text);
  END IF;
END $$;

-- STEP 8: ENSURE BUCKETS ARE PUBLIC
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    UPDATE storage.buckets SET public = true WHERE name IN ('avatars', 'gallery', 'videos');
  END IF;
END $$;

-- STEP 9: NOTIFY POSTREST TO RELOAD SCHEMA
-- ============================================

NOTIFY pgrst, 'reload schema';

-- STEP 10: INSERT TEST DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ============================================

-- Test user 1: Practitioner
INSERT INTO profiles (id, role, display_name, country, bio, avatar_url, specialties) 
VALUES (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'practitioner',
  'Dr. Sarah Johnson',
  'USA',
  'Certified energy healer with 10 years experience',
  NULL,
  ARRAY['Reiki', 'Chakra Balancing']
) ON CONFLICT (id) DO NOTHING;

-- Add practitioner data
INSERT INTO practitioners (id, is_online, rating, review_count) 
VALUES (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  true,
  4.8,
  25
) ON CONFLICT (id) DO NOTHING;

-- Test user 2: Guest
INSERT INTO profiles (id, role, display_name, country, bio) 
VALUES (
  'b2222222-2222-2222-2222-222222222222'::uuid,
  'guest',
  'John Smith',
  'Canada',
  'Seeking healing and wellness'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Database setup complete! All tables, policies, and storage permissions configured.
-- The practitioners table now correctly uses:
-- - 'id' as primary key (not 'user_id')
-- - 'is_online' field (not 'online')
-- This matches what your storage.ts code expects after PostgREST workarounds.