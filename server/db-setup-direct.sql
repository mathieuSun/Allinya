-- Profiles table - supports both guest and practitioner roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('guest', 'practitioner')) NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  video_url TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practitioners table - presence and rating info
CREATE TABLE IF NOT EXISTS practitioners (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  in_service BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table - handles waiting room and live video phases
CREATE TABLE IF NOT EXISTS sessions (
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

-- Reviews table - placeholder for future ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id),
  practitioner_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_practitioners_online ON practitioners(online);
CREATE INDEX IF NOT EXISTS idx_sessions_practitioner ON sessions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_reviews_practitioner ON reviews(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON reviews(session_id);