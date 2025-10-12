-- Create Test Users for Allinya Platform
-- This script creates two test users with profiles and practitioner records
-- Run this in your Supabase SQL Editor

-- Note: Supabase Auth doesn't allow direct password insertion via SQL
-- Instead, we'll create the users through the Supabase Dashboard or use the signup flow
-- This script sets up the profile and practitioner data for existing auth users

-- First, you need to create these users in Supabase Auth:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add User" and create:
--    - Email: chefmat2018@gmail.com, Password: 12345678
--    - Email: cheekyma@hotmail.com, Password: 12345678

-- After creating the auth users, run this script to set up their profiles:

-- Create profiles for test users (using the IDs from auth.users)
DO $$
DECLARE
  practitioner_id UUID;
  guest_id UUID;
BEGIN
  -- Get the user IDs from auth.users
  SELECT id INTO practitioner_id FROM auth.users WHERE email = 'chefmat2018@gmail.com';
  SELECT id INTO guest_id FROM auth.users WHERE email = 'cheekyma@hotmail.com';

  -- Only proceed if users exist
  IF practitioner_id IS NOT NULL THEN
    -- Insert or update practitioner profile
    INSERT INTO profiles (
      id, role, display_name, country, bio, avatar_url, 
      gallery_urls, video_url, specialties, created_at, updated_at
    ) VALUES (
      practitioner_id,
      'practitioner',
      'Dr. Sarah Chen',
      'USA',
      'Holistic healing practitioner specializing in energy work, meditation, and chakra balancing. 15+ years of experience helping people find inner peace and healing.',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      ARRAY['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400'],
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      ARRAY['Reiki', 'Meditation', 'Energy Healing', 'Chakra Balancing', 'Crystal Therapy'],
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      display_name = EXCLUDED.display_name,
      country = EXCLUDED.country,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      gallery_urls = EXCLUDED.gallery_urls,
      video_url = EXCLUDED.video_url,
      specialties = EXCLUDED.specialties,
      updated_at = NOW();

    -- Insert or update practitioner record
    INSERT INTO practitioners (
      user_id, online, in_service, rating, total_reviews, created_at, updated_at
    ) VALUES (
      practitioner_id,
      false,
      false,
      4.85,
      127,
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      online = EXCLUDED.online,
      in_service = EXCLUDED.in_service,
      rating = EXCLUDED.rating,
      total_reviews = EXCLUDED.total_reviews,
      updated_at = NOW();

    RAISE NOTICE 'Created/updated practitioner profile for chefmat2018@gmail.com';
  ELSE
    RAISE NOTICE 'Practitioner user chefmat2018@gmail.com not found in auth.users';
  END IF;

  IF guest_id IS NOT NULL THEN
    -- Insert or update guest profile
    INSERT INTO profiles (
      id, role, display_name, country, bio, avatar_url, 
      gallery_urls, video_url, specialties, created_at, updated_at
    ) VALUES (
      guest_id,
      'guest',
      'John Matthews',
      'Canada',
      'Seeking healing and wellness guidance for chronic stress and anxiety',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      ARRAY[]::TEXT[],
      NULL,
      ARRAY[]::TEXT[],
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      display_name = EXCLUDED.display_name,
      country = EXCLUDED.country,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      gallery_urls = EXCLUDED.gallery_urls,
      video_url = EXCLUDED.video_url,
      specialties = EXCLUDED.specialties,
      updated_at = NOW();

    RAISE NOTICE 'Created/updated guest profile for cheekyma@hotmail.com';
  ELSE
    RAISE NOTICE 'Guest user cheekyma@hotmail.com not found in auth.users';
  END IF;
END $$;

-- Verify the setup
SELECT 
  p.id,
  p.email,
  pr.role,
  pr.display_name,
  pr.country,
  CASE 
    WHEN pr.role = 'practitioner' THEN prac.online
    ELSE NULL
  END as online,
  CASE 
    WHEN pr.role = 'practitioner' THEN prac.rating
    ELSE NULL
  END as rating
FROM auth.users p
LEFT JOIN profiles pr ON p.id = pr.id
LEFT JOIN practitioners prac ON p.id = prac.user_id
WHERE p.email IN ('chefmat2018@gmail.com', 'cheekyma@hotmail.com');

-- Instructions:
-- 1. First create the users in Supabase Dashboard > Authentication > Users
-- 2. Then run this SQL script in Supabase SQL Editor
-- 3. The test users will be ready to use for testing