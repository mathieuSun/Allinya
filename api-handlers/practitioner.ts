import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './auth';
import { storage } from './storage';
import { handleCors } from './cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const userId = auth.userId;
    
    // Verify practitioner role
    const profile = await storage.getProfile(userId);
    if (!profile || profile.role !== 'practitioner') {
      return res.status(403).json({ error: 'Only practitioners can access this endpoint' });
    }

    // Get all sessions for this practitioner (waiting and live phases)
    const sessions = await storage.getSessionsForPractitioner(userId);
    res.json(sessions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}