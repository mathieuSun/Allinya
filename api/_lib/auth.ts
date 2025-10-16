import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase';

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ userId: string } | null> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}