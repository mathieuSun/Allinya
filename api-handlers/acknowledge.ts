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
      return res.status(403).json({ error: 'Only the practitioner can acknowledge the session' });
    }

    // Verify session is in waiting phase
    if (session.phase !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting phase' });
    }

    // Update session to mark practitioner acknowledged
    const updatedSession = await storage.updateSession(sessionId, {
      acknowledgedPractitioner: true
    });

    res.json({ 
      success: true,
      message: 'Session acknowledged. Guest has been notified.',
      session: updatedSession
    });
  } catch (error: any) {
    console.error('Acknowledge error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to acknowledge session' });
  }
}