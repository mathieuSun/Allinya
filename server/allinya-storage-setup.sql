-- ================================================
-- ALLINYA STORAGE SETUP - RLS POLICIES
-- ================================================
-- Run this AFTER creating storage buckets in Supabase Dashboard
-- This enables proper file uploads for avatars, gallery, and videos
-- ================================================

-- ================================================
-- IMPORTANT: First create buckets in Supabase Dashboard
-- ================================================
-- 1. Go to Storage tab in Supabase Dashboard
-- 2. Create these PUBLIC buckets:
--    - avatars (5MB file limit)
--    - gallery (10MB file limit)  
--    - videos (50MB file limit)
-- 3. Then run this SQL script
-- ================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ================================================
-- DROP EXISTING POLICIES (Safe to re-run)
-- ================================================
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

-- ================================================
-- AVATARS BUCKET POLICIES
-- ================================================

-- Allow authenticated users to upload avatars
CREATE POLICY "Auth users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ================================================
-- GALLERY BUCKET POLICIES
-- ================================================

-- Allow authenticated users to upload gallery images
CREATE POLICY "Auth users can upload gallery" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'gallery' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view gallery images (public bucket)
CREATE POLICY "Anyone can view gallery" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'gallery');

-- Allow users to update their own gallery images
CREATE POLICY "Users can update own gallery" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'gallery' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own gallery images
CREATE POLICY "Users can delete own gallery" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'gallery' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ================================================
-- VIDEOS BUCKET POLICIES
-- ================================================

-- Allow authenticated users to upload videos
CREATE POLICY "Auth users can upload videos" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view videos (public bucket)
CREATE POLICY "Anyone can view videos" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'videos');

-- Allow users to update their own videos
CREATE POLICY "Users can update own videos" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete own videos" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ================================================
-- SIMPLIFIED PERMISSIVE POLICIES (Alternative)
-- ================================================
-- If the above policies don't work, try these simpler ones:

-- DROP ALL existing policies first (uncomment if needed)
-- DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Auth users can upload gallery" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone can view gallery" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own gallery" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own gallery" ON storage.objects;
-- DROP POLICY IF EXISTS "Auth users can upload videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;

-- Then create simple permissive policies:
-- CREATE POLICY "Permissive storage access" ON storage.objects
-- FOR ALL TO authenticated
-- USING (bucket_id IN ('avatars', 'gallery', 'videos'))
-- WITH CHECK (bucket_id IN ('avatars', 'gallery', 'videos'));

-- CREATE POLICY "Public read access" ON storage.objects
-- FOR SELECT TO public
-- USING (bucket_id IN ('avatars', 'gallery', 'videos'));

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these to verify policies are created:

-- Check storage.objects policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check if buckets exist
-- SELECT id, name, public FROM storage.buckets;

-- ================================================
-- END OF STORAGE SETUP
-- ================================================