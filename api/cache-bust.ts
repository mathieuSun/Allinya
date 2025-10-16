import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';

const BUILD_TIMESTAMP = Date.now().toString();
const BUILD_VERSION = "1.0.0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const versionInfo = {
    buildTimestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    serverTime: Date.now(),
    cacheClear: true,
    message: 'Cache cleared - please reload',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Send with explicit no-cache for iOS
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('X-Force-Reload', 'true');
  
  res.json(versionInfo);
}