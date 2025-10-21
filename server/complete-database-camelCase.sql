-- =========================================================================
-- ALLINYA DATABASE SETUP - Complete Schema with CamelCase
-- =========================================================================
-- This script creates the complete Allinya database schema with:
-- - All tables using camelCase column names
-- - Foreign key relationships
-- - Indexes for performance
-- - Row Level Security (RLS) policies
-- - Automatic timestamp triggers
-- - Review count calculation
-- =========================================================================

-- =========================================================================
-- SECTION 1: CLEANUP & PREPARATION
-- =========================================================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS practitioners CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_practitioner_review_count() CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- SECTION 2: TABLE DEFINITIONS (with camelCase columns)
-- =========================================================================

-- ---------------------------------------------------------
-- Profiles Table - Core user information
-- ---------------------------------------------------------
CREATE TABLE profiles (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "role" TEXT NOT NULL CHECK ("role" IN ('guest', 'practitioner')),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Core user profiles supporting both guest and practitioner roles';
COMMENT ON COLUMN profiles."userId" IS 'Reference to Supabase auth.users table';
COMMENT ON COLUMN profiles."role" IS 'User role: either guest or practitioner';
COMMENT ON COLUMN profiles."galleryUrls" IS 'Array of image URLs for user gallery';

-- ---------------------------------------------------------
-- Practitioners Table - Practitioner-specific information
-- ---------------------------------------------------------
CREATE TABLE practitioners (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hourlyRate" NUMERIC(10, 2),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "inService" BOOLEAN NOT NULL DEFAULT false,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE practitioners IS 'Practitioner-specific information including status and rates';
COMMENT ON COLUMN practitioners."isOnline" IS 'Whether practitioner is currently online';
COMMENT ON COLUMN practitioners."inService" IS 'Whether practitioner is currently in a session';
COMMENT ON COLUMN practitioners."reviewCount" IS 'Cached count of reviews for performance';

-- ---------------------------------------------------------
-- Sessions Table - Video session information
-- ---------------------------------------------------------
CREATE TABLE sessions (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "practitionerId" UUID REFERENCES practitioners(id) ON DELETE CASCADE NOT NULL,
    "guestId" UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting' CHECK ("status" IN ('waiting', 'live', 'ended', 'cancelled')),
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "waitingSeconds" INTEGER NOT NULL DEFAULT 60,
    "liveSeconds" INTEGER NOT NULL DEFAULT 900,
    "waitingStartedAt" TIMESTAMPTZ,
    "liveStartedAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "acknowledgedPractitioner" BOOLEAN NOT NULL DEFAULT false,
    "readyPractitioner" BOOLEAN NOT NULL DEFAULT false,
    "readyGuest" BOOLEAN NOT NULL DEFAULT false,
    "agoraChannel" TEXT,
    "agoraUidGuest" TEXT,
    "agoraUidPractitioner" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Video session details including Agora WebRTC configuration';
COMMENT ON COLUMN sessions."status" IS 'Session status: waiting, live, ended, or cancelled';
COMMENT ON COLUMN sessions."agoraChannel" IS 'Unique channel identifier for Agora WebRTC';
COMMENT ON COLUMN sessions."waitingSeconds" IS 'Duration of waiting phase in seconds';
COMMENT ON COLUMN sessions."liveSeconds" IS 'Duration of live session in seconds';

-- ---------------------------------------------------------
-- Reviews Table - Post-session feedback
-- ---------------------------------------------------------
CREATE TABLE reviews (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId" UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    "guestId" UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    "practitionerId" UUID REFERENCES practitioners(id) ON DELETE CASCADE NOT NULL,
    "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Guest reviews and ratings for completed sessions';
COMMENT ON COLUMN reviews."rating" IS 'Rating from 1 to 5 stars';

-- =========================================================================
-- SECTION 3: INDEXES FOR PERFORMANCE
-- =========================================================================

-- Profiles indexes
CREATE UNIQUE INDEX idx_profiles_userId ON profiles("userId");
CREATE INDEX idx_profiles_role ON profiles("role");

-- Practitioners indexes  
CREATE UNIQUE INDEX idx_practitioners_userId ON practitioners("userId");
CREATE INDEX idx_practitioners_isOnline ON practitioners("isOnline");
CREATE INDEX idx_practitioners_inService ON practitioners("inService");
CREATE INDEX idx_practitioners_hourlyRate ON practitioners("hourlyRate");

-- Sessions indexes
CREATE INDEX idx_sessions_practitionerId ON sessions("practitionerId");
CREATE INDEX idx_sessions_guestId ON sessions("guestId");
CREATE INDEX idx_sessions_status ON sessions("status");
CREATE INDEX idx_sessions_createdAt ON sessions("createdAt");
CREATE INDEX idx_sessions_status_practitioner ON sessions("status", "practitionerId");

-- Reviews indexes
CREATE INDEX idx_reviews_practitionerId ON reviews("practitionerId");
CREATE INDEX idx_reviews_sessionId ON reviews("sessionId");
CREATE INDEX idx_reviews_guestId ON reviews("guestId");
CREATE INDEX idx_reviews_rating ON reviews("rating");

-- =========================================================================
-- SECTION 4: FUNCTIONS & TRIGGERS
-- =========================================================================

-- ---------------------------------------------------------
-- Function to automatically update updatedAt timestamp
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updatedAt trigger to all tables with updatedAt column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON practitioners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- Function to calculate and update practitioner review count
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_practitioner_review_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update review count for the practitioner
    UPDATE practitioners
    SET "reviewCount" = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE "practitionerId" = NEW."practitionerId"
    )
    WHERE "id" = NEW."practitionerId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update review count when a review is inserted
CREATE TRIGGER update_practitioner_review_count_on_insert
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION calculate_practitioner_review_count();

-- Trigger to recalculate review count when a review is deleted
CREATE OR REPLACE FUNCTION recalculate_practitioner_review_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE practitioners
    SET "reviewCount" = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE "practitionerId" = OLD."practitionerId"
    )
    WHERE "id" = OLD."practitionerId";
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_practitioner_review_count_on_delete
AFTER DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION recalculate_practitioner_review_count_on_delete();

-- =========================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- Profiles RLS Policies
-- ---------------------------------------------------------

-- Public read access for all profiles
CREATE POLICY "Profiles are viewable by everyone" 
    ON profiles FOR SELECT
    USING (true);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Authenticated users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = "userId");

-- ---------------------------------------------------------
-- Practitioners RLS Policies
-- ---------------------------------------------------------

-- Public read access for all practitioners
CREATE POLICY "Practitioners are viewable by everyone" 
    ON practitioners FOR SELECT
    USING (true);

-- Practitioners can update their own record
CREATE POLICY "Practitioners can update their own record" 
    ON practitioners FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = practitioners."userId" 
            AND profiles."userId" = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = practitioners."userId" 
            AND profiles."userId" = auth.uid()
        )
    );

