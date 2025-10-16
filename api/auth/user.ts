import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const profile = await storage.getProfile(auth.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Also get practitioner data if user is a practitioner
    let practitionerData = null;
    if (profile.role === 'practitioner') {
      practitionerData = await storage.getPractitioner(auth.userId);
    }

    res.json({
      id: auth.userId,
      profile,
      practitioner: practitionerData
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(400).json({ error: error.message || 'Failed to get user data' });
  }
}