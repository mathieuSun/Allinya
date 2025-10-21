# Allinya Deployment Checklist for www.allinya.app

## Pre-Deployment Verification ✓

### 1. **Code Ready for Production**
- [x] All authentication endpoints converted to camelCase
- [x] Vercel serverless functions implemented in `/api` folder
- [x] Database schema using camelCase throughout
- [x] Storage integration with Supabase configured
- [x] Agora video calling tokens properly generated
- [x] Build scripts for Vercel deployment ready

### 2. **Critical Fixes Applied**
- [x] Fixed request body parsing in Vercel functions
- [x] Implemented snake_case to camelCase conversion for Supabase responses
- [x] Added proper CORS handling for all API endpoints
- [x] Configured iOS-specific cache headers
- [x] Session management with proper state transitions

## Deployment Steps

### Step 1: Final Code Preparation
```bash
# Commit all recent changes
git add .
git commit -m "Fix: Complete camelCase conversion for auth endpoints and Supabase responses"
git push origin main
```

### Step 2: Vercel Project Setup
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Select "Import Git Repository"
4. Choose `mathieuSun/allinya` repository
5. Configure project settings:
   - Framework Preset: `Vite`
   - Build Command: `vite build && node build-for-vercel.js`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

### Step 3: Environment Variables Configuration

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Required Secrets (Production)
```env
# Database (Supabase/Neon)
DATABASE_URL=postgresql://neondb_owner:XXXXX@ep-fragrant-tree-adigjw9u.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Session
SESSION_SECRET=[Generate a secure 32+ character string]

# Supabase Backend
SUPABASE_URL=https://tkswishecwcllxgyhqox.supabase.co
SUPABASE_ANON_KEY=[Your anon key from Supabase dashboard]
SUPABASE_SERVICE_ROLE_KEY=[Your service role key from Supabase dashboard]

# Agora Video
AGORA_APP_ID=[Your Agora app ID]
AGORA_APP_CERTIFICATE=[Your Agora app certificate]

# Frontend Variables (Vite)
VITE_API_URL=/api
VITE_SUPABASE_URL=https://tkswishecwcllxgyhqox.supabase.co
VITE_SUPABASE_ANON_KEY=[Same as SUPABASE_ANON_KEY]
VITE_AGORA_APP_ID=[Same as AGORA_APP_ID]
```

### Step 4: Domain Configuration
1. In Vercel Dashboard → Settings → Domains
2. Add custom domain: `www.allinya.app`
3. Configure DNS records as instructed by Vercel:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - For root domain: Add A records pointing to Vercel IPs

### Step 5: Deploy
1. Click "Deploy" in Vercel Dashboard
2. Monitor build logs for any errors
3. Deployment typically takes 2-5 minutes

## Post-Deployment Verification

### 1. **API Health Checks**
```bash
# Test health endpoint
curl https://www.allinya.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-10-21T..."}

# Test version endpoint
curl https://www.allinya.app/api/version

# Expected response:
# {"buildTimestamp":"...","version":"1.0.0","requiresReload":false}
```

### 2. **Authentication Testing**
Test signup flow from the web interface:
1. Navigate to https://www.allinya.app
2. Click "Sign Up"
3. Create a new account (use a real email address)
4. Verify account creation and automatic login

### 3. **Practitioner Features**
1. Login as practitioner account
2. Toggle online status
3. Verify status updates in real-time
4. Test session request flow

### 4. **Storage Verification**
1. Upload profile avatar
2. Check if image persists after refresh
3. Verify public URLs are accessible

## Troubleshooting Guide

### Issue: Build Fails
**Solution**: Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility (18.x recommended)

### Issue: API Routes Return 404
**Solution**: Check vercel.json rewrites configuration
- Ensure all API routes are mapped correctly
- Verify function files exist in `/api` folder

### Issue: Database Connection Errors
**Solution**: 
- Verify DATABASE_URL includes `?sslmode=require`
- Check Supabase/Neon connection pooling settings
- Ensure database is accessible from Vercel's IP ranges

### Issue: Authentication Fails
**Solution**:
- Verify Supabase keys are correctly set
- Check CORS configuration allows your domain
- Ensure cookies are enabled for session management

### Issue: File Uploads Not Working
**Solution**:
- Verify Supabase Storage buckets are public
- Check RLS policies are properly configured
- Ensure SUPABASE_SERVICE_ROLE_KEY is set

### Issue: Video Calls Not Connecting
**Solution**:
- Verify Agora credentials are correct
- Check browser compatibility (Chrome 65+, Safari 12+)
- Test on physical devices, not emulators

## Monitoring & Maintenance

### 1. **Vercel Dashboard Monitoring**
- Function logs: Monitor API endpoint performance
- Analytics: Track visitor metrics and errors
- Speed Insights: Monitor Core Web Vitals

### 2. **Database Monitoring**
- Supabase Dashboard: Monitor storage usage
- Neon Console: Check query performance
- Connection pooling: Monitor active connections

### 3. **Regular Maintenance**
- Review and clean up old session records weekly
- Monitor storage usage for uploaded files
- Check for and apply security updates monthly

## Production Checklist

Before going live with users:
- [ ] SSL certificate active (automatic with Vercel)
- [ ] All environment variables set correctly
- [ ] Database migrations completed successfully
- [ ] Test accounts created and verified
- [ ] Error tracking configured (optional: Sentry)
- [ ] Backup strategy in place
- [ ] Privacy policy and terms of service pages added

## Emergency Rollback

If issues occur after deployment:
1. Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." menu → "Promote to Production"
4. Previous version will be restored immediately

## Success Criteria

Deployment is successful when:
- ✅ Health check returns 200 OK
- ✅ Users can sign up and login
- ✅ Practitioners can toggle online status
- ✅ Video calls connect successfully
- ✅ File uploads work properly
- ✅ No console errors in production

## Contact for Issues

For deployment support:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Agora Support: https://www.agora.io/en/support/

---

**Last Updated**: October 21, 2024
**Deployment Ready**: ✅ YES