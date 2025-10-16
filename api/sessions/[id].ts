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
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const session = await storage.getSession(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is participant
    const userId = auth.userId;
    if (userId !== session.guestId && userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Not a session participant' });
    }

    res.json(session);
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(400).json({ error: error.message || 'Failed to get session' });
  }
}