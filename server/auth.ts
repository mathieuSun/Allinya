import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { supabaseConfig } from './config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: user.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
