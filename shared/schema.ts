import { sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table - supports both guest and practitioner roles
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role", { enum: ["guest", "practitioner"] }).notNull(),
  displayName: text("displayName").notNull(),
  country: text("country"),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  galleryUrls: text("galleryUrls").array().default(sql`array[]::text[]`),
  videoUrl: text("videoUrl"),
  specialties: text("specialties").array().default(sql`array[]::text[]`),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// Practitioners table - presence and rating info  
export const practitioners = pgTable("practitioners", {
  userId: uuid("userId").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  isOnline: boolean("isOnline").notNull().default(false),
  inService: boolean("inService").notNull().default(false),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0.0"),
  reviewCount: integer("reviewCount").default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid("practitionerId").notNull().references(() => profiles.id),
  guestId: uuid("guestId").notNull().references(() => profiles.id),
  isGroup: boolean("isGroup").notNull().default(false),
  phase: text("phase", { enum: ["waiting", "room_timer", "live", "ended"] }).notNull().default("waiting"),
  waitingSeconds: integer("waitingSeconds").notNull().default(60),
  liveSeconds: integer("liveSeconds").notNull().default(900),
  waitingStartedAt: timestamp("waitingStartedAt", { withTimezone: true }),
  liveStartedAt: timestamp("liveStartedAt", { withTimezone: true }),
  endedAt: timestamp("endedAt", { withTimezone: true }),
  acknowledgedPractitioner: boolean("acknowledgedPractitioner").notNull().default(false),
  readyPractitioner: boolean("readyPractitioner").notNull().default(false),
  readyGuest: boolean("readyGuest").notNull().default(false),
  agoraChannel: text("agoraChannel"),
  agoraUidGuest: text("agoraUidGuest"),
  agoraUidPractitioner: text("agoraUidPractitioner"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// Reviews table - guest reviews after sessions
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  guestId: uuid("guestId").notNull().references(() => profiles.id),
  practitionerId: uuid("practitionerId").notNull().references(() => profiles.id),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

// Insert schemas - omit auto-generated fields
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

// Runtime types (now match database columns directly with camelCase)
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
  userId: string;
  isOnline: boolean;
  inService: boolean;
  rating: string | null;
  reviewCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimeSession = {
  id: string;
  practitionerId: string;
  guestId: string;
  isGroup: boolean;
  phase: "waiting" | "room_timer" | "live" | "ended";
  waitingSeconds: number;
  liveSeconds: number;
  waitingStartedAt: string | null;
  liveStartedAt: string | null;
  endedAt: string | null;
  acknowledgedPractitioner: boolean;
  readyPractitioner: boolean;
  readyGuest: boolean;
  agoraChannel: string | null;
  agoraUidGuest: string | null;
  agoraUidPractitioner: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimeReview = {
  id: string;
  sessionId: string;
  guestId: string;
  practitionerId: string;
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
