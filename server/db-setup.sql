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

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: users can view all, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Practitioners: everyone can view online list, practitioners can update own
CREATE POLICY "Practitioners viewable by everyone" ON practitioners FOR SELECT USING (true);
CREATE POLICY "Practitioners can update own status" ON practitioners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Practitioners can insert own status" ON practitioners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sessions: only participants can view/update
CREATE POLICY "Sessions viewable by participants" ON sessions FOR SELECT USING (
  auth.uid() = guest_id OR auth.uid() = practitioner_id
);
CREATE POLICY "Sessions updatable by participants" ON sessions FOR UPDATE USING (
  auth.uid() = guest_id OR auth.uid() = practitioner_id
);
CREATE POLICY "Sessions insertable by participants" ON sessions FOR INSERT WITH CHECK (
  auth.uid() = guest_id OR auth.uid() = practitioner_id
);

-- Reviews: viewable by all, insertable by guests
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insertable by guests" ON reviews FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_practitioners_online ON practitioners(online) WHERE online = true;
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(guest_id, practitioner_id);
