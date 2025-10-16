import { sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table - supports both guest and practitioner roles
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role", { enum: ["guest", "practitioner"] }).notNull(),
  display_name: text("display_name").notNull(),
  country: text("country"),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
  gallery_urls: text("gallery_urls").array().default(sql`array[]::text[]`),
  video_url: text("video_url"),
  specialties: text("specialties").array().default(sql`array[]::text[]`),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Practitioners table - presence and rating info (all columns use snake_case in database)
export const practitioners = pgTable("practitioners", {
  user_id: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  is_online: boolean("is_online").notNull().default(false),
  in_service: boolean("in_service").notNull().default(false),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0.0"),
  review_count: integer("review_count").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Sessions table - matches actual database structure
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  practitioner_id: uuid("practitioner_id").notNull().references(() => profiles.id),
  guest_id: uuid("guest_id").notNull().references(() => profiles.id),
  is_group: boolean("is_group").notNull().default(false),
  phase: text("phase", { enum: ["waiting", "room_timer", "live", "ended"] }).notNull().default("waiting"),
  waiting_seconds: integer("waiting_seconds").notNull().default(60),
  live_seconds: integer("live_seconds").notNull().default(900),
  waiting_started_at: timestamp("waiting_started_at", { withTimezone: true }),
  live_started_at: timestamp("live_started_at", { withTimezone: true }),
  ended_at: timestamp("ended_at", { withTimezone: true }),
  ready_practitioner: boolean("ready_practitioner").notNull().default(false),
  ready_guest: boolean("ready_guest").notNull().default(false),
  agora_channel: text("agora_channel"),
  agora_uid_guest: text("agora_uid_guest"),
  agora_uid_practitioner: text("agora_uid_practitioner"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Reviews table - guest reviews after sessions
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  guest_id: uuid("guest_id").notNull().references(() => profiles.id),
  practitioner_id: uuid("practitioner_id").notNull().references(() => profiles.id),
  rating: integer("rating"),
  comment: text("comment"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Insert schemas - omit auto-generated fields using snake_case column names
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({
  created_at: true,
  updated_at: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  created_at: true,
});

// Types
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export type InsertPractitioner = z.infer<typeof insertPractitionerSchema>;
export type Practitioner = typeof practitioners.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Runtime types after camelCase conversion (what the API actually returns)
// These represent the data after conversion from snake_case database columns

export type RuntimeProfile = {
  id: string;
  role: "guest" | "practitioner";
  displayName: string;
  country: string | null;
  bio: string | null;
  avatarUrl: string | null;
  galleryUrls: string[] | null;
  videoUrl: string | null;
  specialties: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimePractitioner = {
  userId: string;  // converted from 'user_id' in database
  isOnline: boolean;  // converted from 'is_online' in database
  inService: boolean;  // converted from 'in_service' in database
  rating: string | null;
  reviewCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimeSession = {
  id: string;
  practitionerId: string;  // converted from 'practitioner_id' in database
  guestId: string;  // converted from 'guest_id' in database
  isGroup: boolean;  // converted from 'is_group' in database  
  phase: "waiting" | "room_timer" | "live" | "ended";
  waitingSeconds: number;  // converted from 'waiting_seconds' in database
  liveSeconds: number;  // converted from 'live_seconds' in database
  waitingStartedAt: string | null;  // converted from 'waiting_started_at' in database
  liveStartedAt: string | null;  // converted from 'live_started_at' in database
  endedAt: string | null;  // converted from 'ended_at' in database
  readyPractitioner: boolean;  // converted from 'ready_practitioner' in database
  readyGuest: boolean;  // converted from 'ready_guest' in database
  agoraChannel: string | null;  // converted from 'agora_channel' in database
  agoraUidGuest: string | null;  // converted from 'agora_uid_guest' in database
  agoraUidPractitioner: string | null;  // converted from 'agora_uid_practitioner' in database
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimeReview = {
  id: string;
  sessionId: string;  // converted from 'session_id' in database
  guestId: string;  // converted from 'guest_id' in database
  practitionerId: string;  // converted from 'practitioner_id' in database
  rating: number | null;
  comment: string | null;
  createdAt: string | null;
};

// Extended types for API responses
export type PractitionerWithProfile = RuntimePractitioner & {
  profile: RuntimeProfile;
};

export type SessionWithParticipants = RuntimeSession & {
  practitioner: RuntimeProfile;
  guest: RuntimeProfile;
};
