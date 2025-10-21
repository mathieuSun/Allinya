import { sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { createColumn, validateTableSchema } from "./schemaUtils";
import type { StrictCamelCase } from "./typeGuards";

// Profiles table - supports both guest and practitioner roles
// All columns are validated for camelCase and duplicate prevention
export const profiles = pgTable("profiles", {
  id: createColumn("profiles", "id", uuid("id").primaryKey()),
  role: createColumn("profiles", "role", text("role", { enum: ["guest", "practitioner"] }).notNull()),
  displayName: createColumn("profiles", "displayName", text("displayName").notNull()),
  country: createColumn("profiles", "country", text("country")),
  bio: createColumn("profiles", "bio", text("bio")),
  avatarUrl: createColumn("profiles", "avatarUrl", text("avatarUrl")),
  galleryUrls: createColumn("profiles", "galleryUrls", text("galleryUrls").array().default(sql`array[]::text[]`)),
  videoUrl: createColumn("profiles", "videoUrl", text("videoUrl")),
  specialties: createColumn("profiles", "specialties", text("specialties").array().default(sql`array[]::text[]`)),
  createdAt: createColumn("profiles", "createdAt", timestamp("createdAt", { withTimezone: true }).defaultNow()),
  updatedAt: createColumn("profiles", "updatedAt", timestamp("updatedAt", { withTimezone: true }).defaultNow()),
});

// Practitioners table - presence and rating info
// All columns validated for camelCase and uniqueness  
export const practitioners = pgTable("practitioners", {
  id: createColumn("practitioners", "id", uuid("id").primaryKey().default(sql`gen_random_uuid()`)),
  userId: createColumn("practitioners", "userId", uuid("userId").notNull().references(() => profiles.id, { onDelete: "cascade" })),
  specialties: createColumn("practitioners", "specialties", text("specialties").array().default(sql`ARRAY[]::text[]`)),
  hourlyRate: createColumn("practitioners", "hourlyRate", numeric("hourlyRate", { precision: 10, scale: 2 })),
  isOnline: createColumn("practitioners", "isOnline", boolean("isOnline").notNull().default(false)),
  inService: createColumn("practitioners", "inService", boolean("inService").notNull().default(false)),
  reviewCount: createColumn("practitioners", "reviewCount", integer("reviewCount").default(0)),
  createdAt: createColumn("practitioners", "createdAt", timestamp("createdAt", { withTimezone: true }).defaultNow()),
  updatedAt: createColumn("practitioners", "updatedAt", timestamp("updatedAt", { withTimezone: true }).defaultNow()),
});

// Sessions table
// Enforces strict camelCase for all session-related columns
export const sessions = pgTable("sessions", {
  id: createColumn("sessions", "id", uuid("id").primaryKey().default(sql`gen_random_uuid()`)),
  practitionerId: createColumn("sessions", "practitionerId", uuid("practitionerId").notNull().references(() => practitioners.id)),
  guestId: createColumn("sessions", "guestId", uuid("guestId").notNull().references(() => profiles.id)),
  status: createColumn("sessions", "status", text("status", { enum: ["waiting", "room_timer", "live", "ended"] }).notNull().default("waiting")),
  isGroup: createColumn("sessions", "isGroup", boolean("isGroup").notNull().default(false)),
  waitingSeconds: createColumn("sessions", "waitingSeconds", integer("waitingSeconds").notNull().default(60)),
  liveSeconds: createColumn("sessions", "liveSeconds", integer("liveSeconds").notNull().default(900)),
  waitingStartedAt: createColumn("sessions", "waitingStartedAt", timestamp("waitingStartedAt", { withTimezone: true })),
  liveStartedAt: createColumn("sessions", "liveStartedAt", timestamp("liveStartedAt", { withTimezone: true })),
  endedAt: createColumn("sessions", "endedAt", timestamp("endedAt", { withTimezone: true })),
  acknowledgedPractitioner: createColumn("sessions", "acknowledgedPractitioner", boolean("acknowledgedPractitioner").notNull().default(false)),
  readyPractitioner: createColumn("sessions", "readyPractitioner", boolean("readyPractitioner").notNull().default(false)),
  readyGuest: createColumn("sessions", "readyGuest", boolean("readyGuest").notNull().default(false)),
  agoraChannel: createColumn("sessions", "agoraChannel", text("agoraChannel")),
  agoraUidGuest: createColumn("sessions", "agoraUidGuest", text("agoraUidGuest")),
  agoraUidPractitioner: createColumn("sessions", "agoraUidPractitioner", text("agoraUidPractitioner")),
  createdAt: createColumn("sessions", "createdAt", timestamp("createdAt", { withTimezone: true }).defaultNow()),
  updatedAt: createColumn("sessions", "updatedAt", timestamp("updatedAt", { withTimezone: true }).defaultNow()),
});

// Reviews table - guest reviews after sessions
// Validates all review columns for camelCase compliance
export const reviews = pgTable("reviews", {
  id: createColumn("reviews", "id", uuid("id").primaryKey().default(sql`gen_random_uuid()`)),
  sessionId: createColumn("reviews", "sessionId", uuid("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" })),
  guestId: createColumn("reviews", "guestId", uuid("guestId").notNull().references(() => profiles.id)),
  practitionerId: createColumn("reviews", "practitionerId", uuid("practitionerId").notNull().references(() => profiles.id)),
  rating: createColumn("reviews", "rating", integer("rating")),
  comment: createColumn("reviews", "comment", text("comment")),
  createdAt: createColumn("reviews", "createdAt", timestamp("createdAt", { withTimezone: true }).defaultNow()),
});

// Insert schemas - omit auto-generated fields
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({
  id: true,
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
  id: string;
  userId: string;
  specialties: string[] | null;
  hourlyRate: string | null;
  isOnline: boolean;
  inService: boolean;
  reviewCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RuntimeSession = {
  id: string;
  practitionerId: string;
  guestId: string;
  status: "waiting" | "room_timer" | "live" | "ended";
  isGroup: boolean;
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
