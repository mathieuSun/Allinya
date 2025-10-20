import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';

const BUILD_TIMESTAMP = Date.now().toString();
const BUILD_VERSION = "1.0.0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.json({
    timestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    requiresReload: false
  });
}