import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const practitioners = await storage.getAllPractitioners();
    res.json(practitioners);
  } catch (error: any) {
    console.error('Get practitioners error:', error);
    res.status(400).json({ error: error.message || 'Failed to get practitioners' });
  }
}