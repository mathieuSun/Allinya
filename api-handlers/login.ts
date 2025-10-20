import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from './supabase';
import { storage } from './storage';
import { handleCors } from './cors';

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
    let profile = await storage.getProfile(authData.user.id);

    // Auto-create profile for existing Supabase Auth accounts without profiles
    if (!profile) {
      console.log(`No profile found for ${email}, auto-creating based on email...`);
      
      // Determine role based on email
      const role = email === 'chefmat2018@gmail.com' ? 'practitioner' : 
                  email === 'cheekyma@hotmail.com' ? 'guest' : 
                  'guest'; // Default to guest for any other email

      // Extract display name from email
      const displayName = email.split('@')[0].replace(/[0-9]/g, '').replace(/[._-]/g, ' ');

      // Create profile
      profile = await storage.createProfile({
        id: authData.user.id,
        role,
        displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        country: null,
        bio: null,
        avatarUrl: null,
        galleryUrls: [],
        videoUrl: null,
        specialties: [],
      });

      // If practitioner, create practitioner record
      if (role === 'practitioner') {
        console.log('Creating practitioner record for', email);
        await storage.createPractitioner({
          userId: authData.user.id,
          isOnline: false,
          inService: false,
          rating: "0.0",
          reviewCount: 0,
        });
      }

      console.log(`Profile auto-created for ${email} with role: ${role}`);
    }

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