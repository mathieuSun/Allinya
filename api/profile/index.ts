import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  const auth = await requireAuth(req, res);
  if (!auth) return;
  
  if (req.method === 'GET') {
    try {
      const profile = await storage.getProfile(auth.userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(400).json({ error: error.message || 'Failed to get profile' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updates = req.body;
      const profile = await storage.updateProfile(auth.userId, updates);
      res.json(profile);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: error.message || 'Failed to update profile' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}