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
    
    const body = z.object({
      sessionId: z.string().uuid(),
      action: z.enum(['accept', 'acknowledge', 'ready', 'reject']).optional()
    }).parse(req.body);

    const sessionId = body.sessionId;
    const action = body.action || 'accept';
    
    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Handle different actions based on the 'action' parameter
    switch (action) {
      case 'acknowledge':
        // Verify user is the practitioner
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: 'Only the practitioner can acknowledge the session' });
        }

        // Verify session is in waiting phase
        if (session.phase !== 'waiting') {
          return res.status(400).json({ error: 'Session is not in waiting phase' });
        }

        // Update session to mark practitioner acknowledged
        const acknowledgedSession = await storage.updateSession(sessionId, {
          acknowledgedPractitioner: true
        });

        res.json({ 
          success: true,
          message: 'Session acknowledged. Guest has been notified.',
          session: acknowledgedSession
        });
        break;
        
      case 'ready':
        // Handle ready state - determine if guest or practitioner
        const isGuest = userId === session.guestId;
        const isPractitioner = userId === session.practitionerId;
        
        if (!isGuest && !isPractitioner) {
          return res.status(403).json({ error: 'Not a session participant' });
        }

        // For practitioner, ensure they have acknowledged first
        if (isPractitioner && !session.acknowledgedPractitioner) {
          return res.status(400).json({ 
            error: 'Please acknowledge the session request first' 
          });
        }

        const updates: any = {};
        
        if (isGuest) {
          updates.readyGuest = true;
        } else {
          updates.readyPractitioner = true;
        }

        // Check if both ready, transition to live
        const bothReady = isGuest
          ? session.readyPractitioner === true
          : session.readyGuest === true;

        if (bothReady && session.phase === 'waiting') {
          // Auto-transition to live phase when both parties are ready
          updates.phase = 'live';
          updates.liveStartedAt = new Date().toISOString();
          
          console.log(`Session ${sessionId} auto-transitioning to live phase - both parties ready`);
        }

        const readySession = await storage.updateSession(sessionId, updates);
        res.json(readySession);
        break;
        
      case 'reject':
        // Verify user is the practitioner
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: 'Only the practitioner can reject the session' });
        }

        // Verify session is in waiting phase
        if (session.phase !== 'waiting') {
          return res.status(400).json({ error: 'Session is not in waiting phase' });
        }

        // Update session phase to ended
        const rejectedSession = await storage.updateSession(sessionId, {
          phase: 'ended'
        });

        // Mark practitioner as not in service
        await storage.updatePractitioner(session.practitionerId, { inService: false });

        res.json(rejectedSession);
        break;
        
      case 'accept':
      default:
        // Default accept behavior (from practitioner dashboard)
        // Verify user is the practitioner
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: 'Only the practitioner can accept the session' });
        }

        // Verify session is in waiting phase
        if (session.phase !== 'waiting') {
          return res.status(400).json({ error: 'Session is not in waiting phase' });
        }

        // Mark practitioner as acknowledged and ready when accepting from dashboard
        const acceptedSession = await storage.updateSession(sessionId, {
          acknowledgedPractitioner: true,
          readyPractitioner: true,
        });

        res.json(acceptedSession);
        break;
    }
  } catch (error: any) {
    console.error('Session action error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to process session action' });
  }
}