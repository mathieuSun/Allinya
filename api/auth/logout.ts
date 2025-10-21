import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if ((req.body as any)?.refreshToken) {
      // Fall back to refresh token from body if provided
      token = (req.body as any).refreshToken;
    }

    if (token) {
      // Sign out the user session
      const { error } = await supabase.auth.admin.signOut(token);
      if (error) {
        console.error('Logout error:', error);
      }
    }

    // Always return 204 No Content for logout
    res.status(204).send('');
  } catch (error) {
    console.error('Logout error:', error);
    // Still return 204 even if there's an error
    res.status(204).send('');
  }
}