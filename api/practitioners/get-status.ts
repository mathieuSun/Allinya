import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const practitioner = await storage.getPractitioner(auth.userId);
    
    if (!practitioner) {
      return res.status(404).json({ error: 'Practitioner not found' });
    }
    
    res.json({
      isOnline: practitioner.isOnline,
      inService: practitioner.inService
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(400).json({ error: error.message || 'Failed to get status' });
  }
}