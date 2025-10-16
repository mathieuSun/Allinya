import { sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table - supports both guest and practitioner roles
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role", { enum: ["guest", "practitioner"] }).notNull(),
  displayName: text("display_name").notNull(),
  country: text("country"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  galleryUrls: text("gallery_urls").array().default(sql`array[]::text[]`),
  videoUrl: text("video_url"),
  specialties: text("specialties").array().default(sql`array[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Practitioners table - presence and rating info
export const practitioners = pgTable("practitioners", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  online: boolean("online").notNull().default(false),
  inService: boolean("in_service").notNull().default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0.0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Sessions table - handles waiting room and live video phases
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid("practitioner_id").notNull().references(() => profiles.id),
  guestId: uuid("guest_id").notNull().references(() => profiles.id),
  isGroup: boolean("is_group").notNull().default(false),
  phase: text("phase", { enum: ["waiting", "live", "ended"] }).notNull(),
  waitingSeconds: integer("waiting_seconds").notNull().default(300),
  liveSeconds: integer("live_seconds").notNull(),
  waitingStartedAt: timestamp("waiting_started_at", { withTimezone: true }),
  liveStartedAt: timestamp("live_started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  agoraChannel: text("agora_channel").notNull(),
  agoraUidPractitioner: text("agora_uid_practitioner").notNull(),
  agoraUidGuest: text("agora_uid_guest").notNull(),
  readyPractitioner: boolean("ready_practitioner").notNull().default(false),
  readyGuest: boolean("ready_guest").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Reviews table - placeholder for future ratings
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id").notNull().references(() => profiles.id),
  practitionerId: uuid("practitioner_id").notNull().references(() => profiles.id),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Insert schemas
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
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
export type RuntimePractitioner = {
  id: string;  // converted from 'id' in database (not userId)
  isOnline: boolean;  // converted from 'is_online' in database
  inService: boolean;  // already camelCase
  rating: string | null;
  reviewCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// Extended types for API responses
export type PractitionerWithProfile = RuntimePractitioner & {
  profile: Profile;
};

export type SessionWithParticipants = Session & {
  practitioner: Profile;
  guest: Profile;
};
