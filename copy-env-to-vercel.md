# Copy These Environment Variables to Vercel

## 🚨 CRITICAL: Add ALL these to Vercel Dashboard

Go to: **Vercel Dashboard → allinya → Settings → Environment Variables**

### Step 1: Check "Production" checkbox
Make sure to select **Production** environment when adding each variable!

### Step 2: Add Each Variable
Click "Add" and paste each of these (get values from Replit Secrets):

1. **DATABASE_URL**
   - Get from: Replit Secrets panel
   - Description: PostgreSQL connection string

2. **SESSION_SECRET** 
   - Get from: Replit Secrets panel
   - Description: Must be 32+ characters

3. **SUPABASE_URL**
   - Get from: Replit Secrets panel
   - Description: Your Supabase project URL

4. **SUPABASE_ANON_KEY**
   - Get from: Replit Secrets panel
   - Description: Supabase anonymous key

5. **SUPABASE_SERVICE_ROLE_KEY**
   - Get from: Replit Secrets panel  
   - Description: Supabase service role key (backend only)

6. **AGORA_APP_ID**
   - Get from: Replit Secrets panel
   - Description: Agora application ID

7. **AGORA_APP_CERTIFICATE**
   - Get from: Replit Secrets panel
   - Description: Agora app certificate

### Step 3: Also Add Frontend Variables
Don't forget the VITE_ prefixed ones for the frontend:

8. **VITE_SUPABASE_URL** (same value as SUPABASE_URL)
9. **VITE_SUPABASE_ANON_KEY** (same value as SUPABASE_ANON_KEY)  
10. **VITE_AGORA_APP_ID** (same value as AGORA_APP_ID)

### Step 4: Redeploy
After adding all variables:
1. Click "Save" for each variable
2. Go to Deployments tab
3. Click "..." on latest deployment → "Redeploy"
4. Choose "Use existing Build Cache" → Deploy

## ✅ Verification
After redeployment, test:
```bash
curl https://allinya.app/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Why This Fixes Everything
Your API files import `api/_lib/config.ts` which runs:
```typescript
export const config = envSchema.parse(process.env);
```
This **throws an error** if ANY variable is missing, causing every endpoint to return 500.

With all variables in place, your API will work perfectly!