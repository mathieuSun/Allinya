import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { storage } from '../_lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check if request is for online practitioners only
    const onlineOnly = req.query.online === 'true';
    
    const practitioners = onlineOnly 
      ? await storage.getOnlinePractitioners()
      : await storage.getAllPractitioners();
      
    res.json(practitioners);
  } catch (error: any) {
    console.error('Get practitioners error:', error);
    res.status(400).json({ error: error.message || 'Failed to get practitioners' });
  }
}