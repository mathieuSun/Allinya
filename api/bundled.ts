// Bundled API handler for Vercel - contains all code inline to avoid module resolution issues
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createRequire } from "module";
import { createClient } from '@supabase/supabase-js';

// Import Agora token builder (CommonJS module)
const require = createRequire(import.meta.url);
const AgoraToken = require("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const RtcRole = AgoraToken.RtcRole;

// Build timestamp and version
const BUILD_TIMESTAMP = Date.now().toString();
const BUILD_VERSION = "1.0.0";

// ==================== CONFIGURATION ====================

// Define the environment configuration schema
const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  
  // Session Configuration
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // Agora Configuration
  AGORA_APP_ID: z.string().min(1, 'AGORA_APP_ID is required'),
  AGORA_APP_CERTIFICATE: z.string().min(1, 'AGORA_APP_CERTIFICATE is required'),
});

// Parse and validate environment variables
const config = envSchema.parse(process.env);

const supabaseConfig = {
  url: config.SUPABASE_URL,
  anonKey: config.SUPABASE_ANON_KEY,
  serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
} as const;

const agoraConfig = {
  appId: config.AGORA_APP_ID,
  appCertificate: config.AGORA_APP_CERTIFICATE,
} as const;

// ==================== SUPABASE CLIENT ====================

// Create Supabase client with service role key for backend operations
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
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
const supabaseAdmin = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ==================== CORS HANDLING ====================

function handleCors(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  // Set cache headers for iOS
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Accept-Encoding, Origin');
  
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('WebKit') || userAgent.includes('iPad') || userAgent.includes('iPhone')) {
    res.setHeader('Clear-Site-Data', '"cache"');
    res.setHeader('X-iOS-Cache-Bust', Date.now().toString());
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

// ==================== AUTH MIDDLEWARE ====================

async function requireAuth(
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

// ==================== STORAGE SERVICE ====================

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;
  
  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snakeKey] = toSnakeCase(obj[key]);
  }
  return converted;
}

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;
  
  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = toCamelCase(obj[key]);
  }
  return converted;
}

