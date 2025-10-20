import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { isOnline, inService } = z.object({
      isOnline: z.boolean().optional(),
      inService: z.boolean().optional()
    }).parse(req.body);
    
    const existingPractitioner = await storage.getPractitioner(auth.userId);
    if (!existingPractitioner) {
      return res.status(404).json({ error: 'Practitioner not found' });
    }
    
    const updates: any = {};
    if (isOnline !== undefined) updates.isOnline = isOnline;
    if (inService !== undefined) updates.inService = inService;
    
    const practitioner = await storage.updatePractitioner(auth.userId, updates);
    res.json(practitioner);
  } catch (error: any) {
    console.error('Toggle status error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to toggle status' });
  }
}