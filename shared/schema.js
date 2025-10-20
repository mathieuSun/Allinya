import { sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
const profiles = pgTable("profiles", {
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
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
const practitioners = pgTable("practitioners", {
  user_id: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  is_online: boolean("is_online").notNull().default(false),
  in_service: boolean("in_service").notNull().default(false),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0.0"),
  review_count: integer("review_count").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
const sessions = pgTable("sessions", {
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
  acknowledged_practitioner: boolean("acknowledged_practitioner").notNull().default(false),
  ready_practitioner: boolean("ready_practitioner").notNull().default(false),
  ready_guest: boolean("ready_guest").notNull().default(false),
  agora_channel: text("agora_channel"),
  agora_uid_guest: text("agora_uid_guest"),
  agora_uid_practitioner: text("agora_uid_practitioner"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  guest_id: uuid("guest_id").notNull().references(() => profiles.id),
  practitioner_id: uuid("practitioner_id").notNull().references(() => profiles.id),
  rating: integer("rating"),
  comment: text("comment"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});
const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  created_at: true,
  updated_at: true
});
const insertPractitionerSchema = createInsertSchema(practitioners).omit({
  created_at: true,
  updated_at: true
});
const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  created_at: true,
  updated_at: true
});
const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  created_at: true
});
export {
  insertPractitionerSchema,
  insertProfileSchema,
  insertReviewSchema,
  insertSessionSchema,
  practitioners,
  profiles,
  reviews,
  sessions
};
