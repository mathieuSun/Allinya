import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { handleCors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';
import { storage } from '../_lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const profile = await storage.getProfile(authData.user.id);

    // CRITICAL: Profile MUST exist from signup - no auto-creation allowed
    if (!profile) {
      console.error(`No profile found for ${email} - account not properly registered`);
      return res.status(401).json({ 
        error: 'Account not found. Please sign up first.' 
      });
    }

    // CRITICAL: Verify the account has a valid role
    if (!profile.role || !['guest', 'practitioner'].includes(profile.role)) {
      console.error(`Invalid role for ${email}: ${profile.role}`);
      return res.status(401).json({ 
        error: 'Invalid account configuration. Please contact support.' 
      });
    }

    console.log(`Login successful for ${email} with role: ${profile.role}`);

    // Return user data and access token
    res.json({
      user: authData.user,
      session: authData.session,
      access_token: authData.session.access_token,
      profile
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}