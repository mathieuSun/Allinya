-- =========================================================================
-- SUPABASE STORAGE FIX FOR USER PERMISSIONS
-- =========================================================================
-- This script works within your permission constraints
-- =========================================================================

-- OPTION 1: DISABLE RLS (This usually works for users)
-- =========================================================================
-- Try this first - it often works even without owner permissions
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Check if it worked
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DISABLED - Uploads should work now!'
        ELSE '❌ RLS still enabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- =========================================================================
-- OPTION 2: IF ABOVE DOESN'T WORK, USE SUPABASE DASHBOARD
-- =========================================================================
-- Go to Supabase Dashboard:
-- 1. Click on "Authentication" in the left sidebar
-- 2. Click on "Policies" tab
-- 3. Find "storage.objects" table
-- 4. Toggle OFF the RLS switch for storage.objects table
-- 5. Or delete all policies for storage.objects

-- =========================================================================
-- OPTION 3: CREATE A SUPPORT FUNCTION (Often Works)
-- =========================================================================
-- Create a function that bypasses RLS
CREATE OR REPLACE FUNCTION public.bypass_rls_for_bucket_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update bucket settings
    UPDATE storage.buckets 
    SET public = true 
    WHERE id IN ('avatars', 'gallery', 'videos');
    
    RAISE NOTICE 'Buckets set to public';
END;
$$;

-- Run the function
SELECT public.bypass_rls_for_bucket_setup();

-- =========================================================================
-- OPTION 4: USE SUPABASE DASHBOARD UI (EASIEST)
-- =========================================================================
/*
MANUAL STEPS IN SUPABASE DASHBOARD:

1. Go to Storage section
2. Click on each bucket (avatars, gallery, videos)
3. Click "Settings" for each bucket
4. Toggle "Public" to ON
5. Save changes

Then go to Authentication > Policies:
1. Find storage.objects table
2. Either:
   - Toggle RLS OFF completely, OR
   - Delete all existing policies and leave RLS off
*/

-- =========================================================================
-- TEST IF UPLOADS WORK
-- =========================================================================
-- After trying the above options, test with this query:
SELECT 
    'Storage Status Check' as check,
    b.id as bucket,
    b.public as is_public,
    CASE 
        WHEN b.public = true THEN '✅ Public - should work'
        ELSE '❌ Not public'
    END as status
FROM storage.buckets b
WHERE b.id IN ('avatars', 'gallery', 'videos');

-- Check RLS status
SELECT 
    'RLS Status' as check,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS OFF - uploads will work'
        WHEN rowsecurity = true THEN '⚠️ RLS ON - might block uploads'
        ELSE 'Unknown'
    END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- =========================================================================
-- IF NOTHING WORKS - CONTACT SUPPORT
-- =========================================================================
/*
If none of the above works, you'll need to:

1. Contact Supabase Support and ask them to:
   - Disable RLS on storage.objects for your project
   - Or grant you permissions to modify storage policies

2. Or use the Supabase Dashboard Storage UI directly:
   - Upload files through the dashboard
   - Files uploaded through dashboard always work
   
3. Alternative approach:
   - Create your own table for file references
   - Upload to a different service (Cloudinary, etc.)
   - Store URLs in your database
*/