import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/database.js';

// This handler updates practitioner-specific fields (not status toggles)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const existingPractitioner = await storage.getPractitioner(auth.userId);
    if (!existingPractitioner) {
      return res.status(404).json({ error: 'Practitioner not found' });
    }
    
    // Allow updating rating and review count (typically done internally)
    const updates = req.body;
    
    const practitioner = await storage.updatePractitioner(auth.userId, updates);
    res.json(practitioner);
  } catch (error: any) {
    console.error('Update practitioner error:', error);
    res.status(400).json({ error: error.message || 'Failed to update practitioner' });
  }
}