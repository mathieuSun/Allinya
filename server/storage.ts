import {
  type RuntimeProfile,
  type RuntimePractitioner,
  type RuntimeSession,
  type RuntimeReview,
  type PractitionerWithProfile,
  type SessionWithParticipants,
} from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Use Supabase service role key for backend operations
// Add no-cache header and force schema reload to avoid PostgREST cache issues
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Prefer': 'return=representation'
    }
  }
});

// Helper function to convert snake_case to camelCase
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item));
  }
  
  const converted: any = {};
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = snakeToCamel(obj[key]);
  }
  return converted;
}

// Helper function to convert camelCase to snake_case
function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item));
  }
  
  const converted: any = {};
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = camelToSnake(obj[key]);
  }
  return converted;
}

// Define camelCase input types for the storage interface
type InsertProfileInput = {
  id: string;
  role: "guest" | "practitioner";
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  galleryUrls?: string[] | null;
  videoUrl?: string | null;
  // Removed country and specialties - schema cache issues
};

type InsertPractitionerInput = {
  userId: string;
  isOnline?: boolean;
  inService?: boolean;
  rating?: string | null;
  reviewCount?: number | null;
};

type InsertSessionInput = {
  practitionerId: string;
  guestId: string;
  status?: "waiting" | "room_timer" | "live" | "ended";
  liveSeconds?: number;
  waitingSeconds?: number;
  readyPractitioner?: boolean;
  readyGuest?: boolean;
  acknowledgedPractitioner?: boolean;
  agoraChannel?: string | null;
};

type InsertReviewInput = {
  sessionId: string;
  guestId: string;
  practitionerId: string;
  rating?: number | null;
  comment?: string | null;
};

export interface IStorage {
  // Profile operations
  getProfile(id: string): Promise<RuntimeProfile | undefined>;
  createProfile(profile: InsertProfileInput): Promise<RuntimeProfile>;
  updateProfile(id: string, updates: Partial<RuntimeProfile>): Promise<RuntimeProfile>;

  // Practitioner operations
  getPractitioner(userId: string): Promise<RuntimePractitioner | undefined>;
  getPractitionerById(id: string): Promise<RuntimePractitioner | undefined>;
  createPractitioner(practitioner: InsertPractitionerInput): Promise<RuntimePractitioner>;
  updatePractitioner(userId: string, updates: Partial<RuntimePractitioner>): Promise<RuntimePractitioner>;
  getAllPractitioners(): Promise<PractitionerWithProfile[]>;
  getOnlinePractitioners(): Promise<PractitionerWithProfile[]>;
  getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined>;

  // Session operations
  getSession(id: string): Promise<SessionWithParticipants | undefined>;
  getSessionsForPractitioner(practitionerId: string): Promise<SessionWithParticipants[]>;
  getActivePractitionerSessions(practitionerId: string): Promise<RuntimeSession[]>;
  createSession(session: InsertSessionInput): Promise<RuntimeSession>;
  updateSession(id: string, updates: Partial<RuntimeSession>): Promise<RuntimeSession>;

  // Review operations
  createReview(review: InsertReviewInput): Promise<RuntimeReview>;
  getSessionReviews(sessionId: string): Promise<RuntimeReview[]>;
}


