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
    
    return data as RuntimeProfile;
  }

  async createProfile(profile: InsertProfileInput): Promise<RuntimeProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
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

  async getPractitioner(userId: string): Promise<RuntimePractitioner | undefined> {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('userId', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner:', error);
      return undefined;
    }
    
    return data as RuntimePractitioner;
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
    return data as RuntimePractitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<RuntimePractitioner>): Promise<RuntimePractitioner> {
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
    return data as RuntimePractitioner;
  }

  async getAllPractitioners(): Promise<PractitionerWithProfile[]> {
    try {
      // PostgREST schema cache workaround: Fetch practitioners and profiles separately
      const { data: practitioners, error: practError } = await supabase
        .from('practitioners')
        .select('*')
        .order('isOnline', { ascending: false })
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
      
      // Manually join the data
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const result = practitioners
        .filter(pract => pract.userId != null && pract.userId !== 'undefined')
        .map(pract => ({
          ...pract,
          profile: profileMap.get(pract.userId) || {}
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
      
      // Manually join the data
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const result = practitioners
        .filter(pract => pract.userId != null && pract.userId !== 'undefined')
        .map(pract => ({
          ...pract,
          profile: profileMap.get(pract.userId) || {}
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
    
    // Manually combine the data
    const result = {
      ...practitioner,
      profile: profile || {}
    };
    
    return result as PractitionerWithProfile;
  }

  async getSession(id: string): Promise<SessionWithParticipants | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        practitioner:profiles!practitionerId (*),
        guest:profiles!guestId (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching session:', error);
      return undefined;
    }
    
    return data as SessionWithParticipants;
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
      .in('phase', ['waiting', 'live'])
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
      .in('phase', ['waiting', 'room_timer', 'live'])
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
