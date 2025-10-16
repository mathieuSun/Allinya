-- ================================================
-- ALLINYA STORAGE RLS SETUP
-- ================================================
-- Run this AFTER:
-- 1. Running ALLINYA_FULL_SETUP.sql
-- 2. Creating storage buckets in Supabase Dashboard
-- ================================================

-- ================================================
-- PREREQUISITE: CREATE BUCKETS FIRST
-- ================================================
-- Go to Storage tab in Supabase and create 3 PUBLIC buckets:
-- 1. avatars (set to PUBLIC)
-- 2. gallery (set to PUBLIC)
-- 3. videos (set to PUBLIC)
-- ================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CLEAN UP OLD STORAGE POLICIES
-- ================================================
DO $$ 
BEGIN
  -- Drop all old storage policies
  DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
  
  DROP POLICY IF EXISTS "Auth users can upload gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own gallery" ON storage.objects;
  
  DROP POLICY IF EXISTS "Auth users can upload videos" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
  
  -- Drop any permissive policies
  DROP POLICY IF EXISTS "Permissive storage access" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ================================================
-- CREATE SIMPLE PERMISSIVE POLICIES
-- ================================================
-- These policies allow authenticated users to manage files
-- and everyone to view files in public buckets

-- Allow authenticated users to upload/update/delete in our buckets
CREATE POLICY "Authenticated users can manage storage" 
ON storage.objects 
FOR ALL 
TO authenticated
USING (bucket_id IN ('avatars', 'gallery', 'videos'))
WITH CHECK (bucket_id IN ('avatars', 'gallery', 'videos'));

-- Allow everyone to view files in our public buckets
CREATE POLICY "Anyone can view public files" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id IN ('avatars', 'gallery', 'videos'));

-- ================================================
-- VERIFICATION QUERY
-- ================================================
-- Run this to check if policies were created:
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- You should see:
-- 1. "Authenticated users can manage storage" - for authenticated role
-- 2. "Anyone can view public files" - for public role

-- ================================================
-- TROUBLESHOOTING
-- ================================================
-- If uploads still don't work:
-- 1. Make sure buckets are set to PUBLIC in Storage tab
-- 2. Check browser console for specific error messages
-- 3. Try uploading directly in Supabase Dashboard to test
-- ================================================