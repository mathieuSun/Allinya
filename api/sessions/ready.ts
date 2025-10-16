import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId, who } = z.object({
      sessionId: z.string().uuid(),
      who: z.enum(['guest', 'practitioner']),
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

    // For practitioner, ensure they have acknowledged first
    if (who === 'practitioner' && !session.acknowledgedPractitioner) {
      return res.status(400).json({ 
        error: 'Please acknowledge the session request first' 
      });
    }

    const updates: any = {};
    
    if (who === 'guest') {
      updates.readyGuest = true;
    } else {
      updates.readyPractitioner = true;
    }

    // Check if both ready, transition to live
    const bothReady = (who === 'guest') 
      ? session.readyPractitioner === true
      : session.readyGuest === true;

    if (bothReady && session.phase === 'waiting') {
      // Auto-transition to live phase when both parties are ready
      updates.phase = 'live';
      updates.liveStartedAt = new Date().toISOString();
      
      console.log(`Session ${sessionId} auto-transitioning to live phase - both parties ready`);
    }

    const updatedSession = await storage.updateSession(sessionId, updates);
    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}