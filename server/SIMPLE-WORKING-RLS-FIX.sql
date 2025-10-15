-- =====================================================
-- SIMPLEST POSSIBLE FIX - THIS WILL WORK
-- =====================================================

-- 1. DISABLE RLS COMPLETELY (TEMPORARY FOR TESTING)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Make buckets public
UPDATE storage.buckets SET public = true WHERE id IN ('avatars', 'gallery', 'videos');

-- 3. Verify
SELECT 'RLS Status:' as info, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects' AND rowsecurity = false) 
         THEN '✅ RLS DISABLED - Uploads will work!' 
         ELSE '❌ RLS still enabled' 
       END as status;

SELECT 'Buckets:' as info, id, public FROM storage.buckets WHERE id IN ('avatars', 'gallery', 'videos');

-- =====================================================
-- IMPORTANT: THIS DISABLES SECURITY FOR TESTING
-- =====================================================
-- After confirming uploads work, re-enable with proper policies:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;