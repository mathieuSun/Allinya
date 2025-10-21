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
    // Parse body - handle Vercel edge cases
    let body: any;
    
    // If body is already parsed
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } 
    // If body is undefined, read raw body from request
    else {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req as any) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      body = JSON.parse(rawBody || '{}');
    }
    
    const { email, password, fullName, role } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(1),
      role: z.enum(['guest', 'practitioner'])
    }).parse(body);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // Create profile for the new user
    const profile = await storage.createProfile({
      id: authData.user.id,
      role,
      displayName: fullName,
      country: null,
      bio: null,
      avatarUrl: null,
      galleryUrls: [],
      videoUrl: null,
      specialties: []
    });

    // If practitioner, create practitioner record
    if (role === 'practitioner') {
      await storage.createPractitioner({
        userId: authData.user.id,
        isOnline: false,
        inService: false,
        rating: "0.0",
        reviewCount: 0
      });
    }

    // Return user data and access token
    res.json({
      user: authData.user,
      session: authData.session,
      accessToken: authData.session?.access_token,
      profile
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Signup failed' });
  }
}