import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { id, practitioner } = req.query;
    
    // If requesting sessions for a practitioner
    if (practitioner === 'true') {
      const userId = auth.userId;
      
      // Verify practitioner role
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== 'practitioner') {
        return res.status(403).json({ error: 'Only practitioners can access this endpoint' });
      }

      // Get all sessions for this practitioner (waiting and live phases)
      const sessions = await storage.getSessionsForPractitioner(userId);
      return res.json(sessions);
    }
    
    // Otherwise, get a specific session by ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const session = await storage.getSession(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(400).json({ error: error.message || 'Failed to get session' });
  }
}