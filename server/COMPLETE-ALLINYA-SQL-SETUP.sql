-- =========================================================================
-- COMPLETE ALLINYA DATABASE AND STORAGE SETUP
-- =========================================================================
-- Run this entire script in your Supabase SQL Editor
-- Then follow the manual steps at the end for storage permissions
-- =========================================================================

-- =========================================================================
-- PART 1: DATABASE TABLES
-- =========================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS practitioners CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT CHECK (role IN ('guest', 'practitioner')) NOT NULL,
    bio TEXT,
    country TEXT,
    avatar_url TEXT,
    gallery_urls TEXT[],
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practitioners table (extends profiles)
CREATE TABLE practitioners (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialties TEXT[],
    hourly_rate DECIMAL(10,2),
    years_experience INTEGER,
    certifications TEXT[],
    languages TEXT[],
    is_online BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sessions INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    availability JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'waiting_room', 'live', 'completed', 'cancelled')) DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    agora_channel TEXT,
    guest_ready BOOLEAN DEFAULT false,
    practitioner_ready BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- =========================================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_practitioners_is_online ON practitioners(is_online);
CREATE INDEX idx_practitioners_rating ON practitioners(rating DESC);
CREATE INDEX idx_sessions_guest_id ON sessions(guest_id);
CREATE INDEX idx_sessions_practitioner_id ON sessions(practitioner_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_reviews_practitioner_id ON reviews(practitioner_id);
CREATE INDEX idx_reviews_session_id ON reviews(session_id);

-- =========================================================================
-- PART 3: ROW LEVEL SECURITY FOR DATABASE TABLES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid()::text = id::text);

-- Practitioners policies
CREATE POLICY "Practitioners are viewable by everyone" 
ON practitioners FOR SELECT 
USING (true);

CREATE POLICY "Practitioners can update own data" 
ON practitioners FOR UPDATE 
USING (auth.uid()::text = id::text);

CREATE POLICY "Users can become practitioners" 
ON practitioners FOR INSERT 
WITH CHECK (auth.uid()::text = id::text);

-- Sessions policies
CREATE POLICY "Users can view own sessions" 
ON sessions FOR SELECT 
USING (
    auth.uid()::text = guest_id::text OR 
    auth.uid()::text = practitioner_id::text
);

CREATE POLICY "Guests can create sessions" 
ON sessions FOR INSERT 
WITH CHECK (auth.uid()::text = guest_id::text);

CREATE POLICY "Session participants can update" 
ON sessions FOR UPDATE 
USING (
    auth.uid()::text = guest_id::text OR 
    auth.uid()::text = practitioner_id::text
);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" 
ON reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for their sessions" 
ON reviews FOR INSERT 
WITH CHECK (
    auth.uid()::text = reviewer_id::text AND
    EXISTS (
        SELECT 1 FROM sessions 
        WHERE sessions.id = session_id 
        AND (sessions.guest_id::text = auth.uid()::text OR sessions.practitioner_id::text = auth.uid()::text)
    )
);

-- =========================================================================
-- PART 4: FUNCTIONS FOR COMMON OPERATIONS
-- =========================================================================

-- Function to update practitioner rating after review
CREATE OR REPLACE FUNCTION update_practitioner_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE practitioners
    SET 
        rating = (
            SELECT AVG(rating)::DECIMAL(3,2) 
            FROM reviews 
            WHERE practitioner_id = NEW.practitioner_id
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE practitioner_id = NEW.practitioner_id
        )
    WHERE id = NEW.practitioner_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
CREATE TRIGGER update_rating_on_review
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_practitioner_rating();

-- Function to update session count
CREATE OR REPLACE FUNCTION update_session_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE practitioners
        SET total_sessions = total_sessions + 1
        WHERE id = NEW.practitioner_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session count
CREATE TRIGGER update_session_count_on_complete
AFTER UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_count();

-- =========================================================================
-- PART 5: STORAGE BUCKETS CONFIGURATION
-- =========================================================================

-- Create or update storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, 
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]),
    ('gallery', 'gallery', true, 10485760, 
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]),
    ('videos', 'videos', true, 52428800, 
     ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/mpeg', 'video/ogg']::text[])
ON CONFLICT (id) 
DO UPDATE SET 
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================================
-- PART 6: VERIFY DATABASE SETUP
-- =========================================================================

-- Check tables exist
SELECT 
    'Tables' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All 4 tables created'
        ELSE '❌ Missing tables'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'practitioners', 'sessions', 'reviews');

-- Check indexes
SELECT 
    'Indexes' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 9 THEN '✅ All indexes created'
        ELSE '⚠️ Some indexes may be missing'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews');

-- Check RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'practitioners', 'sessions', 'reviews')
ORDER BY tablename;

-- Check storage buckets
SELECT 
    id as bucket,
    CASE 
        WHEN public = true THEN '✅ Public'
        ELSE '❌ Private'
    END as status,
    file_size_limit as max_size_bytes
FROM storage.buckets
WHERE id IN ('avatars', 'gallery', 'videos')
ORDER BY id;

-- =========================================================================
-- PART 7: INSERT TEST DATA (Optional - Remove in production)
-- =========================================================================

-- Insert test profiles
INSERT INTO profiles (id, email, name, role, bio, country) VALUES
('1a20c2b4-469d-4187-96ff-3e3da2a1d3a6', 'chefmat2018@gmail.com', 'Jiro Mathieu', 'practitioner', 
 'Experienced healer specializing in energy work, meditation, and holistic wellness.', 'Japan'),
('38774353-63f2-40f7-a5d1-546b4804e5e3', 'cheekyma@hotmail.com', 'Test Guest', 'guest', 
 'Seeking healing and wellness support.', 'USA')
ON CONFLICT (id) DO NOTHING;

-- Insert test practitioner data
INSERT INTO practitioners (id, specialties, hourly_rate, years_experience, is_online, rating) VALUES
('1a20c2b4-469d-4187-96ff-3e3da2a1d3a6', 
 ARRAY['Reiki', 'Crystal Healing', 'Chakra Balancing'], 
 75.00, 5, false, 4.5)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- PART 8: MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD
-- =========================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Complete these manual steps in Supabase Dashboard:';
    RAISE NOTICE '';
    RAISE NOTICE '1. GO TO AUTHENTICATION > POLICIES:';
    RAISE NOTICE '   - Find "storage.objects" table';
    RAISE NOTICE '   - Click the RLS toggle to turn it OFF';
    RAISE NOTICE '   - This allows file uploads to work';
    RAISE NOTICE '';
    RAISE NOTICE '2. GO TO STORAGE:';
    RAISE NOTICE '   - Verify avatars, gallery, videos buckets show as "Public"';
    RAISE NOTICE '   - If not, click each bucket > Settings > Toggle Public ON';
    RAISE NOTICE '';
    RAISE NOTICE '3. TEST UPLOAD:';
    RAISE NOTICE '   - Try uploading a file through your app';
    RAISE NOTICE '   - Files should upload and be publicly accessible';
    RAISE NOTICE '';
    RAISE NOTICE 'Your database is ready! Just complete the storage steps above.';
    RAISE NOTICE '=========================================================';
END $$;

-- =========================================================================
-- END OF COMPLETE SQL SETUP
-- =========================================================================