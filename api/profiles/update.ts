import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const updates = req.body;
    const profile = await storage.updateProfile(auth.userId, updates);
    res.json(profile);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message || 'Failed to update profile' });
  }
}