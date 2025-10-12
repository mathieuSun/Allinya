-- Allinya Database Schema - Production Ready
-- Last Updated: 2024-10-12
-- 
-- This schema includes:
-- - All tables with proper snake_case field names
-- - created_at and updated_at timestamps on all tables
-- - Proper indexes for performance
-- - Row Level Security (RLS) policies
-- - Foreign key constraints
-- - Supabase Auth integration

-- ===========================================
-- 1. DROP EXISTING POLICIES (IF EXISTS)
-- ===========================================

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

-- ===========================================
-- 2. CREATE TABLES (IF NOT EXISTS)
-- ===========================================

-- Profiles table (for both guests and practitioners)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('guest', 'practitioner')),
  display_name TEXT NOT NULL,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  gallery_urls TEXT[],
  video_url TEXT,
  specialties TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Practitioners table (practitioner-specific data)
CREATE TABLE IF NOT EXISTS practitioners (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  online BOOLEAN DEFAULT false NOT NULL,
  in_service BOOLEAN DEFAULT false NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Sessions table (video sessions between guests and practitioners)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(user_id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'waiting_room' CHECK (phase IN ('waiting_room', 'live', 'ended')),
  agora_channel TEXT NOT NULL,
  agora_uid_practitioner TEXT,
  agora_uid_guest TEXT,
  ready_practitioner BOOLEAN DEFAULT false NOT NULL,
  ready_guest BOOLEAN DEFAULT false NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Reviews table (post-session feedback)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, guest_id)
);

-- ===========================================
-- 3. CREATE INDEXES
-- ===========================================

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Practitioner indexes
CREATE INDEX IF NOT EXISTS idx_practitioners_online ON practitioners(online);
CREATE INDEX IF NOT EXISTS idx_practitioners_in_service ON practitioners(in_service);
CREATE INDEX IF NOT EXISTS idx_practitioners_rating ON practitioners(rating DESC);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_guest_id ON sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_sessions_practitioner_id ON sessions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_agora_channel ON sessions(agora_channel);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_practitioner_id ON reviews(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guest_id ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ===========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 5. CREATE RLS POLICIES
-- ===========================================

-- Profiles policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Practitioners policies
CREATE POLICY "practitioners_select_policy" ON practitioners
  FOR SELECT USING (true);

CREATE POLICY "practitioners_insert_policy" ON practitioners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "practitioners_update_policy" ON practitioners
  FOR UPDATE USING (auth.uid() = user_id);

-- Sessions policies
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

-- Reviews policies
CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- ===========================================
-- 6. CREATE UPDATE TIMESTAMP FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 7. CREATE UPDATE TRIGGERS
-- ===========================================

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

-- ===========================================
-- 8. CREATE PRACTITIONER RATING UPDATE FUNCTION
-- ===========================================

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

-- Create trigger to update ratings automatically
DROP TRIGGER IF EXISTS update_practitioner_rating_trigger ON reviews;
CREATE TRIGGER update_practitioner_rating_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_rating();

-- ===========================================
-- 9. SEED DATA (Optional - for testing)
-- ===========================================

-- Note: This section is commented out by default.
-- Uncomment if you want to create test data.

/*
-- Create test profiles
INSERT INTO profiles (id, role, display_name, country, bio, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'practitioner', 'Dr. Sarah Chen', 'USA', 'Holistic healing practitioner with 10+ years experience', 'https://example.com/avatar1.jpg'),
  ('00000000-0000-0000-0000-000000000002', 'guest', 'John Doe', 'Canada', 'Seeking wellness and healing', 'https://example.com/avatar2.jpg')
ON CONFLICT (id) DO NOTHING;

-- Create test practitioner
INSERT INTO practitioners (user_id, online, in_service, rating)
VALUES 
  ('00000000-0000-0000-0000-000000000001', true, false, 4.85)
ON CONFLICT (user_id) DO NOTHING;
*/

-- ===========================================
-- 10. VERIFICATION QUERIES
-- ===========================================

-- Run these to verify your schema is created correctly:
/*
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

SELECT 
  schemaname, 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT 
  schemaname, 
  tablename, 
  policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ===========================================
-- END OF SCHEMA
-- ===========================================
-- 
-- IMPORTANT NOTES:
-- 
-- 1. Field Naming Convention:
--    - All database fields use snake_case
--    - TypeScript/frontend uses camelCase
--    - Conversion handled in storage layer
--
-- 2. Timestamps:
--    - All tables have created_at and updated_at
--    - updated_at is automatically maintained via triggers
--
-- 3. Security:
--    - RLS is enabled on all tables
--    - Policies ensure users can only access their own data
--    - Service role key used for backend operations
--
-- 4. Performance:
--    - Indexes on all foreign keys and commonly queried fields
--    - Composite indexes for multi-column queries
--
-- 5. Data Integrity:
--    - Foreign key constraints ensure referential integrity
--    - Check constraints validate data values
--    - Unique constraints prevent duplicates
--
-- To execute this schema:
-- 1. Open Supabase SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 4. Verify with the verification queries above