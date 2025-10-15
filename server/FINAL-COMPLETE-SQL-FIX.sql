-- =========================================================================
-- COMPLETE SUPABASE STORAGE FIX FOR ALLINYA
-- =========================================================================
-- Run this ENTIRE script in your Supabase SQL Editor
-- This will fix all upload issues once and for all
-- =========================================================================

-- PART 1: CLEAN SLATE - REMOVE ALL OLD POLICIES
-- =========================================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop every single storage policy that exists
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
    RAISE NOTICE 'All existing storage policies removed';
END $$;

-- PART 2: ENSURE BUCKETS EXIST AND ARE PUBLIC
-- =========================================================================
-- Create or update avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true,  -- PUBLIC bucket for easy access
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Create or update gallery bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery', 
    'gallery', 
    true,  -- PUBLIC bucket
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Create or update videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos', 
    'videos', 
    true,  -- PUBLIC bucket
    52428800,  -- 50MB limit
    ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/mpeg', 'video/ogg']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/mpeg', 'video/ogg']::text[];

-- PART 3: CREATE SIMPLE WORKING POLICIES
-- =========================================================================
-- These policies are intentionally simple to ensure they work

-- Policy 1: Allow ALL authenticated users to upload
CREATE POLICY "auth_users_can_upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id IN ('avatars', 'gallery', 'videos')
);

-- Policy 2: Allow EVERYONE to view files (public access)
CREATE POLICY "public_can_view" 
ON storage.objects 
FOR SELECT 
TO public 
USING (
    bucket_id IN ('avatars', 'gallery', 'videos')
);

-- Policy 3: Allow authenticated users to update files
CREATE POLICY "auth_users_can_update" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
    bucket_id IN ('avatars', 'gallery', 'videos')
)
WITH CHECK (
    bucket_id IN ('avatars', 'gallery', 'videos')
);

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "auth_users_can_delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
    bucket_id IN ('avatars', 'gallery', 'videos')
);

-- PART 4: ENSURE RLS IS ENABLED
-- =========================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- PART 5: VERIFY EVERYTHING IS SET UP CORRECTLY
-- =========================================================================
-- Check policies are created
SELECT 
    'Policy Check' as check_type,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All 4 policies created successfully'
        ELSE '❌ Missing policies - expected 4, found ' || COUNT(*)
    END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Check buckets are public
SELECT 
    'Bucket Check' as check_type,
    id as bucket_name,
    CASE 
        WHEN public = true THEN '✅ Public'
        ELSE '❌ Not Public'
    END as status,
    file_size_limit as size_limit_bytes
FROM storage.buckets
WHERE id IN ('avatars', 'gallery', 'videos')
ORDER BY id;

-- Check RLS is enabled
SELECT 
    'RLS Check' as check_type,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS is ENABLED on storage.objects'
        ELSE '❌ RLS is DISABLED on storage.objects'
    END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- PART 6: GRANT NECESSARY PERMISSIONS (just in case)
-- =========================================================================
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.objects TO public;

-- PART 7: SUCCESS MESSAGE
-- =========================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '✅ SUPABASE STORAGE SETUP COMPLETE!';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What this script did:';
    RAISE NOTICE '1. Removed all old broken policies';
    RAISE NOTICE '2. Created/updated 3 public buckets (avatars, gallery, videos)';
    RAISE NOTICE '3. Added 4 simple RLS policies that will work';
    RAISE NOTICE '4. Enabled Row Level Security';
    RAISE NOTICE '5. Granted proper permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '• Upload files from your application';
    RAISE NOTICE '• View uploaded files publicly';
    RAISE NOTICE '• Update and delete files when logged in';
    RAISE NOTICE '';
    RAISE NOTICE 'Test it by uploading a file in your app!';
    RAISE NOTICE '=========================================================';
END $$;

-- =========================================================================
-- END OF SCRIPT
-- =========================================================================