# 🚀 Allinya - Start Here!

Your wellness marketplace platform is **ready to use** - you just need to set up the database tables!

## ✅ What's Already Done

- ✨ Full-stack application built and running
- 🔐 Supabase authentication configured
- 📹 Agora video integration ready
- 🎨 Beautiful wellness design implemented
- 🔑 All environment variables configured

## ⚡ One Required Step: Database Setup

The application needs database tables created in your **Supabase project**.

### How to Set Up the Database (2 minutes)

1. **Open your [Supabase Dashboard](https://supabase.com/dashboard)**

2. **Select your project** (the one with the URL matching your SUPABASE_URL secret)

3. **Click "SQL Editor"** in the left sidebar

4. **Click "New Query"** 

5. **Copy the SQL** from `server/db-setup.sql` (in this project)

6. **Paste it** into the SQL Editor

7. **Click "Run"** to execute

✅ **Done!** Your database tables, policies, and indexes are now created.

### ⚠️ IMPORTANT: Verify DATABASE_URL

Your `DATABASE_URL` environment variable **must point to your Supabase database**. It should look like:
```
postgresql://postgres:[password]@[host]/postgres
```

**How to get the correct DATABASE_URL:**
1. In your Supabase Dashboard, go to **Project Settings** → **Database**
2. Scroll to **Connection string** → **URI**
3. Copy the connection string (it will have your password in it)
4. Make sure your DATABASE_URL secret matches this URL

If DATABASE_URL points to a different database, the backend won't see the tables you just created!

### What Gets Created

The SQL creates:
- **profiles** - User profiles (guests & practitioners)
- **practitioners** - Practitioner status & ratings  
- **sessions** - Session state management
- **reviews** - Post-session feedback
- **RLS Policies** - Security rules
- **Indexes** - Performance optimization

## 🎯 How to Use the App

### As a Guest (seeking healing sessions):

1. **Visit your app** (click the preview URL)
2. **Click "Sign Up"** → Enter email & password
3. **Choose "Guest"** role during onboarding
4. **Complete your profile** (name, interests)
5. **Browse practitioners** on the Explore page
6. **Request a session** with an available (green dot) practitioner
7. **Wait in the waiting room** for practitioner to accept
8. **Join live video** when practitioner accepts
9. **Leave a review** after the session

### As a Practitioner (offering healing sessions):

1. **Visit your app** in a different browser/incognito tab
2. **Click "Sign Up"** → Enter different email & password
3. **Choose "Practitioner"** role during onboarding  
4. **Complete your profile** (name, bio, specialties, hourly rate)
5. **Toggle "Online"** status to appear in the Explore grid
6. **Accept session requests** from guests
7. **Join live video** when both ready
8. **End session** when complete

## 🌟 Key Features

- **Live Presence Indicators** - Green dots show available practitioners
- **Two-Phase Sessions** - Waiting room → Live video flow
- **HD Video Calls** - Powered by Agora WebRTC
- **Realtime Updates** - Supabase realtime for instant status changes
- **Review System** - Guests can rate and review sessions
- **Role-Based Access** - Different experiences for guests vs practitioners

## 📋 Quick Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure you've restarted the workflow after adding VITE_ secrets
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

**Can't see any practitioners:**
- Make sure you created a practitioner account
- Toggle the practitioner's online status to "Available"
- The guest account should see them on /explore

**Video not connecting:**
- Check browser permissions for camera/microphone
- Verify VITE_AGORA_APP_ID matches your AGORA_APP_ID

**Profile not loading after signup:**
- Complete the onboarding flow to create your profile
- Make sure database tables were created successfully

## 📚 Documentation

- **README.md** - Full project documentation
- **SETUP_INSTRUCTIONS.md** - Detailed setup guide  
- **design_guidelines.md** - UI/UX design specifications
- **replit.md** - Project overview and architecture

## 🎨 Design Philosophy

The app uses a **wellness-focused design** with:
- 💜 Deep purple (primary) - Trust & spirituality
- 🌊 Soft teal (secondary) - Calm & healing
- 🔥 Warm coral (accent) - Energy & warmth
- Clean typography and generous spacing for a peaceful user experience

---

## 🚀 Next Steps

1. ✅ Run the database setup SQL in Supabase (see above)
2. 🎉 Test the app by creating guest and practitioner accounts
3. 📹 Start your first healing session!

**Need help?** Check the troubleshooting section or review the documentation files.
