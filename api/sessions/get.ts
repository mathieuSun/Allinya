import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/database.js';

// Check if room timer has expired and end session if needed
async function checkAndEndExpiredRoomTimers(sessions: any[]) {
  const updatedSessions = [];
  
  for (const session of sessions) {
    // Only check room_timer phase sessions
    if (session.phase === 'room_timer' && session.waitingStartedAt && session.waitingSeconds) {
      const startTime = new Date(session.waitingStartedAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const roomTimerDurationMs = session.waitingSeconds * 1000;
      
      if (elapsed > roomTimerDurationMs) {
        // Room timer expired - end the session
        await storage.updateSession(session.id, {
          phase: 'ended',
          endedAt: new Date().toISOString(),
        });
        
        // Mark practitioner as available again
        await storage.updatePractitioner(session.practitionerId, { 
          inService: false 
        });
        
        console.log(`Room timer expired for session ${session.id} after ${Math.floor(elapsed / 1000)}s`);
        updatedSessions.push({ ...session, phase: 'ended', roomTimerExpired: true });
      } else {
        updatedSessions.push(session);
      }
    } else {
      updatedSessions.push(session);
    }
  }
  
  return updatedSessions;
}

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

      // Get all sessions for this practitioner (room_timer and live phases)
      const sessions = await storage.getSessionsForPractitioner(userId);
      
      // Check and end expired room timers
      const updatedSessions = await checkAndEndExpiredRoomTimers(sessions);
      
      // Filter out expired sessions from the response
      const activeSessions = updatedSessions.filter(s => s.phase !== 'ended' || !s.roomTimerExpired);
      
      return res.json(activeSessions);
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