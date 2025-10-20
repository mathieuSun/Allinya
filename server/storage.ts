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
// Add no-cache header to force fresh schema fetch to avoid PostgREST cache issues
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

// Define camelCase input types for the storage interface
type InsertProfileInput = {
  id: string;
  role: "guest" | "practitioner";
  displayName: string;
  country?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  galleryUrls?: string[] | null;
  videoUrl?: string | null;
  specialties?: string[] | null;
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
  phase?: "waiting" | "room_timer" | "live" | "ended";
  liveSeconds?: number;
  startedAt?: string | null;
  practitionerReady?: boolean;
  guestReady?: boolean;
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
    
    return toCamelCase(data) as RuntimeProfile;
  }

  async createProfile(profile: InsertProfileInput): Promise<RuntimeProfile> {
    // Convert camelCase to snake_case for database
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
    return toCamelCase(data) as RuntimeProfile;
  }

  async updateProfile(id: string, updates: Partial<RuntimeProfile>): Promise<RuntimeProfile> {
    // Convert camelCase to snake_case for database
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
    return toCamelCase(data) as RuntimeProfile;
  }

  async getPractitioner(userId: string): Promise<RuntimePractitioner | undefined> {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner:', error);
      return undefined;
    }
    
    return toCamelCase(data) as RuntimePractitioner;
  }

  async createPractitioner(practitioner: InsertPractitionerInput): Promise<RuntimePractitioner> {
    // Convert camelCase to snake_case for database
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
    return toCamelCase(data) as RuntimePractitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<RuntimePractitioner>): Promise<RuntimePractitioner> {
    // Convert camelCase to snake_case for database
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
    return toCamelCase(data) as RuntimePractitioner;
  }

  async getAllPractitioners(): Promise<PractitionerWithProfile[]> {
    try {
      // PostgREST schema cache workaround: Fetch practitioners and profiles separately
      const { data: practitioners, error: practError } = await supabase
        .from('practitioners')
        .select('*')
        .order('is_online', { ascending: false })  // Use 'is_online' instead of 'online'
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
        .map(p => p.user_id)
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
      
      // Manually join the data
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const result = practitioners
        .filter(pract => pract.user_id != null && pract.user_id !== 'undefined')
        .map(pract => ({
          ...toCamelCase(pract),
          profile: toCamelCase(profileMap.get(pract.user_id) || {})
        }));
      
      return result as PractitionerWithProfile[];
    } catch (error) {
      console.error('getAllPractitioners error:', error);
      throw error;
    }
  }

  async getOnlinePractitioners(): Promise<PractitionerWithProfile[]> {
    try {
      // PostgREST schema cache workaround: Fetch practitioners and profiles separately
      const { data: practitioners, error: practError } = await supabase
        .from('practitioners')
        .select('*')
        .eq('is_online', true);  // Use 'is_online' instead of 'online'
      
      if (practError) {
        console.error('Error fetching online practitioners:', practError);
        throw practError;
      }
      
      if (!practitioners || practitioners.length === 0) {
        return [];
      }
      
      // Get all user IDs (filter out any undefined/null values)
      const userIds = practitioners
        .map(p => p.user_id)
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
      
      // Manually join the data
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const result = practitioners
        .filter(pract => pract.user_id != null && pract.user_id !== 'undefined')
        .map(pract => ({
          ...toCamelCase(pract),
          profile: toCamelCase(profileMap.get(pract.user_id) || {})
        }));
      
      return result as PractitionerWithProfile[];
    } catch (error) {
      console.error('getOnlinePractitioners error:', error);
      throw error;
    }
  }

  async getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined> {
    // PostgREST schema cache workaround: Fetch practitioners and profiles separately
    const { data: practitioner, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', userId)
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
    
    // Manually combine the data
    const result = {
      ...toCamelCase(practitioner),
      profile: toCamelCase(profile || {})
    };
    
    return result as PractitionerWithProfile;
  }

  async getSession(id: string): Promise<SessionWithParticipants | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        practitioner:profiles!practitioner_id (*),
        guest:profiles!guest_id (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching session:', error);
      return undefined;
    }
    
    return toCamelCase(data) as SessionWithParticipants;
  }

  async getSessionsForPractitioner(practitionerId: string): Promise<SessionWithParticipants[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        practitioner:profiles!practitioner_id (*),
        guest:profiles!guest_id (*)
      `)
      .eq('practitioner_id', practitionerId)
      .in('phase', ['waiting', 'live'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sessions for practitioner:', error);
      return [];
    }
    
    return toCamelCase(data || []) as SessionWithParticipants[];
  }

  async getActivePractitionerSessions(practitionerId: string): Promise<RuntimeSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .in('phase', ['waiting', 'room_timer', 'live'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching active sessions for practitioner:', error);
      return [];
    }
    
    return toCamelCase(data || []) as RuntimeSession[];
  }

  async createSession(session: InsertSessionInput): Promise<RuntimeSession> {
    const snakeCaseSession = toSnakeCase(session);
    
    // Generate a unique channel name for Agora video
    const agoraChannel = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...snakeCaseSession,
        agora_channel: agoraChannel, // Add the required agora_channel field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as RuntimeSession;
  }

  async updateSession(id: string, updates: Partial<RuntimeSession>): Promise<RuntimeSession> {
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
    
    if (error) throw error;
    return toCamelCase(data) as RuntimeSession;
  }

  async createReview(review: InsertReviewInput): Promise<RuntimeReview> {
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
    return toCamelCase(data) as RuntimeReview;
  }

  async getSessionReviews(sessionId: string): Promise<RuntimeReview[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return toCamelCase(data) as RuntimeReview[];
  }
}

export const storage = new DbStorage();
