-- ============================================
-- FIX SUPABASE STORAGE RLS POLICIES
-- ============================================
-- This script fixes Row Level Security policies for Supabase Storage
-- Run this in the Supabase SQL Editor to allow authenticated users to upload files

-- ============================================
-- STEP 1: ENABLE RLS ON STORAGE TABLES
-- ============================================

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on storage.buckets table (if not already enabled)  
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP EXISTING POLICIES (Clean slate)
-- ============================================

-- Drop all existing policies on storage.objects to start fresh
DROP POLICY IF EXISTS "Authenticated users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files in public buckets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to any bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public files are viewable by everyone" ON storage.objects;

-- Drop bucket policies
DROP POLICY IF EXISTS "Public buckets are viewable by everyone" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can view buckets" ON storage.buckets;

-- ============================================
-- STEP 3: CREATE BUCKET POLICIES
-- ============================================

-- Allow everyone to see public buckets
CREATE POLICY "Public buckets are viewable by everyone"
ON storage.buckets FOR SELECT
USING (true);

-- ============================================
-- STEP 4: CREATE OBJECT POLICIES FOR EACH BUCKET
-- ============================================

-- POLICY 1: Allow authenticated users to upload files to their own folder
-- The path should be: {userId}/{filename}
CREATE POLICY "Authenticated users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    -- Check that bucket is one of our allowed buckets
    bucket_id IN ('avatars', 'gallery', 'videos')
    AND 
    -- Check that the path starts with the user's ID
    (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 2: Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    -- Check that bucket is one of our allowed buckets
    bucket_id IN ('avatars', 'gallery', 'videos')
    AND
    -- Check that the path starts with the user's ID
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    -- Same check for the new values
    bucket_id IN ('avatars', 'gallery', 'videos')
    AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 3: Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    -- Check that bucket is one of our allowed buckets
    bucket_id IN ('avatars', 'gallery', 'videos')
    AND
    -- Check that the path starts with the user's ID
    (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 4: Allow anyone to view files in public buckets
-- This is crucial for serving images/videos on the frontend
CREATE POLICY "Anyone can view files in public buckets"
ON storage.objects FOR SELECT
USING (
    -- Allow read access to all files in our public buckets
    bucket_id IN ('avatars', 'gallery', 'videos')
);

-- ============================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Grant permissions to anon for reading public files
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- ============================================
-- STEP 6: VERIFY BUCKET CONFIGURATION
-- ============================================

-- Update buckets to ensure they're public (for read access)
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('avatars', 'gallery', 'videos');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that RLS is enabled
SELECT 
    schemaname,
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename IN ('objects', 'buckets');

-- Check policies on storage.objects
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- Check if buckets exist and are public
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id IN ('avatars', 'gallery', 'videos');

-- ============================================
-- TROUBLESHOOTING TIPS
-- ============================================

/*
If uploads are still failing after running this script:

1. Verify authentication token is valid:
   - Check that auth.uid() returns a valid user ID
   - Ensure the JWT token is being sent in requests

2. Check file path format:
   - Files must be uploaded with path: {userId}/{filename}
   - Example: "38774353-63f2-40f7-a5d1-546b4804e5e3/avatar.jpg"

3. Verify bucket existence:
   - Run: SELECT * FROM storage.buckets;
   - Ensure avatars, gallery, and videos buckets exist

4. Test with Supabase client:
   const { data, error } = await supabase.storage
     .from('avatars')
     .upload(`${user.id}/test.jpg`, file);

5. Enable detailed logging:
   - Check Supabase dashboard logs for specific RLS violations
   - Look for exact policy that's failing

6. For service role operations (admin):
   - Use service role key to bypass RLS entirely
   - This is useful for migrations or admin operations
*/

-- ============================================
-- ALTERNATIVE: SIMPLER POLICIES (Use if above doesn't work)
-- ============================================

/*
-- If the above policies are too restrictive, you can use these simpler ones:

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;

-- Simple upload policy for any authenticated user
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('avatars', 'gallery', 'videos'));

-- Simple read policy for everyone
CREATE POLICY "Anyone can view"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'gallery', 'videos'));

-- Allow authenticated users full control of files
CREATE POLICY "Authenticated users full control"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('avatars', 'gallery', 'videos'))
WITH CHECK (bucket_id IN ('avatars', 'gallery', 'videos'));
*/

-- ============================================
-- END OF FIX SCRIPT
-- ============================================
-- After running this script:
-- 1. Test file upload from your application
-- 2. Verify files can be read/displayed
-- 3. If issues persist, check the alternative policies above