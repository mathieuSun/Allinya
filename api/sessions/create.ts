import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'crypto';
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
    
    console.log('Session start request:', req.body);
    
    const { practitionerId, liveSeconds } = z.object({
      practitionerId: z.string().uuid(),
      liveSeconds: z.number().int().positive(),
    }).parse(req.body);

    const guestId = auth.userId;
    console.log('Guest ID:', guestId, 'Practitioner ID:', practitionerId);

    // Verify guest role
    const guest = await storage.getProfile(guestId);
    if (!guest || guest.role !== 'guest') {
      console.error('User is not a guest:', guest);
      return res.status(403).json({ error: 'Only guests can start sessions' });
    }

    // Verify practitioner exists and is online
    const practitioner = await storage.getPractitioner(practitionerId);
    console.log('Practitioner status:', practitioner);
    if (!practitioner || !practitioner.isOnline) {
      return res.status(400).json({ error: 'Practitioner is not available' });
    }

    // CRITICAL: Check if practitioner already has an active session
    const activeSessions = await storage.getActivePractitionerSessions(practitionerId);
    if (activeSessions && activeSessions.length > 0) {
      console.error('Practitioner already has an active session:', activeSessions[0].id);
      return res.status(409).json({ 
        error: 'Practitioner is currently in another session. Please try again later.' 
      });
    }

    // Create session - Room timer starts immediately
    const sessionId = randomUUID();
    const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
    const now = new Date().toISOString();
    
    console.log('Creating session with ID:', sessionId, 'Duration:', liveSeconds, 'seconds');
    
    const session = await storage.createSession({
      practitionerId: practitionerId,
      guestId: guestId,
      phase: 'room_timer', // Start in room_timer phase immediately
      liveSeconds: liveSeconds,
      waitingSeconds: liveSeconds, // Room timer duration is the waiting time
      waitingStartedAt: now, // Room timer starts NOW
      practitionerReady: false,
      guestReady: false,
      acknowledgedPractitioner: false,
      agoraChannel: agoraChannel,
    });

    console.log('Session created - Room timer started:', session);

    // Mark practitioner as IN SERVICE immediately
    await storage.updatePractitioner(practitionerId, { inService: true });

    res.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(400).json({ error: error.message });
  }
}