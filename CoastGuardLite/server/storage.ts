import {
  users,
  fishermanProfiles,
  fishermanLocations,
  onlineSessions,
  driftResults,
  alerts,
  marineWeather,
  type User,
  type UpsertUser,
  type FishermanProfile,
  type InsertFishermanProfile,
  type FishermanLocation,
  type InsertFishermanLocation,
  type OnlineSession,
  type InsertOnlineSession,
  type DriftResult,
  type InsertDriftResult,
  type Alert,
  type InsertAlert,
  type MarineWeather,
  type InsertMarineWeather,
  type FishermanState,
  type TrackingMode,
  type FishermanWithState,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations for email/password auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; passwordHash: string; firstName: string; lastName: string; role: string }): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  
  // Fisherman profile operations
  createFishermanProfile(profile: InsertFishermanProfile): Promise<FishermanProfile>;
  getFishermanProfileByUserId(userId: string): Promise<FishermanProfile | undefined>;
  getFishermanProfileById(id: string): Promise<FishermanProfile | undefined>;
  getAllFishermanProfiles(): Promise<FishermanProfile[]>;
  searchFishermanProfiles(query: string): Promise<FishermanProfile[]>;
  
  // Online session operations
  startOnlineSession(fishermanProfileId: string): Promise<OnlineSession>;
  endOnlineSession(sessionId: string, lastLat: number, lastLng: number): Promise<OnlineSession | undefined>;
  getActiveSession(fishermanProfileId: string): Promise<OnlineSession | undefined>;
  getOnlineSessionHistory(fishermanProfileId: string, limit?: number): Promise<OnlineSession[]>;
  getLastOnlineSession(fishermanProfileId: string): Promise<OnlineSession | undefined>;
  
  // Location operations
  saveFishermanLocation(location: InsertFishermanLocation): Promise<FishermanLocation>;
  getLatestFishermanLocation(fishermanProfileId: string): Promise<FishermanLocation | undefined>;
  getFishermanLocations(fishermanProfileId: string, limit?: number): Promise<FishermanLocation[]>;
  getLocationsBySession(onlineSessionId: string): Promise<FishermanLocation[]>;
  
  // Drift results
  saveDriftResult(result: InsertDriftResult): Promise<DriftResult>;
  getLatestDriftResult(fishermanProfileId: string): Promise<DriftResult | undefined>;
  getDriftResultBySession(onlineSessionId: string): Promise<DriftResult | undefined>;
  
  // Alerts
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlerts(fishermanProfileId?: string): Promise<Alert[]>;
  dismissAlert(alertId: string): Promise<void>;
  
  // Marine weather
  saveMarineWeather(weather: InsertMarineWeather): Promise<MarineWeather>;
  getLatestMarineWeather(lat: number, lng: number): Promise<MarineWeather | undefined>;
  
  // Combined queries
  getFishermanState(fishermanProfileId: string): Promise<FishermanState | undefined>;
  getAllFishermenWithState(): Promise<FishermanWithState[]>;
  searchFishermenWithState(query: string): Promise<FishermanWithState[]>;
  updateFishermanStatus(fishermanProfileId: string, status: "online" | "offline"): Promise<void>;
  setFishermanMode(fishermanProfileId: string, mode: TrackingMode): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private fishermanStates: Map<string, FishermanState> = new Map();

  // User operations for email/password auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; passwordHash: string; firstName: string; lastName: string; role: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Fisherman profile operations
  async createFishermanProfile(profile: InsertFishermanProfile): Promise<FishermanProfile> {
    const [newProfile] = await db
      .insert(fishermanProfiles)
      .values(profile)
      .returning();
    
    // Initialize fisherman state
    this.fishermanStates.set(newProfile.id, {
      id: newProfile.id,
      visibleFishermanId: newProfile.id,
      fishermanName: newProfile.fishermanName,
      boatName: newProfile.boatName,
      currentLocation: null,
      lastKnownLocation: null,
      lastUpdateTime: null,
      status: "offline",
      mode: "live",
    });
    
    return newProfile;
  }

  async getFishermanProfileByUserId(userId: string): Promise<FishermanProfile | undefined> {
    const [profile] = await db
      .select()
      .from(fishermanProfiles)
      .where(eq(fishermanProfiles.userId, userId));
    return profile;
  }

  async getFishermanProfileById(id: string): Promise<FishermanProfile | undefined> {
    const [profile] = await db
      .select()
      .from(fishermanProfiles)
      .where(eq(fishermanProfiles.id, id));
    return profile;
  }

  async getAllFishermanProfiles(): Promise<FishermanProfile[]> {
    return await db
      .select()
      .from(fishermanProfiles)
      .orderBy(desc(fishermanProfiles.registeredAt));
  }

  async searchFishermanProfiles(query: string): Promise<FishermanProfile[]> {
    const searchPattern = `%${query}%`;
    return await db
      .select()
      .from(fishermanProfiles)
      .where(
        or(
          ilike(fishermanProfiles.fishermanName, searchPattern),
          ilike(fishermanProfiles.boatName, searchPattern)
        )
      );
  }

  // Online session operations
  async startOnlineSession(fishermanProfileId: string): Promise<OnlineSession> {
    // End any active session first
    const activeSession = await this.getActiveSession(fishermanProfileId);
    if (activeSession) {
      const lastLocation = await this.getLatestFishermanLocation(fishermanProfileId);
      if (lastLocation) {
        await this.endOnlineSession(activeSession.id, lastLocation.lat, lastLocation.lng);
      }
    }

    const [session] = await db
      .insert(onlineSessions)
      .values({
        fishermanProfileId,
        status: "active",
      })
      .returning();
    return session;
  }

  async endOnlineSession(sessionId: string, lastLat: number, lastLng: number): Promise<OnlineSession | undefined> {
    const [session] = await db
      .update(onlineSessions)
      .set({
        endedAt: new Date(),
        lastLocationLat: lastLat,
        lastLocationLng: lastLng,
        status: "ended",
      })
      .where(eq(onlineSessions.id, sessionId))
      .returning();
    return session;
  }

  async getActiveSession(fishermanProfileId: string): Promise<OnlineSession | undefined> {
    const [session] = await db
      .select()
      .from(onlineSessions)
      .where(
        and(
          eq(onlineSessions.fishermanProfileId, fishermanProfileId),
          eq(onlineSessions.status, "active")
        )
      );
    return session;
  }

  async getOnlineSessionHistory(fishermanProfileId: string, limit = 20): Promise<OnlineSession[]> {
    return await db
      .select()
      .from(onlineSessions)
      .where(eq(onlineSessions.fishermanProfileId, fishermanProfileId))
      .orderBy(desc(onlineSessions.startedAt))
      .limit(limit);
  }

  async getLastOnlineSession(fishermanProfileId: string): Promise<OnlineSession | undefined> {
    const [session] = await db
      .select()
      .from(onlineSessions)
      .where(
        and(
          eq(onlineSessions.fishermanProfileId, fishermanProfileId),
          eq(onlineSessions.status, "ended")
        )
      )
      .orderBy(desc(onlineSessions.endedAt))
      .limit(1);
    return session;
  }

  // Location operations
  async saveFishermanLocation(location: InsertFishermanLocation): Promise<FishermanLocation> {
    const [newLocation] = await db
      .insert(fishermanLocations)
      .values(location)
      .returning();

    // Update fisherman state
    let state = this.fishermanStates.get(location.fishermanProfileId);
    if (!state) {
      const profile = await this.getFishermanProfileById(location.fishermanProfileId);
      state = {
        id: location.fishermanProfileId,
        visibleFishermanId: location.fishermanProfileId,
        fishermanName: profile?.fishermanName,
        boatName: profile?.boatName,
        currentLocation: null,
        lastKnownLocation: null,
        lastUpdateTime: null,
        status: "offline",
        mode: "live",
      };
    }

    state.currentLocation = { lat: location.lat, lng: location.lng };
    state.lastKnownLocation = { lat: location.lat, lng: location.lng };
    state.lastUpdateTime = new Date();
    state.status = (location.status as "online" | "offline") || "online";
    if (state.status === "online") {
      state.mode = "live";
    }
    this.fishermanStates.set(location.fishermanProfileId, state);

    return newLocation;
  }

  async getLatestFishermanLocation(fishermanProfileId: string): Promise<FishermanLocation | undefined> {
    const [location] = await db
      .select()
      .from(fishermanLocations)
      .where(eq(fishermanLocations.fishermanProfileId, fishermanProfileId))
      .orderBy(desc(fishermanLocations.timestamp))
      .limit(1);
    return location;
  }

  async getFishermanLocations(fishermanProfileId: string, limit = 100): Promise<FishermanLocation[]> {
    return await db
      .select()
      .from(fishermanLocations)
      .where(eq(fishermanLocations.fishermanProfileId, fishermanProfileId))
      .orderBy(desc(fishermanLocations.timestamp))
      .limit(limit);
  }

  async getLocationsBySession(onlineSessionId: string): Promise<FishermanLocation[]> {
    return await db
      .select()
      .from(fishermanLocations)
      .where(eq(fishermanLocations.onlineSessionId, onlineSessionId))
      .orderBy(desc(fishermanLocations.timestamp));
  }

  // Drift results
  async saveDriftResult(result: InsertDriftResult): Promise<DriftResult> {
    const [driftResult] = await db
      .insert(driftResults)
      .values(result)
      .returning();
    return driftResult;
  }

  async getLatestDriftResult(fishermanProfileId: string): Promise<DriftResult | undefined> {
    const [result] = await db
      .select()
      .from(driftResults)
      .where(eq(driftResults.fishermanProfileId, fishermanProfileId))
      .orderBy(desc(driftResults.generatedAt))
      .limit(1);
    return result;
  }

  async getDriftResultBySession(onlineSessionId: string): Promise<DriftResult | undefined> {
    const [result] = await db
      .select()
      .from(driftResults)
      .where(eq(driftResults.onlineSessionId, onlineSessionId))
      .orderBy(desc(driftResults.generatedAt))
      .limit(1);
    return result;
  }

  // Alerts
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(alerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async getAlerts(fishermanProfileId?: string): Promise<Alert[]> {
    if (fishermanProfileId) {
      return await db
        .select()
        .from(alerts)
        .where(
          and(
            eq(alerts.fishermanProfileId, fishermanProfileId),
            eq(alerts.read, false)
          )
        )
        .orderBy(desc(alerts.timestamp));
    }
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.read, false))
      .orderBy(desc(alerts.timestamp));
  }

  async dismissAlert(alertId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ read: true })
      .where(eq(alerts.id, alertId));
  }

  // Marine weather
  async saveMarineWeather(weather: InsertMarineWeather): Promise<MarineWeather> {
    const [newWeather] = await db
      .insert(marineWeather)
      .values(weather)
      .returning();
    return newWeather;
  }

  async getLatestMarineWeather(lat: number, lng: number): Promise<MarineWeather | undefined> {
    const results = await db
      .select()
      .from(marineWeather)
      .orderBy(desc(marineWeather.fetchedAt))
      .limit(10);
    
    // Find weather for nearby coordinates (within ~0.05 degrees)
    const nearby = results.find(w => 
      Math.abs(w.lat - lat) < 0.05 && 
      Math.abs(w.lng - lng) < 0.05
    );
    
    if (nearby) {
      const ageMs = Date.now() - new Date(nearby.fetchedAt).getTime();
      if (ageMs < 30 * 60 * 1000) { // 30 minutes
        return nearby;
      }
    }
    return undefined;
  }

  // Combined queries
  async getFishermanState(fishermanProfileId: string): Promise<FishermanState | undefined> {
    let state = this.fishermanStates.get(fishermanProfileId);
    
    if (!state) {
      const profile = await this.getFishermanProfileById(fishermanProfileId);
      if (!profile) return undefined;
      
      const lastLocation = await this.getLatestFishermanLocation(fishermanProfileId);
      const activeSession = await this.getActiveSession(fishermanProfileId);
      
      state = {
        id: fishermanProfileId,
        visibleFishermanId: fishermanProfileId,
        fishermanName: profile.fishermanName,
        boatName: profile.boatName,
        currentLocation: lastLocation && activeSession ? { lat: lastLocation.lat, lng: lastLocation.lng } : null,
        lastKnownLocation: lastLocation ? { lat: lastLocation.lat, lng: lastLocation.lng } : null,
        lastUpdateTime: lastLocation?.timestamp || null,
        status: activeSession ? "online" : "offline",
        mode: activeSession ? "live" : "drift",
      };
      this.fishermanStates.set(fishermanProfileId, state);
    }
    
    return state;
  }

  async getAllFishermenWithState(): Promise<FishermanWithState[]> {
    const profiles = await this.getAllFishermanProfiles();
    return this.enrichProfilesWithState(profiles);
  }

  async searchFishermenWithState(query: string): Promise<FishermanWithState[]> {
    const profiles = await this.searchFishermanProfiles(query);
    return this.enrichProfilesWithState(profiles);
  }

  private async enrichProfilesWithState(profiles: FishermanProfile[]): Promise<FishermanWithState[]> {
    const result: FishermanWithState[] = [];
    
    for (const profile of profiles) {
      const state = await this.getFishermanState(profile.id);
      const lastLocation = await this.getLatestFishermanLocation(profile.id);
      const lastOnlineSession = await this.getLastOnlineSession(profile.id);
      const user = await this.getUser(profile.userId);
      
      result.push({
        fisherman: profile,
        user: user || undefined,
        state: state || null,
        lastLocation: lastLocation
          ? { lat: lastLocation.lat, lng: lastLocation.lng, timestamp: lastLocation.timestamp }
          : null,
        lastOnlineSession,
      });
    }
    
    return result;
  }

  async updateFishermanStatus(fishermanProfileId: string, status: "online" | "offline"): Promise<void> {
    const state = this.fishermanStates.get(fishermanProfileId);
    if (state) {
      state.status = status;
      if (status === "offline") {
        state.mode = "drift";
        state.currentLocation = null;
        
        // End active session
        const activeSession = await this.getActiveSession(fishermanProfileId);
        if (activeSession && state.lastKnownLocation) {
          await this.endOnlineSession(
            activeSession.id,
            state.lastKnownLocation.lat,
            state.lastKnownLocation.lng
          );
        }
      }
      this.fishermanStates.set(fishermanProfileId, state);
    }
  }

  async setFishermanMode(fishermanProfileId: string, mode: TrackingMode): Promise<void> {
    const state = this.fishermanStates.get(fishermanProfileId);
    if (state) {
      state.mode = mode;
      this.fishermanStates.set(fishermanProfileId, state);
    }
  }
}

export const storage = new DatabaseStorage();
