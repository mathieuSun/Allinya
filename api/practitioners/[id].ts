import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid practitioner ID' });
    }
    
    const practitioner = await storage.getPractitionerWithProfile(id);
    
    if (!practitioner) {
      return res.status(404).json({ error: 'Practitioner not found' });
    }
    
    res.json(practitioner);
  } catch (error: any) {
    console.error('Get practitioner error:', error);
    res.status(400).json({ error: error.message || 'Failed to get practitioner' });
  }
}