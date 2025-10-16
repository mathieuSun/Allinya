# Vercel Deployment Guide

## Project Setup Complete ✅

The project has been successfully prepared for Vercel deployment. Here's what has been configured:

### 1. **Project Structure**
```
/
├── api/                    # Vercel serverless functions
│   ├── _lib/              # Shared utilities
│   ├── auth/              # Authentication endpoints  
│   ├── profile/           # Profile management
│   ├── practitioners/     # Practitioner endpoints
│   ├── sessions/          # Session management
│   ├── reviews/           # Review system
│   ├── uploads/           # File upload handling
│   ├── agora/            # Video call token generation
│   └── *.ts              # Health/version endpoints
├── client/                # React/Vite frontend
├── server/                # Original Express backend (reference)
├── vercel.json           # Vercel configuration
└── .env.example          # Environment variables template
```

### 2. **API Endpoints Mapping**

All Express routes have been converted to Vercel serverless functions:

| Original Express Route | Vercel Function Path |
|----------------------|---------------------|
| POST /api/auth/signup | /api/auth/signup.ts |
| POST /api/auth/login | /api/auth/login.ts |
| POST /api/auth/logout | /api/auth/logout.ts |
| GET /api/auth/user | /api/auth/user.ts |
| POST /api/auth/role-init | /api/auth/role-init.ts |
| GET/PUT /api/profile | /api/profile/index.ts |
| GET /api/practitioners | /api/practitioners/list.ts |
| GET /api/practitioners/online | /api/practitioners/online.ts |
| GET /api/practitioners/:id | /api/practitioners/[id].ts |
| PUT /api/practitioners/toggle-status | /api/practitioners/toggle-status.ts |
| POST /api/sessions/start | /api/sessions/start.ts |
| POST /api/sessions/ready | /api/sessions/ready.ts |
| POST /api/sessions/acknowledge | /api/sessions/acknowledge.ts |
| POST /api/sessions/accept | /api/sessions/accept.ts |
| POST /api/sessions/reject | /api/sessions/reject.ts |
| POST /api/sessions/end | /api/sessions/end.ts |
| GET /api/sessions/:id | /api/sessions/[id].ts |
| GET /api/sessions/practitioner | /api/sessions/practitioner.ts |
| GET /api/agora/token | /api/agora/token.ts |
| POST /api/reviews | /api/reviews/create.ts |
| GET /api/reviews/:sessionId | /api/reviews/[sessionId].ts |
| POST /api/uploads/url | /api/uploads/url.ts |
| GET /api/health | /api/health.ts |
| GET /api/version | /api/version.ts |
| GET /api/cache-bust | /api/cache-bust.ts |

### 3. **Deployment Steps**

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare project for Vercel deployment"
git push origin main
```

#### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

#### Step 3: Configure Environment Variables
In Vercel Dashboard, add these environment variables:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Session
SESSION_SECRET=your_session_secret_min_32_chars

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Agora
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# Frontend Variables (auto-exposed to client)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Step 4: Deploy
Click "Deploy" and Vercel will:
1. Install dependencies
2. Build the Vite frontend
3. Deploy serverless functions
4. Set up routing

### 4. **Key Features Maintained**

✅ **Authentication**: Supabase Auth with session management
✅ **Profiles**: User profiles with role-based access
✅ **Practitioners**: Online status, service availability
✅ **Sessions**: Real-time video calls with Agora
✅ **Storage**: File uploads via Supabase Storage
✅ **Reviews**: Rating and review system
✅ **CORS**: Properly configured for all endpoints
✅ **Cache Control**: iOS-specific cache headers

### 5. **Important Notes**

1. **Database Migrations**: Run `npm run db:push` locally before deployment if schema changes are needed

2. **Supabase Buckets**: The storage buckets (avatars, gallery, videos) will be initialized automatically on first API call

3. **Session State**: Since Vercel functions are stateless, session management relies on Supabase Auth tokens

4. **Cold Starts**: First requests to functions may be slower due to cold starts. Consider upgrading to Vercel Pro for better performance

5. **Monitoring**: Use Vercel's built-in analytics and function logs to monitor your deployment

### 6. **Testing the Deployment**

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Version check
curl https://your-app.vercel.app/api/version
```

### 7. **Troubleshooting**

**Issue**: Functions timing out
- **Solution**: Check function logs in Vercel dashboard, increase timeout in vercel.json if needed

**Issue**: CORS errors
- **Solution**: Verify origin settings in api/_lib/cors.ts match your domain

**Issue**: Database connection errors
- **Solution**: Ensure DATABASE_URL includes `?sslmode=require` for production

**Issue**: File uploads failing
- **Solution**: Check Supabase bucket permissions and storage limits

### 8. **Next Steps**

1. **Custom Domain**: Add your domain in Vercel settings
2. **Environment Variables**: Set up different environments (preview, production)
3. **GitHub Actions**: Add CI/CD workflows for testing
4. **Monitoring**: Set up error tracking (Sentry, LogRocket)
5. **Performance**: Enable Vercel Edge Functions for better latency

## Success! 🎉

Your application is now ready for Vercel deployment. The serverless architecture will automatically scale based on demand while maintaining all the original functionality.