import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

// Extract Supabase URL from DATABASE_URL if needed
let supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL) {
  // Extract from postgres://... format
  const dbUrl = new URL(process.env.DATABASE_URL);
  supabaseUrl = `https://${dbUrl.hostname.split('.')[0]}.supabase.co`;
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
