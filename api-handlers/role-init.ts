import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './auth';
import { storage } from './storage';
import { handleCors } from './cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { role } = z.object({
      role: z.enum(['guest', 'practitioner']),
    }).parse(req.body);

    const userId = auth.userId;

    // Check if profile exists
    const existingProfile = await storage.getProfile(userId);
    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    // Create profile for the user
    const profile = await storage.createProfile({
      id: userId,
      role,
      displayName: 'New User',
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
        userId: userId,
        isOnline: false,
        inService: false,
        rating: "0.0",
        reviewCount: 0
      });
    }

    res.json({ profile });
  } catch (error: any) {
    console.error('Role init error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Role initialization failed' });
  }
}