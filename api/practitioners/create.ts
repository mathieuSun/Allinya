import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/database.js';

// This handler creates a practitioner record for an existing user
// Used when a user wants to become a practitioner
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    // Check if practitioner record already exists
    const existing = await storage.getPractitioner(auth.userId);
    if (existing) {
      return res.status(400).json({ error: 'Practitioner record already exists' });
    }
    
    // Create practitioner record
    const practitioner = await storage.createPractitioner({
      userId: auth.userId,
      isOnline: false,
      inService: false,
      rating: "0.0",
      reviewCount: 0
    });
    
    // Update user's profile role to practitioner
    await storage.updateProfile(auth.userId, { role: 'practitioner' });
    
    res.json(practitioner);
  } catch (error: any) {
    console.error('Create practitioner error:', error);
    res.status(400).json({ error: error.message || 'Failed to create practitioner' });
  }
}