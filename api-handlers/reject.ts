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
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is the practitioner
    if (userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Only the practitioner can reject the session' });
    }

    // Verify session is in waiting phase
    if (session.phase !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting phase' });
    }

    // Update session phase to ended
    const updatedSession = await storage.updateSession(sessionId, {
      phase: 'ended'
    });

    // Mark practitioner as not in service
    await storage.updatePractitioner(session.practitionerId, { inService: false });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}