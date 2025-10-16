# ALLINYA SQL SETUP - SIMPLE STEPS

## You only need 2 SQL files:
1. **ALLINYA_FULL_SETUP.sql** - Database tables and policies
2. **ALLINYA_STORAGE_RLS.sql** - Storage permissions

## STEP 1: Run Database Setup
1. Open Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy ALL content from `ALLINYA_FULL_SETUP.sql`
5. Paste it in the editor
6. Click **Run** button
7. Should see "Success. No rows returned"

## STEP 2: Create Storage Buckets
1. Go to **Storage** (left sidebar)
2. Click **New bucket**
3. Create these 3 buckets (MUST be PUBLIC):
   - Name: `avatars` → Toggle "Public bucket" ON → Create
   - Name: `gallery` → Toggle "Public bucket" ON → Create  
   - Name: `videos` → Toggle "Public bucket" ON → Create

## STEP 3: Run Storage Policies
1. Go back to **SQL Editor**
2. Click **New Query**
3. Copy ALL content from `ALLINYA_STORAGE_RLS.sql`
4. Paste it in the editor
5. Click **Run** button
6. Should see a table showing 2 policies created

## DONE! ✅

Your database is now ready. Sign in with:
- **Practitioner**: chefmat2018@gmail.com
- **Guest**: cheekyma@hotmail.com

Both accounts start with empty profiles - add your real data!