-- Practitioners can insert their own record
CREATE POLICY "Practitioners can insert their own record" 
    ON practitioners FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = practitioners."userId" 
            AND profiles."userId" = auth.uid()
            AND profiles."role" = 'practitioner'
        )
    );

-- ---------------------------------------------------------
-- Sessions RLS Policies
-- ---------------------------------------------------------

-- Authenticated users can read sessions they're part of
CREATE POLICY "Users can view their own sessions" 
    ON sessions FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                -- Check if user is the practitioner
                SELECT 1 FROM practitioners p
                JOIN profiles prof ON prof."id" = p."userId"
                WHERE p."id" = sessions."practitionerId" 
                AND prof."userId" = auth.uid()
            )
            OR EXISTS (
                -- Check if user is the guest
                SELECT 1 FROM profiles 
                WHERE profiles."id" = sessions."guestId" 
                AND profiles."userId" = auth.uid()
            )
        )
    );

-- Authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions" 
    ON sessions FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = sessions."guestId" 
            AND profiles."userId" = auth.uid()
        )
    );

-- Users can update sessions they're part of
CREATE POLICY "Users can update their own sessions" 
    ON sessions FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                -- Check if user is the practitioner
                SELECT 1 FROM practitioners p
                JOIN profiles prof ON prof."id" = p."userId"
                WHERE p."id" = sessions."practitionerId" 
                AND prof."userId" = auth.uid()
            )
            OR EXISTS (
                -- Check if user is the guest
                SELECT 1 FROM profiles 
                WHERE profiles."id" = sessions."guestId" 
                AND profiles."userId" = auth.uid()
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                -- Check if user is the practitioner
                SELECT 1 FROM practitioners p
                JOIN profiles prof ON prof."id" = p."userId"
                WHERE p."id" = sessions."practitionerId" 
                AND prof."userId" = auth.uid()
            )
            OR EXISTS (
                -- Check if user is the guest
                SELECT 1 FROM profiles 
                WHERE profiles."id" = sessions."guestId" 
                AND profiles."userId" = auth.uid()
            )
        )
    );

-- ---------------------------------------------------------
-- Reviews RLS Policies
-- ---------------------------------------------------------

-- Public read access for all reviews
CREATE POLICY "Reviews are viewable by everyone" 
    ON reviews FOR SELECT
    USING (true);

