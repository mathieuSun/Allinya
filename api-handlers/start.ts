import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'crypto';
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
    if (!practitioner || !(practitioner as any).isOnline) {
      return res.status(400).json({ error: 'Practitioner is not available' });
    }

    // Create session
    const sessionId = randomUUID();
    const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
    
    console.log('Creating session with ID:', sessionId);
    
    const session = await storage.createSession({
      practitionerId: practitionerId,
      guestId: guestId,
      phase: 'waiting',
      liveSeconds: liveSeconds,
      practitionerReady: false,
      guestReady: false,
      acknowledgedPractitioner: false,
      agoraChannel: agoraChannel,
    });

    console.log('Session created:', session);

    // Mark practitioner as in service
    await storage.updatePractitioner(practitionerId, { inService: true });

    res.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(400).json({ error: error.message });
  }
}