import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is participant
    if (userId !== session.guestId && userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Not a session participant' });
    }

    const updatedSession = await storage.updateSession(sessionId, {
      phase: 'ended'
    });

    // Mark practitioner as not in service
    await storage.updatePractitioner(session.practitionerId, { inService: false });

    res.json(updatedSession);
  } catch (error: any) {
    console.error('End session error:', error);
    res.status(400).json({ error: error.message });
  }
}