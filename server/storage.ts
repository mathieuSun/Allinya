import {
  type Profile,
  type InsertProfile,
  type Practitioner,
  type InsertPractitioner,
  type Session,
  type InsertSession,
  type Review,
  type InsertReview,
  type PractitionerWithProfile,
  type SessionWithParticipants,
} from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Use Supabase service role key for backend operations
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

export interface IStorage {
  // Profile operations
  getProfile(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile & { id: string }): Promise<Profile>;
  updateProfile(id: string, updates: Partial<Profile>): Promise<Profile>;

  // Practitioner operations
  getPractitioner(userId: string): Promise<Practitioner | undefined>;
  createPractitioner(practitioner: InsertPractitioner): Promise<Practitioner>;
  updatePractitioner(userId: string, updates: Partial<Practitioner>): Promise<Practitioner>;
  getAllPractitioners(): Promise<PractitionerWithProfile[]>;
  getOnlinePractitioners(): Promise<PractitionerWithProfile[]>;
  getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined>;

  // Session operations
  getSession(id: string): Promise<SessionWithParticipants | undefined>;
  getSessionsForPractitioner(practitionerId: string): Promise<SessionWithParticipants[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getSessionReviews(sessionId: string): Promise<Review[]>;
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
  async getProfile(id: string): Promise<Profile | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return undefined;
    }
    
    return toCamelCase(data) as Profile;
  }

  async createProfile(profile: InsertProfile & { id: string }): Promise<Profile> {
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
    return toCamelCase(data) as Profile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    // Debug logging for field mapping issue
    console.log('updateProfile called with updates:', JSON.stringify(updates, null, 2));
    
    // Convert camelCase to snake_case for database
    const snakeCaseUpdates = toSnakeCase(updates);
    
    console.log('After conversion to snake_case:', JSON.stringify(snakeCaseUpdates, null, 2));
    
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
    return toCamelCase(data) as Profile;
  }

  async getPractitioner(userId: string): Promise<Practitioner | undefined> {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner:', error);
      return undefined;
    }
    
    return toCamelCase(data) as Practitioner;
  }

  async createPractitioner(practitioner: InsertPractitioner): Promise<Practitioner> {
    // Convert camelCase to snake_case for database
    const snakeCasePractitioner = toSnakeCase(practitioner);
    
    const { data, error } = await supabase
      .from('practitioners')
      .insert({
        ...snakeCasePractitioner,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Practitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<Practitioner>): Promise<Practitioner> {
    console.log('updatePractitioner called with updates:', JSON.stringify(updates, null, 2));
    
    // Convert camelCase to snake_case for database
    const snakeCaseUpdates = toSnakeCase(updates);
    
    // PostgREST schema cache workaround: Use 'is_online' instead of 'online'
    // The column exists in the database but PostgREST's schema cache doesn't recognize it
    if ('online' in snakeCaseUpdates) {
      snakeCaseUpdates.is_online = snakeCaseUpdates.online;
      delete snakeCaseUpdates.online;
    }
    
    console.log('After conversion to snake_case:', JSON.stringify(snakeCaseUpdates, null, 2));
    
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
    return toCamelCase(data) as Practitioner;
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

  async createSession(session: InsertSession): Promise<Session> {
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
    return toCamelCase(data) as Session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
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
    return toCamelCase(data) as Session;
  }

  async createReview(review: InsertReview): Promise<Review> {
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
    return toCamelCase(data) as Review;
  }

  async getSessionReviews(sessionId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return toCamelCase(data) as Review[];
  }
}

export const storage = new DbStorage();
