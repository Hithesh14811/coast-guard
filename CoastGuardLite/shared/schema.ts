import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with email/password auth and role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fisherman profile - linked to user
export const fishermanProfiles = pgTable("fisherman_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fishermanName: text("fisherman_name").notNull(),
  boatName: text("boat_name").notNull(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

// Online sessions tracking - when fisherman starts/stops sharing location
export const onlineSessions = pgTable("online_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fishermanProfileId: varchar("fisherman_profile_id").notNull().references(() => fishermanProfiles.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  lastLocationLat: real("last_location_lat"),
  lastLocationLng: real("last_location_lng"),
  status: varchar("status").notNull().default("active"),
});

// Fisherman locations with session tracking
export const fishermanLocations = pgTable("fisherman_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fishermanProfileId: varchar("fisherman_profile_id").notNull().references(() => fishermanProfiles.id),
  onlineSessionId: varchar("online_session_id").references(() => onlineSessions.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("online"),
});

export const driftResults = pgTable("drift_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fishermanProfileId: varchar("fisherman_profile_id").notNull().references(() => fishermanProfiles.id),
  onlineSessionId: varchar("online_session_id").references(() => onlineSessions.id),
  simulationHours: integer("simulation_hours").notNull(),
  predictedPoints: jsonb("predicted_points").notNull().$type<{lat: number, lng: number}[]>(),
  heatmapPoints: jsonb("heatmap_points").notNull().$type<{lat: number, lng: number, intensity: number}[]>(),
  driftPaths: jsonb("drift_paths").notNull().$type<{lat: number, lng: number}[][]>(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fishermanProfileId: varchar("fisherman_profile_id").notNull().references(() => fishermanProfiles.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const marineWeather = pgTable("marine_weather", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  windSpeed: real("wind_speed").notNull(),
  windDirection: real("wind_direction").notNull(),
  waveHeight: real("wave_height").notNull(),
  currentSpeed: real("current_speed").notNull(),
  currentDirection: real("current_direction").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Auth schemas for registration and login
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["fisherman", "coastguard"], { required_error: "Please select a role" }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertFishermanProfileSchema = createInsertSchema(fishermanProfiles).omit({
  id: true,
  registeredAt: true,
});

export const insertOnlineSessionSchema = createInsertSchema(onlineSessions).omit({
  id: true,
  startedAt: true,
});

export const insertFishermanLocationSchema = createInsertSchema(fishermanLocations).omit({
  id: true,
  timestamp: true,
});

export const insertDriftResultSchema = z.object({
  fishermanProfileId: z.string(),
  onlineSessionId: z.string().optional().nullable(),
  simulationHours: z.number(),
  predictedPoints: z.array(z.object({ lat: z.number(), lng: z.number() })),
  heatmapPoints: z.array(z.object({ lat: z.number(), lng: z.number(), intensity: z.number() })),
  driftPaths: z.array(z.array(z.object({ lat: z.number(), lng: z.number() }))),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
  read: true,
});

export const insertMarineWeatherSchema = createInsertSchema(marineWeather).omit({
  id: true,
  fetchedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type InsertFishermanProfile = z.infer<typeof insertFishermanProfileSchema>;
export type FishermanProfile = typeof fishermanProfiles.$inferSelect;

export type InsertOnlineSession = z.infer<typeof insertOnlineSessionSchema>;
export type OnlineSession = typeof onlineSessions.$inferSelect;

export type InsertFishermanLocation = z.infer<typeof insertFishermanLocationSchema>;
export type FishermanLocation = typeof fishermanLocations.$inferSelect;

export type InsertDriftResult = z.infer<typeof insertDriftResultSchema>;
export type DriftResult = typeof driftResults.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertMarineWeather = z.infer<typeof insertMarineWeatherSchema>;
export type MarineWeather = typeof marineWeather.$inferSelect;

export type TrackingMode = "live" | "drift";

export interface FishermanState {
  id: string;
  visibleFishermanId: string;
  fishermanName?: string;
  boatName?: string;
  currentLocation: { lat: number; lng: number } | null;
  lastKnownLocation: { lat: number; lng: number } | null;
  lastUpdateTime: Date | null;
  status: "online" | "offline";
  mode: TrackingMode;
}

export interface FishermanWithState {
  fisherman: FishermanProfile;
  user?: User;
  state: FishermanState | null;
  lastLocation: { lat: number; lng: number; timestamp: Date } | null;
  lastOnlineSession?: OnlineSession | null;
}

export interface OnlineSessionWithLocation extends OnlineSession {
  lastLocation?: { lat: number; lng: number } | null;
}

export interface DriftSimulationParams {
  fishermanProfileId: string;
  lastKnownLat: number;
  lastKnownLng: number;
  simulationHours: number;
  numPaths: number;
  onlineSessionId?: string;
}

export interface MarineWeatherData {
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  currentSpeed: number;
  currentDirection: number;
}
