# Allinya Database Setup Guide

## Overview
This guide explains how to set up the complete Allinya database in Supabase.

## Files
1. **allinya-complete-setup.sql** - Main database setup (tables, indexes, RLS, functions)
2. **allinya-storage-setup.sql** - Storage bucket RLS policies

## Setup Instructions

### Step 1: Database Setup
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy entire contents of `allinya-complete-setup.sql`
4. Paste and click **Run**
5. Verify no errors appear

### Step 2: Storage Buckets
1. Go to **Storage** tab in Supabase
2. Create 3 PUBLIC buckets:
   - **avatars** (5MB file limit)
   - **gallery** (10MB file limit)
   - **videos** (50MB file limit)
3. Make sure all are set to **PUBLIC**

### Step 3: Storage RLS Policies
1. Go back to **SQL Editor**
2. Copy entire contents of `allinya-storage-setup.sql`
3. Paste and click **Run**
4. Verify no errors appear

### Step 4: Verify Setup
Run these queries in SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check storage buckets
SELECT id, name, public FROM storage.buckets;

-- Check storage policies
SELECT policyname FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

## Database Structure

### Tables
- **profiles** - User profiles (guests & practitioners)
- **practitioners** - Practitioner-specific data (online status, rating)
- **sessions** - Healing session records
- **reviews** - Post-session reviews

### Key Features
- Row Level Security (RLS) enabled on all tables
- Automatic updated_at timestamps
- Practitioner rating auto-updates after reviews
- Realtime subscriptions for practitioners and sessions
- Public storage buckets for media files

## Production Accounts
After setup, these accounts can sign in:
- **Practitioner**: chefmat2018@gmail.com
- **Guest**: cheekyma@hotmail.com

Both start with minimal profiles - users add their own real data.

## Troubleshooting

### If file uploads don't work:
1. Verify buckets are set to PUBLIC in Storage tab
2. Re-run `allinya-storage-setup.sql`
3. Check browser console for errors

### If tables already exist:
The SQL uses `IF NOT EXISTS` so it's safe to re-run

### If you need to reset everything:
```sql
-- DANGER: This deletes all data!
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS practitioners CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

## Next Steps
1. Complete database setup
2. Test file uploads with a practitioner account
3. Add real practitioner profile data
4. Test session flow between guest and practitioner