import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
      'Prefer': 'return=representation'
    }
  }
});

// Create admin client for storage operations
export const supabaseAdmin = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);