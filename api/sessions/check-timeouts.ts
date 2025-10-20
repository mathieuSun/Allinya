import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { storage } from '../_lib/database.js';
import { supabase } from '../_lib/supabase.js';

// 3 minutes 45 seconds in milliseconds
const SESSION_TIMEOUT_MS = 3 * 60 * 1000 + 45 * 1000; // 3:45

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // CRITICAL: Get all sessions in room_timer phase (NOT waiting)
    const { data: roomTimerSessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('phase', 'room_timer');
    
    if (error) {
      console.error('Error fetching room timer sessions:', error);
      return res.status(500).json({ error: 'Failed to check session timeouts' });
    }
    
    const now = new Date();
    const canceledSessions = [];
    
    // Check each room timer session for timeout
    for (const session of roomTimerSessions || []) {
      const createdAt = new Date(session.created_at);
      const elapsed = now.getTime() - createdAt.getTime();
      
      // If more than 3:45 has passed, cancel the session
      if (elapsed > SESSION_TIMEOUT_MS) {
        console.log(`Canceling expired session ${session.id} - elapsed: ${Math.floor(elapsed / 1000)}s`);
        
        // Update session to ended phase
        await storage.updateSession(session.id, {
          phase: 'ended',
          endedAt: now.toISOString(),
        });
        
        // Mark practitioner as available again
        await storage.updatePractitioner(session.practitioner_id, { 
          inService: false 
        });
        
        canceledSessions.push({
          sessionId: session.id,
          practitionerId: session.practitioner_id,
          guestId: session.guest_id,
          timeoutAfter: Math.floor(elapsed / 1000),
        });
      }
    }
    
    res.json({ 
      checked: roomTimerSessions?.length || 0,
      canceled: canceledSessions.length,
      sessions: canceledSessions 
    });
    
  } catch (error: any) {
    console.error('Error checking session timeouts:', error);
    res.status(500).json({ error: error.message });
  }
}