export class DbStorage implements IStorage {
  async getProfile(id: string): Promise<RuntimeProfile | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return undefined;
    }
    
    // Convert any snake_case fields to camelCase
    return snakeToCamel(data) as RuntimeProfile;
  }

  async createProfile(profile: InsertProfileInput): Promise<RuntimeProfile> {
    // CRITICAL FIX: Explicitly set userId to match id
    // The database has both id and userId columns, and userId must be set
    const dbProfile: any = {
      id: profile.id,
      userId: profile.id,  // MUST explicitly set userId to avoid NOT NULL constraint
      role: profile.role,
      displayName: profile.displayName,
      bio: profile.bio || null,
      avatarUrl: profile.avatarUrl || null,
      galleryUrls: profile.galleryUrls || [],
      videoUrl: profile.videoUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('DEBUG: Sending to database:', JSON.stringify(dbProfile, null, 2));
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(dbProfile)
      .select()
      .single();
    
    if (error) {
      console.error('DEBUG: Database error:', error);
      throw error;
    }
    
    // Data is already in camelCase from Supabase view
    return data as RuntimeProfile;
  }

  async updateProfile(id: string, updates: Partial<RuntimeProfile>): Promise<RuntimeProfile> {
    const { data, error} = await supabase
      .from('profiles')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    return data as RuntimeProfile;
  }

  async getPractitionerById(id: string): Promise<RuntimePractitioner | undefined> {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner by ID:', error);
      return undefined;
    }
    
    // Convert any snake_case fields to camelCase
    return snakeToCamel(data) as RuntimePractitioner;
  }

  async getPractitioner(userId: string): Promise<RuntimePractitioner | undefined> {
    // PostgREST automatically converts camelCase to snake_case, so use snake_case in queries
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('userId', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner:', error);
      return undefined;
    }
    
    // Convert snake_case response to camelCase
    return snakeToCamel(data) as RuntimePractitioner;
  }

  async createPractitioner(practitioner: InsertPractitionerInput): Promise<RuntimePractitioner> {
    const { data, error } = await supabase
      .from('practitioners')
      .insert({
        ...practitioner,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    // Convert any snake_case fields to camelCase
    return snakeToCamel(data) as RuntimePractitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<RuntimePractitioner>): Promise<RuntimePractitioner> {
    // Use camelCase directly since database has camelCase columns
    const { data, error } = await supabase
      .from('practitioners')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updatePractitioner error:', error);
      throw error;
    }
    // Convert any snake_case fields to camelCase
    return snakeToCamel(data) as RuntimePractitioner;
  }

  async getAllPractitioners(): Promise<PractitionerWithProfile[]> {
    try {
      // PostgREST automatically converts camelCase to snake_case, so use snake_case in queries
      const { data: practitioners, error: practError } = await supabase
        .from('practitioners')
        .select('*')
        .order('isOnline', { ascending: false, nullsFirst: false })
        .order('rating', { ascending: false });
      
      if (practError) {
        console.error('Error fetching practitioners:', practError);
        throw practError;
      }
      
      console.log('getAllPractitioners - Raw practitioners from DB:', practitioners?.length, 'records');
      console.log('First practitioner:', practitioners?.[0]);
      
      if (!practitioners || practitioners.length === 0) {
        return [];
      }
      
      // Get all user IDs (filter out any undefined/null values)
      const userIds = practitioners
        .map(p => p.userId)
        .filter(id => id != null && id !== 'undefined');
      
      if (userIds.length === 0) {
        console.log('No valid user IDs found in practitioners');
        return [];
      }
      
      // Fetch profiles for all practitioners
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }
      
      // Manually join the data - convert profiles to camelCase too
      const profileMap = new Map((profiles || []).map(p => [p.id, snakeToCamel(p)]));
      const result = practitioners
        .filter(pract => pract.userId != null && pract.userId !== 'undefined')
        .map(pract => {
          // Convert snake_case response to camelCase
          const practCamelCase = snakeToCamel(pract) as RuntimePractitioner;
          return {
            ...practCamelCase,
            profile: profileMap.get(pract.userId) || {}
          };
        });
      
      return result as PractitionerWithProfile[];
    } catch (error) {
      console.error('getAllPractitioners error:', error);
      throw error;
    }
  }

  async getOnlinePractitioners(): Promise<PractitionerWithProfile[]> {
    try {
      // PostgREST automatically converts camelCase to snake_case, so use snake_case in queries
      const { data: practitioners, error: practError } = await supabase
        .from('practitioners')
        .select('*')
        .eq('isOnline', true);
      
      if (practError) {
        console.error('Error fetching online practitioners:', practError);
        throw practError;
      }
      
      if (!practitioners || practitioners.length === 0) {
        return [];
      }
      
      // Get all user IDs (filter out any undefined/null values)
      const userIds = practitioners
        .map(p => p.userId)
        .filter(id => id != null && id !== 'undefined');
      
      if (userIds.length === 0) {
        return [];
      }
      
      // Fetch profiles for all online practitioners
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profileError) {
        console.error('Error fetching profiles for online practitioners:', profileError);
        throw profileError;
      }
      
      // Manually join the data - convert profiles to camelCase too
      const profileMap = new Map((profiles || []).map(p => [p.id, snakeToCamel(p)]));
      const result = practitioners
        .filter(pract => pract.userId != null && pract.userId !== 'undefined')
        .map(pract => {
          // Convert snake_case response to camelCase
          const practCamelCase = snakeToCamel(pract) as RuntimePractitioner;
          return {
            ...practCamelCase,
            profile: profileMap.get(pract.userId) || {}
          };
        });
      
      return result as PractitionerWithProfile[];
    } catch (error) {
      console.error('getOnlinePractitioners error:', error);
      throw error;
    }
  }

  async getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined> {
    // PostgREST automatically converts camelCase to snake_case, so use snake_case in queries
    const { data: practitioner, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('userId', userId)
      .single();
    
    if (practError) {
      console.error('Error fetching practitioner:', practError);
      return undefined;
    }
    
    if (!practitioner) {
      return undefined;
    }
    
    // Fetch the profile separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return undefined;
    }
    
    // Convert snake_case response to camelCase and manually combine the data
    const practCamelCase = snakeToCamel(practitioner) as RuntimePractitioner;
    const profileCamelCase = profile ? snakeToCamel(profile) : {};
    const result = {
      ...practCamelCase,
      profile: profileCamelCase
    };
    
    return result as PractitionerWithProfile;
  }

  async getSession(id: string): Promise<SessionWithParticipants | undefined> {
    // Fetch session without joins first
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return undefined;
    }
    
    if (!session) return undefined;
    
    // Fetch practitioner profile separately (using practitioner's userId from practitioners table)
    // Note: session.practitionerId is the practitioners table ID, not the user ID
    const { data: practitionerRecord } = await supabase
      .from('practitioners')
      .select('userId')
      .eq('id', session.practitionerId)
      .single();
    
    const { data: practitioner } = practitionerRecord ? await supabase
      .from('profiles')
      .select('*')
      .eq('id', practitionerRecord.userId)
      .single() : { data: null };
    
    // Fetch guest profile separately
    const { data: guest } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.guestId)
      .single();
    
    // Combine the data manually
    return {
      ...session,
      practitioner: practitioner || null,
      guest: guest || null
    } as SessionWithParticipants;
  }

  async getSessionsForPractitioner(practitionerId: string): Promise<SessionWithParticipants[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        practitioner:profiles!practitionerId (*),
        guest:profiles!guestId (*)
      `)
      .eq('practitionerId', practitionerId)
      .in('status', ['waiting', 'live'])
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching sessions for practitioner:', error);
      return [];
    }
    
    return (data || []) as SessionWithParticipants[];
  }

  async getActivePractitionerSessions(practitionerId: string): Promise<RuntimeSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('practitionerId', practitionerId)
      .in('status', ['waiting', 'room_timer', 'live'])
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching active sessions for practitioner:', error);
      return [];
    }
    
    return (data || []) as RuntimeSession[];
  }

  async createSession(session: InsertSessionInput): Promise<RuntimeSession> {
    // Generate a unique channel name for Agora video
    const agoraChannel = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...session,
        agoraChannel: agoraChannel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as RuntimeSession;
  }

  async updateSession(id: string, updates: Partial<RuntimeSession>): Promise<RuntimeSession> {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as RuntimeSession;
  }

  async createReview(review: InsertReviewInput): Promise<RuntimeReview> {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...review,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as RuntimeReview;
  }

  async getSessionReviews(sessionId: string): Promise<RuntimeReview[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('sessionId', sessionId);
    
    if (error) throw error;
    return data as RuntimeReview[];
  }
}

export const storage = new DbStorage();
