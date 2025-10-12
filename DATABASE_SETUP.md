# Database Setup for Allinya

This file contains instructions for setting up the Supabase database for the Allinya platform.

## Prerequisites

- A Supabase project created
- DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY configured as environment secrets

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query and paste the contents of `server/db-setup.sql`
4. Execute the SQL to create all tables, policies, and indexes

## Tables Created

- **profiles**: User profiles (both guests and practitioners)
- **practitioners**: Practitioner-specific data (online status, ratings)
- **sessions**: Session management (waiting room, live video, ended)
- **reviews**: Session reviews and ratings

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies to ensure:
- Users can only access their own data
- Practitioners can toggle their own online status
- Session participants can view/update their sessions
- Reviews are public but only guests can create them