-- Authenticated guests can create reviews for their sessions
CREATE POLICY "Guests can create reviews for their sessions" 
    ON reviews FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = reviews."guestId" 
            AND profiles."userId" = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions."id" = reviews."sessionId"
            AND sessions."guestId" = reviews."guestId"
            AND sessions."status" = 'ended'
        )
    );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" 
    ON reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = reviews."guestId" 
            AND profiles."userId" = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles."id" = reviews."guestId" 
            AND profiles."userId" = auth.uid()
        )
    );

-- =========================================================================
-- SECTION 6: INITIAL DATA & HELPER FUNCTIONS
-- =========================================================================

-- ---------------------------------------------------------
-- Helper function to get practitioner stats
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION get_practitioner_stats("practitionerId" UUID)
RETURNS TABLE (
    "totalSessions" BIGINT,
    "averageRating" NUMERIC,
    "totalReviews" BIGINT,
    "completedSessions" BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s."id") AS "totalSessions",
        AVG(r."rating")::NUMERIC(3,2) AS "averageRating",
        COUNT(DISTINCT r."id") AS "totalReviews",
        COUNT(DISTINCT CASE WHEN s."status" = 'ended' THEN s."id" END) AS "completedSessions"
    FROM practitioners p
    LEFT JOIN sessions s ON s."practitionerId" = p."id"
    LEFT JOIN reviews r ON r."practitionerId" = p."id"
    WHERE p."id" = $1
    GROUP BY p."id";
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------
-- Helper function to get active sessions for a user
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_sessions_for_user("userId" UUID)
RETURNS TABLE (
    "sessionId" UUID,
    "status" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s."id" AS "sessionId",
        s."status",
        CASE 
            WHEN s."guestId" = prof."id" THEN 'guest'
            WHEN p."userId" = prof."id" THEN 'practitioner'
        END AS "role",
        s."createdAt"
    FROM profiles prof
    LEFT JOIN sessions s ON s."guestId" = prof."id"
    LEFT JOIN practitioners p ON p."id" = s."practitionerId"
    WHERE 
        prof."userId" = $1 
        AND s."status" IN ('waiting', 'live')
        AND (s."guestId" = prof."id" OR p."userId" = prof."id")
    ORDER BY s."createdAt" DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================================================================
-- SECTION 7: GRANTS FOR AUTHENTICATED USERS
-- =========================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon users for public read operations
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON profiles, practitioners, reviews TO anon;

-- =========================================================================
-- SECTION 8: VALIDATION & DATA INTEGRITY
-- =========================================================================

-- Ensure practitioners have a practitioner role in profiles
CREATE OR REPLACE FUNCTION validate_practitioner_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE "id" = NEW."userId" 
        AND "role" = 'practitioner'
    ) THEN
        RAISE EXCEPTION 'User must have practitioner role in profiles table';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_practitioner_role
BEFORE INSERT OR UPDATE ON practitioners
FOR EACH ROW EXECUTE FUNCTION validate_practitioner_role();

-- Ensure sessions can't be created with offline practitioners
CREATE OR REPLACE FUNCTION validate_practitioner_online()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."status" = 'waiting' AND NOT EXISTS (
        SELECT 1 FROM practitioners 
        WHERE "id" = NEW."practitionerId" 
        AND "isOnline" = true
        AND "inService" = false
    ) THEN
        RAISE EXCEPTION 'Practitioner must be online and not in service to start a session';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_practitioner_available
BEFORE INSERT ON sessions
FOR EACH ROW EXECUTE FUNCTION validate_practitioner_online();

-- =========================================================================
-- END OF ALLINYA DATABASE SETUP
-- =========================================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Allinya Database Setup Complete!';
    RAISE NOTICE '====================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '  ✓ profiles (with camelCase columns)';
    RAISE NOTICE '  ✓ practitioners (with camelCase columns)';
    RAISE NOTICE '  ✓ sessions (with camelCase columns)';
    RAISE NOTICE '  ✓ reviews (with camelCase columns)';
    RAISE NOTICE '';
    RAISE NOTICE 'Configured Features:';
    RAISE NOTICE '  ✓ Foreign key relationships';
    RAISE NOTICE '  ✓ Performance indexes';
    RAISE NOTICE '  ✓ Row Level Security (RLS) policies';
    RAISE NOTICE '  ✓ Automatic updatedAt timestamps';
    RAISE NOTICE '  ✓ Automatic review count calculation';
    RAISE NOTICE '  ✓ Data validation triggers';
    RAISE NOTICE '  ✓ Helper functions for stats and queries';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Run this script in Supabase SQL editor';
    RAISE NOTICE '  2. Verify tables and relationships';
    RAISE NOTICE '  3. Test RLS policies with authenticated users';
    RAISE NOTICE '  4. Configure storage buckets if needed';
    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
END $$;