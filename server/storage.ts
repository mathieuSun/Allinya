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
  getOnlinePractitioners(): Promise<PractitionerWithProfile[]>;
  getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined>;

  // Session operations
  getSession(id: string): Promise<SessionWithParticipants | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getSessionReviews(sessionId: string): Promise<Review[]>;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;
  
  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snakeKey] = toSnakeCase(obj[key]);
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
    
    return data as Profile;
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
    return data as Profile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    // Convert camelCase to snake_case for database
    const snakeCaseUpdates = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...snakeCaseUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
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
    
    return data as Practitioner;
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
    return data as Practitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<Practitioner>): Promise<Practitioner> {
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
    
    if (error) throw error;
    return data as Practitioner;
  }

  async getOnlinePractitioners(): Promise<PractitionerWithProfile[]> {
    const { data, error } = await supabase
      .from('practitioners')
      .select(`
        *,
        profile:profiles!user_id (*)
      `)
      .eq('online', true);
    
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      ...item,
      profile: item.profile
    })) as PractitionerWithProfile[];
  }

  async getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined> {
    const { data, error } = await supabase
      .from('practitioners')
      .select(`
        *,
        profile:profiles!user_id (*)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching practitioner with profile:', error);
      return undefined;
    }
    
    return {
      ...data,
      profile: data.profile
    } as PractitionerWithProfile;
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
    
    return data as SessionWithParticipants;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...session,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Session;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...review,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Review;
  }

  async getSessionReviews(sessionId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data as Review[];
  }
}

export const storage = new DbStorage();
