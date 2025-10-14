# Deployment Guide

## Required Production Secrets

The following environment variables **MUST** be configured in your Replit deployment secrets:

### Core Secrets (Required)
1. **DATABASE_URL** - PostgreSQL connection string from Supabase
2. **SUPABASE_URL** - Your Supabase project URL
3. **SUPABASE_ANON_KEY** - Supabase anonymous key
4. **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key (backend only)
5. **SESSION_SECRET** - Express session secret (min 32 characters)
6. **AGORA_APP_ID** - Agora application ID for video calls
7. **AGORA_APP_CERTIFICATE** - Agora app certificate

### Optional Secrets (Object Storage)
These are only needed if using file uploads:
- **PUBLIC_OBJECT_SEARCH_PATHS** - Comma-separated public object paths
- **PRIVATE_OBJECT_DIR** - Private object storage directory

If these are not configured, file upload features will be disabled but the app will still start.

## How to Add Secrets to Deployment

1. Open your Replit project
2. Click on "Deployments" tab
3. Go to "Environment Variables" or "Secrets"
4. Add each required secret listed above
5. Redeploy your application

## Verification

After deployment, check the logs to ensure:
- ✅ Server starts on port 5000
- ✅ Database connection successful
- ✅ No environment validation errors

## Troubleshooting

### "Missing required environment variables"
- Ensure ALL core secrets are added to deployment
- Verify secret names match exactly (case-sensitive)

### "Object storage not configured"
- This is a warning, not an error
- File uploads will be disabled
- Add PUBLIC_OBJECT_SEARCH_PATHS and PRIVATE_OBJECT_DIR to enable

### Database connection fails
- Verify DATABASE_URL is correct
- Check if Supabase database is accessible from deployment
- Run `server/db-setup.sql` in Supabase SQL Editor if tables are missing
