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
  profiles,
  practitioners,
  sessions,
  reviews,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

export class DbStorage implements IStorage {
  async getProfile(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async createProfile(profile: InsertProfile & { id: string }): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const [updated] = await db
      .update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return updated;
  }

  async getPractitioner(userId: string): Promise<Practitioner | undefined> {
    const [practitioner] = await db.select().from(practitioners).where(eq(practitioners.userId, userId));
    return practitioner;
  }

  async createPractitioner(practitioner: InsertPractitioner): Promise<Practitioner> {
    const [newPractitioner] = await db.insert(practitioners).values(practitioner).returning();
    return newPractitioner;
  }

  async updatePractitioner(userId: string, updates: Partial<Practitioner>): Promise<Practitioner> {
    const [updated] = await db
      .update(practitioners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(practitioners.userId, userId))
      .returning();
    return updated;
  }

  async getOnlinePractitioners(): Promise<PractitionerWithProfile[]> {
    const results = await db
      .select()
      .from(practitioners)
      .innerJoin(profiles, eq(practitioners.userId, profiles.id))
      .where(eq(practitioners.online, true));

    return results.map((r) => ({
      ...r.practitioners,
      profile: r.profiles,
    }));
  }

  async getPractitionerWithProfile(userId: string): Promise<PractitionerWithProfile | undefined> {
    const [result] = await db
      .select()
      .from(practitioners)
      .innerJoin(profiles, eq(practitioners.userId, profiles.id))
      .where(eq(practitioners.userId, userId));

    if (!result) return undefined;

    return {
      ...result.practitioners,
      profile: result.profiles,
    };
  }

  async getSession(id: string): Promise<SessionWithParticipants | undefined> {
    const [result] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!result) return undefined;

    const [practitioner] = await db.select().from(profiles).where(eq(profiles.id, result.practitionerId));
    const [guest] = await db.select().from(profiles).where(eq(profiles.id, result.guestId));

    return {
      ...result,
      practitioner,
      guest,
    };
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const [updated] = await db
      .update(sessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return updated;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getSessionReviews(sessionId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.sessionId, sessionId));
  }
}

export const storage = new DbStorage();