// Storage operations
const storage = {
  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return undefined;
    }
    
    return toCamelCase(data);
  },

  async createProfile(profile: any) {
    const snakeCaseProfile = toSnakeCase(profile);
    
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...snakeCaseProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async updateProfile(id: string, updates: any) {
    const snakeCaseUpdates = toSnakeCase(updates);
    
    const { data, error} = await supabase
      .from('profiles')
      .update({
        ...snakeCaseUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    return toCamelCase(data);
  },

  async getPractitioner(userId: string) {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner:', error);
      return undefined;
    }
    
    return toCamelCase(data);
  },

  async createPractitioner(practitioner: any) {
    const snakeCasePractitioner = toSnakeCase(practitioner);
    
    const { data, error } = await supabase
      .from('practitioners')
      .insert({
        ...snakeCasePractitioner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async updatePractitioner(userId: string, updates: any) {
    const snakeCaseUpdates = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('practitioners')
      .update({
        ...snakeCaseUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updatePractitioner error:', error);
      throw error;
    }
    return toCamelCase(data);
  },

  async getAllPractitioners() {
    const { data: practitioners, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .order('is_online', { ascending: false })
      .order('rating', { ascending: false });
    
    if (practError) {
      console.error('Error fetching practitioners:', practError);
      throw practError;
    }
    
    if (!practitioners || practitioners.length === 0) {
      return [];
    }
    
    const userIds = practitioners
      .map(p => p.user_id)
      .filter(id => id != null && id !== 'undefined');
    
    if (userIds.length === 0) {
      return [];
    }
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const result = practitioners
      .filter(pract => pract.user_id != null && pract.user_id !== 'undefined')
      .map(pract => ({
        ...toCamelCase(pract),
        profile: toCamelCase(profileMap.get(pract.user_id) || {})
      }));
    
    return result;
  },

  async getOnlinePractitioners() {
    const { data: practitioners, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('is_online', true);
    
    if (practError) {
      console.error('Error fetching online practitioners:', practError);
      throw practError;
    }
    
    if (!practitioners || practitioners.length === 0) {
      return [];
    }
    
    const userIds = practitioners
      .map(p => p.user_id)
      .filter(id => id != null);
    
    if (userIds.length === 0) {
      return [];
    }
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const result = practitioners
      .filter(pract => pract.user_id != null)
      .map(pract => ({
        ...toCamelCase(pract),
        profile: toCamelCase(profileMap.get(pract.user_id) || {})
      }));
    
    return result;
  },

  async getPractitionerWithProfile(userId: string) {
    const practitioner = await this.getPractitioner(userId);
    if (!practitioner) return undefined;
    
    const profile = await this.getProfile(userId);
    if (!profile) return undefined;
    
    return {
      ...practitioner,
      profile
    };
  },

  async getSession(id: string) {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !session) {
      console.error('Error fetching session:', error);
      return undefined;
    }
    
    const guestProfile = await this.getProfile(session.guest_id);
    const practitionerData = await this.getPractitionerWithProfile(session.practitioner_id);
    
    return {
      ...toCamelCase(session),
      guest: guestProfile,
      practitioner: practitionerData
    };
  },

  async getSessionsForPractitioner(practitionerId: string) {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
    
    const sessionsWithParticipants = await Promise.all(
      sessions.map(async (session) => {
        const guestProfile = await this.getProfile(session.guest_id);
        const practitionerData = await this.getPractitionerWithProfile(session.practitioner_id);
        
        return {
          ...toCamelCase(session),
          guest: guestProfile,
          practitioner: practitionerData
        };
      })
    );
    
    return sessionsWithParticipants;
  },

  async createSession(session: any) {
    const snakeCaseSession = toSnakeCase(session);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...snakeCaseSession,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async updateSession(id: string, updates: any) {
    const snakeCaseUpdates = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('sessions')
      .update({
        ...snakeCaseUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updateSession error:', error);
      throw error;
    }
    return toCamelCase(data);
  },

  async createReview(review: any) {
    const snakeCaseReview = toSnakeCase(review);
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...snakeCaseReview,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async getSessionReviews(sessionId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
    
    return (data || []).map(toCamelCase);
  }
};

// ==================== SUPABASE STORAGE SERVICE ====================

type StorageBucket = 'avatars' | 'gallery' | 'videos';

class SupabaseStorageService {
  private client = supabaseAdmin;

  /**
   * Get signed upload URL for a file
   * Returns both the upload URL and the final public URL
   */
  async getUploadUrl(
    bucket: StorageBucket,
    userId: string
  ): Promise<{ uploadUrl: string; publicUrl: string; fileName: string }> {
    // Generate unique filename with user ID prefix
    const fileId = randomUUID();
    const fileName = `${userId}/${fileId}`;
    
    // Create signed upload URL (valid for 15 minutes)
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileName);
    
    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message || 'Unknown error'}`);
    }
    
    // Get the public URL that will be accessible after upload
    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return {
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
      fileName
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: StorageBucket, fileName: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([fileName]);
    
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Upload a file directly from server (for migrations or admin operations)
   */
  async uploadFile(
    bucket: StorageBucket,
    fileName: string,
    file: Buffer | Blob,
    contentType: string
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType,
        upsert: true
      });
    
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }

  /**
   * List files in a bucket for a specific user
   */
  async listUserFiles(bucket: StorageBucket, userId: string): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(userId);
    
    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
    
    return (data || []).map(file => {
      const { data: urlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(`${userId}/${file.name}`);
      return urlData.publicUrl;
    });
  }

  /**
   * Get public URL for an existing file
   */
  getPublicUrl(bucket: StorageBucket, fileName: string): string {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  }

  /**
   * Initialize storage buckets on startup
   */
  async initializeBuckets(): Promise<void> {
    const buckets: Array<{ name: StorageBucket, public: boolean }> = [
      { name: 'avatars', public: true },
      { name: 'gallery', public: true },
      { name: 'videos', public: true }
    ];

    for (const bucket of buckets) {
      try {
        // First check if bucket exists
        const { data: existingBucket } = await this.client.storage.getBucket(bucket.name);
        
        if (existingBucket) {
          console.log(`ℹ️ Storage bucket already exists: ${bucket.name}`);
          continue;
        }
        
        // Create the bucket with appropriate settings
        const { error } = await this.client.storage
          .createBucket(bucket.name, { 
            public: bucket.public,
            // Don't set file size limits here - handle per upload
            allowedMimeTypes: bucket.name === 'videos' 
              ? ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-ms-wmv', 'video/x-msvideo', 'video/webm']
              : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
          });
        
        if (error) {
          console.error(`Failed to create bucket ${bucket.name}:`, error);
        } else {
          console.log(`✅ Storage bucket created: ${bucket.name}`);
        }
      } catch (error) {
        console.error(`Error handling bucket ${bucket.name}:`, error);
      }
    }
  }
}

const supabaseStorage = new SupabaseStorageService();

// ==================== HELPER FUNCTIONS ====================

// Helper function to parse JSON body
async function parseBody(req: VercelRequest): Promise<any> {
  if (!req.body) return null;
  
  // If body is already parsed (shouldn't happen in Vercel, but just in case)
  if (typeof req.body === 'object' && !(req.body instanceof Buffer)) {
    return req.body;
  }
  
  // Parse string body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse string body:', e);
      return req.body;
    }
  }
  
  // Parse Buffer body
  if (req.body instanceof Buffer) {
    try {
      const bodyString = req.body.toString('utf-8');
      return JSON.parse(bodyString);
    } catch (e) {
      console.error('Failed to parse buffer body:', e);
      return req.body.toString('utf-8');
    }
  }
  
  // For streams (ReadableStream), read and parse
  if (req.body && typeof req.body.pipe === 'function') {
    return new Promise((resolve, reject) => {
      let data = '';
      req.body.on('data', (chunk: any) => {
        data += chunk.toString();
      });
      req.body.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          console.error('Failed to parse stream body:', e);
          resolve(data);
        }
      });
      req.body.on('error', reject);
    });
  }
  
  return req.body;
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(value || '');
  });
  
  return cookies;
}

// ==================== ROUTE HANDLERS ====================

// All route handlers are now inline functions

const healthHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
};

const versionHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.json({
    timestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    requiresReload: false
  });
};

const cacheBustHandler = async (req: VercelRequest, res: VercelResponse) => {
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
};

const signupHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password, full_name, role } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(1),
      role: z.enum(['guest', 'practitioner'])
    }).parse(req.body);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // Create profile for the new user
    const profile = await storage.createProfile({
      id: authData.user.id,
      role,
      displayName: full_name,
      country: null,
      bio: null,
      avatarUrl: null,
      galleryUrls: [],
      videoUrl: null,
      specialties: []
    });

    // If practitioner, create practitioner record
    if (role === 'practitioner') {
      await storage.createPractitioner({
        userId: authData.user.id,
        isOnline: false,
        inService: false,
        rating: "0.0",
        reviewCount: 0
      });
    }

    // Return user data and access token
    res.json({
      user: authData.user,
      session: authData.session,
      access_token: authData.session?.access_token,
      profile
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Signup failed' });
  }
};

const loginHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    let profile = await storage.getProfile(authData.user.id);

    // Auto-create profile for existing Supabase Auth accounts without profiles
    if (!profile) {
      console.log(`No profile found for ${email}, auto-creating based on email...`);
      
      // Determine role based on email
      const role = email === 'chefmat2018@gmail.com' ? 'practitioner' : 
                  email === 'cheekyma@hotmail.com' ? 'guest' : 
                  'guest'; // Default to guest for any other email

      // Extract display name from email
      const displayName = email.split('@')[0].replace(/[0-9]/g, '').replace(/[._-]/g, ' ');

      // Create profile
      profile = await storage.createProfile({
        id: authData.user.id,
        role,
        displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        country: null,
        bio: null,
        avatarUrl: null,
        galleryUrls: [],
        videoUrl: null,
        specialties: [],
      });

      // If practitioner, create practitioner record
      if (role === 'practitioner') {
        console.log('Creating practitioner record for', email);
        await storage.createPractitioner({
          userId: authData.user.id,
          isOnline: false,
          inService: false,
          rating: "0.0",
          reviewCount: 0,
        });
      }

      console.log(`Profile auto-created for ${email} with role: ${role}`);
    }

    // Return user data and access token
    res.json({
      user: authData.user,
      session: authData.session,
      access_token: authData.session.access_token,
      profile
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(401).json({ error: error.message || 'Login failed' });
  }
};

const logoutHandler = async (req: VercelRequest, res: VercelResponse) => {
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
    } else if (req.body?.refresh_token) {
      // Fall back to refresh token from body if provided
      token = req.body.refresh_token;
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
  } catch (error: any) {
    console.error('Logout error:', error);
    // Still return 204 even if there's an error
    res.status(204).send('');
  }
};

const userHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const profile = await storage.getProfile(auth.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Also get practitioner data if user is a practitioner
    let practitionerData = null;
    if (profile.role === 'practitioner') {
      practitionerData = await storage.getPractitioner(auth.userId);
    }

    res.json({
      id: auth.userId,
      profile,
      practitioner: practitionerData
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(400).json({ error: error.message || 'Failed to get user data' });
  }
};

const profileHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  const auth = await requireAuth(req, res);
  if (!auth) return;
  
  if (req.method === 'GET') {
    try {
      const profile = await storage.getProfile(auth.userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(400).json({ error: error.message || 'Failed to get profile' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updates = req.body;
      const profile = await storage.updateProfile(auth.userId, updates);
      res.json(profile);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: error.message || 'Failed to update profile' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

const practitionersListHandler = async (req: VercelRequest, res: VercelResponse) => {
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
};

const practitionerDetailHandler = async (req: VercelRequest, res: VercelResponse) => {
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
};

const practitionerOnlineHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const practitioners = await storage.getOnlinePractitioners();
    res.json(practitioners);
  } catch (error: any) {
    console.error('Get online practitioners error:', error);
    res.status(400).json({ error: error.message || 'Failed to get online practitioners' });
  }
};

const practitionerToggleStatusHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { isOnline, inService } = z.object({
      isOnline: z.boolean().optional(),
      inService: z.boolean().optional()
    }).parse(req.body);
    
    const existingPractitioner = await storage.getPractitioner(auth.userId);
    if (!existingPractitioner) {
      return res.status(404).json({ error: 'Practitioner not found' });
    }
    
    const updates: any = {};
    if (isOnline !== undefined) updates.isOnline = isOnline;
    if (inService !== undefined) updates.inService = inService;
    
    const practitioner = await storage.updatePractitioner(auth.userId, updates);
    res.json(practitioner);
  } catch (error: any) {
    console.error('Toggle status error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to toggle status' });
  }
};

const sessionStartHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    console.log('Session start request:', req.body);
    
    const { practitionerId, liveSeconds } = z.object({
      practitionerId: z.string().uuid(),
      liveSeconds: z.number().int().positive(),
    }).parse(req.body);

    const guestId = auth.userId;
    console.log('Guest ID:', guestId, 'Practitioner ID:', practitionerId);

    // Verify guest role
    const guest = await storage.getProfile(guestId);
    if (!guest || guest.role !== 'guest') {
      console.error('User is not a guest:', guest);
      return res.status(403).json({ error: 'Only guests can start sessions' });
    }

    // Verify practitioner exists and is online
    const practitioner = await storage.getPractitioner(practitionerId);
    console.log('Practitioner status:', practitioner);
    if (!practitioner || !(practitioner as any).isOnline) {
      return res.status(400).json({ error: 'Practitioner is not available' });
    }

    // Create session
    const sessionId = randomUUID();
    const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
    
    console.log('Creating session with ID:', sessionId);
    
    const session = await storage.createSession({
      practitionerId: practitionerId,
      guestId: guestId,
      phase: 'waiting',
      liveSeconds: liveSeconds,
      practitionerReady: false,
      guestReady: false,
      acknowledgedPractitioner: false,
      agoraChannel: agoraChannel,
    });

    console.log('Session created:', session);

    // Mark practitioner as in service
    await storage.updatePractitioner(practitionerId, { inService: true });

    res.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(400).json({ error: error.message });
  }
};

const sessionAcceptHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is the practitioner
    if (userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Only the practitioner can accept the session' });
    }

    // Verify session is in waiting phase
    if (session.phase !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting phase' });
    }

    // Mark practitioner as acknowledged and ready when accepting from dashboard
    const updatedSession = await storage.updateSession(sessionId, {
      acknowledgedPractitioner: true,
      readyPractitioner: true,
    });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const sessionAcknowledgeHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is the practitioner
    if (userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Only the practitioner can acknowledge the session' });
    }

    // Verify session is in waiting phase
    if (session.phase !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting phase' });
    }

    // Update session to mark practitioner acknowledged
    const updatedSession = await storage.updateSession(sessionId, {
      acknowledgedPractitioner: true
    });

    res.json({ 
      success: true,
      message: 'Session acknowledged. Guest has been notified.',
      session: updatedSession
    });
  } catch (error: any) {
    console.error('Acknowledge error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to acknowledge session' });
  }
};

const sessionReadyHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId, who } = z.object({
      sessionId: z.string().uuid(),
      who: z.enum(['guest', 'practitioner']),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is participant
    if (userId !== session.guestId && userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Not a session participant' });
    }

    // For practitioner, ensure they have acknowledged first
    if (who === 'practitioner' && !session.acknowledgedPractitioner) {
      return res.status(400).json({ 
        error: 'Please acknowledge the session request first' 
      });
    }

    const updates: any = {};
    
    if (who === 'guest') {
      updates.readyGuest = true;
    } else {
      updates.readyPractitioner = true;
    }

    // Check if both ready, transition to live
    const bothReady = (who === 'guest') 
      ? session.readyPractitioner === true
      : session.readyGuest === true;

    if (bothReady && session.phase === 'waiting') {
      // Auto-transition to live phase when both parties are ready
      updates.phase = 'live';
      updates.liveStartedAt = new Date().toISOString();
      
      console.log(`Session ${sessionId} auto-transitioning to live phase - both parties ready`);
    }

    const updatedSession = await storage.updateSession(sessionId, updates);
    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const sessionRejectHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is the practitioner
    if (userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Only the practitioner can reject the session' });
    }

    // Verify session is in waiting phase
    if (session.phase !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting phase' });
    }

    // Update session phase to ended
    const updatedSession = await storage.updateSession(sessionId, {
      phase: 'ended'
    });

    // Mark practitioner as not in service
    await storage.updatePractitioner(session.practitionerId, { inService: false });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const sessionEndHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = z.object({
      sessionId: z.string().uuid(),
    }).parse(req.body);

    const userId = auth.userId;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is participant
    if (userId !== session.guestId && userId !== session.practitionerId) {
      return res.status(403).json({ error: 'Not a session participant' });
    }

    const updatedSession = await storage.updateSession(sessionId, {
      phase: 'ended'
    });

    // Mark practitioner as not in service
    await storage.updatePractitioner(session.practitionerId, { inService: false });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const sessionPractitionerHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const userId = auth.userId;
    
    // Verify practitioner role
    const profile = await storage.getProfile(userId);
    if (!profile || profile.role !== 'practitioner') {
      return res.status(403).json({ error: 'Only practitioners can access this endpoint' });
    }

    // Get all sessions for this practitioner (waiting and live phases)
    const sessions = await storage.getSessionsForPractitioner(userId);
    res.json(sessions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const sessionDetailHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const session = await storage.getSession(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(400).json({ error: error.message || 'Failed to get session' });
  }
};

const reviewCreateHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId, rating, comment } = z.object({
      sessionId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    }).parse(req.body);

    const guestId = auth.userId;
    
    // Get session to verify guest and get practitioner
    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is the guest for this session
    if (session.guestId !== guestId) {
      return res.status(403).json({ error: 'Only the session guest can create a review' });
    }
    
    // Verify session has ended
    if (session.phase !== 'ended') {
      return res.status(400).json({ error: 'Can only review completed sessions' });
    }
    
    // Create the review
    const review = await storage.createReview({
      sessionId,
      guestId,
      practitionerId: session.practitionerId,
      rating,
      comment: comment || null,
    });
    
    // Update practitioner's rating
    const reviews = await storage.getSessionReviews(session.practitionerId);
    const avgRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length;
    
    await storage.updatePractitioner(session.practitionerId, {
      rating: avgRating.toFixed(1),
      reviewCount: reviews.length,
    });
    
    res.json(review);
  } catch (error: any) {
    console.error('Create review error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to create review' });
  }
};

const reviewSessionHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { sessionId } = req.query;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const reviews = await storage.getSessionReviews(sessionId);
    res.json(reviews);
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(400).json({ error: error.message || 'Failed to get reviews' });
  }
};

const uploadUrlHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { bucket } = z.object({
      bucket: z.enum(['avatars', 'gallery', 'videos'] as const)
    }).parse(req.body);
    
    const result = await supabaseStorage.getUploadUrl(
      bucket as StorageBucket,
      auth.userId
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Upload URL error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to generate upload URL' });
  }
};

const agoraTokenHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { channel, uid } = z.object({
      channel: z.string(),
      uid: z.string(),
    }).parse(req.query);

    const { appId, appCertificate } = agoraConfig;

    if (!appId || !appCertificate) {
      return res.status(500).json({ error: 'Agora credentials not configured' });
    }

    const privilegeExpireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    // Both practitioners and guests need to publish audio/video in a call
    // So we always use PUBLISHER role for both
    const agoraRole = RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channel,
      uid, // Use string UID directly
      agoraRole,
      privilegeExpireTime
    );

    res.json({ 
      token,
      appId,
      uid
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ==================== MAIN HANDLER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, method } = req;
  const path = url?.replace(/^\/api/, '') || '';
  
  // Parse body for POST, PUT, PATCH requests BEFORE delegating to handlers
  // This is critical because Vercel provides raw streams but handlers expect parsed JSON
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      req.body = await parseBody(req);
      console.log(`Parsed body for ${method} ${path}:`, req.body);
    } catch (error) {
      console.error('Error parsing body:', error);
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }
  
  // Parse cookies and attach to request for session management
  const cookies = parseCookies(req.headers.cookie);
  (req as any).cookies = cookies;

  try {
    // Health check
    if (path === '/health') {
      return healthHandler(req, res);
    }
    
    // Version check
    if (path === '/version') {
      return versionHandler(req, res);
    }
    
    // Cache bust
    if (path === '/cache-bust') {
      return cacheBustHandler(req, res);
    }

    // Auth routes
    if (path === '/auth/signup' && method === 'POST') {
      return signupHandler(req, res);
    }
    if (path === '/auth/login' && method === 'POST') {
      return loginHandler(req, res);
    }
    if (path === '/auth/logout' && method === 'POST') {
      return logoutHandler(req, res);
    }
    if (path === '/auth/user' && method === 'GET') {
      return userHandler(req, res);
    }

    // Profile routes
    if (path === '/profile' && (method === 'GET' || method === 'PUT')) {
      return profileHandler(req, res);
    }

    // Practitioners routes
    if (path === '/practitioners' && method === 'GET') {
      return practitionersListHandler(req, res);
    }
    if (path === '/practitioners/online' && method === 'GET') {
      return practitionerOnlineHandler(req, res);
    }
    if (path === '/practitioners/toggle-status' && method === 'PUT') {
      return practitionerToggleStatusHandler(req, res);
    }
    
    const practitionerMatch = path.match(/^\/practitioners\/([^\/]+)$/);
    if (practitionerMatch) {
      const [, id] = practitionerMatch;
      req.query = { ...req.query, id };
      
      if (method === 'GET') {
        return practitionerDetailHandler(req, res);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Sessions routes
    if (path === '/sessions/start' && method === 'POST') {
      return sessionStartHandler(req, res);
    }
    if (path === '/sessions/accept' && method === 'POST') {
      return sessionAcceptHandler(req, res);
    }
    if (path === '/sessions/acknowledge' && method === 'POST') {
      return sessionAcknowledgeHandler(req, res);
    }
    if (path === '/sessions/ready' && method === 'POST') {
      return sessionReadyHandler(req, res);
    }
    if (path === '/sessions/reject' && method === 'POST') {
      return sessionRejectHandler(req, res);
    }
    if (path === '/sessions/end' && method === 'POST') {
      return sessionEndHandler(req, res);
    }
    if (path === '/sessions/practitioner' && method === 'GET') {
      return sessionPractitionerHandler(req, res);
    }
    
    const sessionMatch = path.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch) {
      const [, id] = sessionMatch;
      req.query = { ...req.query, id };
      
      if (method === 'GET') {
        return sessionDetailHandler(req, res);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Reviews routes
    if (path === '/reviews/create' && method === 'POST') {
      return reviewCreateHandler(req, res);
    }
    
    const reviewSessionMatch = path.match(/^\/reviews\/([^\/]+)$/);
    if (reviewSessionMatch && method === 'GET') {
      const [, sessionId] = reviewSessionMatch;
      req.query = { ...req.query, sessionId };
      return reviewSessionHandler(req, res);
    }

    // Upload routes
    if (path === '/uploads/url' && method === 'POST') {
      return uploadUrlHandler(req, res);
    }

    // Agora token
    if (path === '/agora/token' && method === 'GET') {
      return agoraTokenHandler(req, res);
    }

    // 404 for unmatched routes
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}