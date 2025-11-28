import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchMarineWeather } from "./marine-api";
import { runMonteCarloSimulation } from "./drift-engine";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { insertFishermanLocationSchema, insertFishermanProfileSchema } from "@shared/schema";
import { z } from "zod";

const SIGNAL_LOST_THRESHOLD_MS = 60000;

async function checkSignalLoss() {
  const allFishermen = await storage.getAllFishermenWithState();
  
  for (const { fisherman, state } of allFishermen) {
    if (!state || !state.lastUpdateTime) continue;
    
    const timeSinceUpdate = Date.now() - new Date(state.lastUpdateTime).getTime();
    
    if (timeSinceUpdate > SIGNAL_LOST_THRESHOLD_MS && state.status === "online") {
      await storage.updateFishermanStatus(fisherman.id, "offline");
      
      await storage.createAlert({
        fishermanProfileId: fisherman.id,
        type: "signal_lost",
        message: `GPS signal lost for ${fisherman.fishermanName} (${fisherman.boatName}). Last known location recorded. Drift prediction available.`,
      });
    }
  }
}

setInterval(checkSignalLoss, 10000);

export async function registerRoutes(
  app: Express
): Promise<Server> {
  // Setup authentication (includes /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/user)
  await setupAuth(app);

  // Create fisherman profile (for fisherman role)
  app.post("/api/fisherman/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if profile already exists
      const existing = await storage.getFishermanProfileByUserId(userId);
      if (existing) {
        res.json({ success: true, profile: existing });
        return;
      }
      
      const validatedData = insertFishermanProfileSchema.parse({
        ...req.body,
        userId,
      });
      
      const profile = await storage.createFishermanProfile(validatedData);
      
      // Set user role to fisherman
      await storage.updateUserRole(userId, 'fisherman');
      
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Error creating fisherman profile:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create profile" });
      }
    }
  });

  // Get current fisherman's profile
  app.get("/api/fisherman/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getFishermanProfileByUserId(userId);
      
      if (!profile) {
        res.json({ profile: null });
        return;
      }
      
      const state = await storage.getFishermanState(profile.id);
      const lastLocation = await storage.getLatestFishermanLocation(profile.id);
      const activeSession = await storage.getActiveSession(profile.id);
      
      res.json({
        profile,
        state,
        lastLocation,
        activeSession,
      });
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  // Start sharing location (creates online session)
  app.post("/api/fisherman/start-sharing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getFishermanProfileByUserId(userId);
      
      if (!profile) {
        res.status(404).json({ error: "Fisherman profile not found" });
        return;
      }
      
      const session = await storage.startOnlineSession(profile.id);
      res.json({ success: true, session });
    } catch (error) {
      console.error("Error starting sharing:", error);
      res.status(500).json({ error: "Failed to start sharing" });
    }
  });

  // Stop sharing location (ends online session)
  app.post("/api/fisherman/stop-sharing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getFishermanProfileByUserId(userId);
      
      if (!profile) {
        res.status(404).json({ error: "Fisherman profile not found" });
        return;
      }
      
      const activeSession = await storage.getActiveSession(profile.id);
      if (activeSession) {
        const lastLocation = await storage.getLatestFishermanLocation(profile.id);
        if (lastLocation) {
          await storage.endOnlineSession(activeSession.id, lastLocation.lat, lastLocation.lng);
        }
      }
      
      await storage.updateFishermanStatus(profile.id, "offline");
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping sharing:", error);
      res.status(500).json({ error: "Failed to stop sharing" });
    }
  });

  // Send location update
  app.post("/api/fisherman/location", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getFishermanProfileByUserId(userId);
      
      if (!profile) {
        res.status(404).json({ error: "Fisherman profile not found" });
        return;
      }
      
      const activeSession = await storage.getActiveSession(profile.id);
      
      const locationSchema = z.object({
        lat: z.number(),
        lng: z.number(),
        source: z.enum(["gps", "pinned"]).optional().default("gps"),
        accuracy: z.number().optional(),
      });
      
      const { lat, lng, source, accuracy } = locationSchema.parse(req.body);
      
      const validatedData = insertFishermanLocationSchema.parse({
        fishermanProfileId: profile.id,
        onlineSessionId: activeSession?.id || null,
        lat,
        lng,
        status: "online",
      });
      
      const location = await storage.saveFishermanLocation(validatedData);
      
      res.json({ success: true, location, source, accuracy });
    } catch (error) {
      console.error("Error saving location:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid location data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save location" });
      }
    }
  });

  // Get all fishermen (for coast guard dashboard - requires coastguard role)
  app.get("/api/fishermen", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const query = req.query.search as string | undefined;
      const fishermen = query 
        ? await storage.searchFishermenWithState(query)
        : await storage.getAllFishermenWithState();
      res.json(fishermen);
    } catch (error) {
      console.error("Error getting fishermen:", error);
      res.status(500).json({ error: "Failed to get fishermen" });
    }
  });

  // Get fisherman details by ID (for coast guard - requires coastguard role)
  app.get("/api/fisherman/:fishermanProfileId", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.params;
      const profile = await storage.getFishermanProfileById(fishermanProfileId);
      
      if (!profile) {
        res.status(404).json({ error: "Fisherman not found" });
        return;
      }
      
      const state = await storage.getFishermanState(fishermanProfileId);
      const lastLocation = await storage.getLatestFishermanLocation(fishermanProfileId);
      const user = await storage.getUser(profile.userId);
      
      res.json({
        profile,
        user,
        state: state || null,
        lastLocation: lastLocation || null,
      });
    } catch (error) {
      console.error("Error getting fisherman data:", error);
      res.status(500).json({ error: "Failed to get fisherman data" });
    }
  });

  // Get online session history for a fisherman (requires coastguard role)
  app.get("/api/fisherman/:fishermanProfileId/sessions", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const sessions = await storage.getOnlineSessionHistory(fishermanProfileId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error getting session history:", error);
      res.status(500).json({ error: "Failed to get session history" });
    }
  });

  // Get last online session (requires coastguard role)
  app.get("/api/fisherman/:fishermanProfileId/last-session", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.params;
      const session = await storage.getLastOnlineSession(fishermanProfileId);
      res.json(session || null);
    } catch (error) {
      console.error("Error getting last session:", error);
      res.status(500).json({ error: "Failed to get last session" });
    }
  });

  // Trigger drift mode (for coast guard - requires coastguard role)
  app.post("/api/fisherman/trigger-drift", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.body;
      
      if (!fishermanProfileId) {
        res.status(400).json({ error: "fishermanProfileId is required" });
        return;
      }
      
      await storage.updateFishermanStatus(fishermanProfileId, "offline");
      await storage.setFishermanMode(fishermanProfileId, "drift");
      
      const profile = await storage.getFishermanProfileById(fishermanProfileId);
      const name = profile ? profile.fishermanName : fishermanProfileId;
      
      await storage.createAlert({
        fishermanProfileId,
        type: "signal_lost",
        message: `Drift mode triggered manually for ${name}. GPS tracking stopped.`,
      });
      
      res.json({ success: true, message: "Drift mode activated" });
    } catch (error) {
      console.error("Error triggering drift mode:", error);
      res.status(500).json({ error: "Failed to trigger drift mode" });
    }
  });

  // Exit drift mode (for coast guard - requires coastguard role)
  app.post("/api/fisherman/exit-drift", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.body;
      
      if (!fishermanProfileId) {
        res.status(400).json({ error: "fishermanProfileId is required" });
        return;
      }
      
      await storage.setFishermanMode(fishermanProfileId, "live");
      
      const profile = await storage.getFishermanProfileById(fishermanProfileId);
      const name = profile ? profile.fishermanName : fishermanProfileId;
      
      await storage.createAlert({
        fishermanProfileId,
        type: "mode_change",
        message: `Drift mode exited for ${name}. Awaiting GPS signal.`,
      });
      
      res.json({ success: true, message: "Drift mode exited" });
    } catch (error) {
      console.error("Error exiting drift mode:", error);
      res.status(500).json({ error: "Failed to exit drift mode" });
    }
  });

  // Marine weather
  app.get("/api/marine-weather", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: "Valid lat and lng query parameters are required" });
        return;
      }
      
      const weather = await fetchMarineWeather(lat, lng);
      res.json(weather);
    } catch (error) {
      console.error("Error fetching marine weather:", error);
      res.status(500).json({ error: "Failed to fetch marine weather" });
    }
  });

  // Run drift simulation (requires coastguard role)
  app.post("/api/simulation/run", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const schema = z.object({
        fishermanProfileId: z.string(),
        lastKnownLat: z.number(),
        lastKnownLng: z.number(),
        simulationHours: z.number().min(1).max(12),
        numPaths: z.number().min(10).max(200).default(100),
        onlineSessionId: z.string().optional(),
      });
      
      const { fishermanProfileId, lastKnownLat, lastKnownLng, simulationHours, numPaths, onlineSessionId } = 
        schema.parse(req.body);
      
      const weather = await fetchMarineWeather(lastKnownLat, lastKnownLng);
      
      const result = runMonteCarloSimulation(
        lastKnownLat,
        lastKnownLng,
        weather,
        simulationHours,
        numPaths
      );
      
      const driftResult = await storage.saveDriftResult({
        fishermanProfileId,
        onlineSessionId: onlineSessionId || null,
        simulationHours,
        predictedPoints: result.predictedPoints,
        heatmapPoints: result.heatmapPoints,
        driftPaths: result.driftPaths,
      });
      
      await storage.createAlert({
        fishermanProfileId,
        type: "drift_complete",
        message: `Drift simulation complete. Generated ${numPaths} paths over ${simulationHours} hours. Search area calculated.`,
      });
      
      res.json({
        success: true,
        result: driftResult,
        weather,
      });
    } catch (error) {
      console.error("Error running simulation:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid simulation parameters", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to run simulation" });
      }
    }
  });

  // Get drift result (requires coastguard role)
  app.get("/api/drift-result/:fishermanProfileId", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { fishermanProfileId } = req.params;
      const result = await storage.getLatestDriftResult(fishermanProfileId);
      
      if (!result) {
        res.json(null);
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error getting drift result:", error);
      res.status(500).json({ error: "Failed to get drift result" });
    }
  });

  // Get drift result by session (requires coastguard role)
  app.get("/api/drift-result/session/:onlineSessionId", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { onlineSessionId } = req.params;
      const result = await storage.getDriftResultBySession(onlineSessionId);
      res.json(result || null);
    } catch (error) {
      console.error("Error getting drift result:", error);
      res.status(500).json({ error: "Failed to get drift result" });
    }
  });

  // Alerts (requires coastguard role)
  app.get("/api/alerts", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const fishermanProfileId = req.query.fishermanProfileId as string | undefined;
      const alerts = await storage.getAlerts(fishermanProfileId);
      res.json(alerts);
    } catch (error) {
      console.error("Error getting alerts:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  app.patch("/api/alerts/:alertId/dismiss", isAuthenticated, requireRole("coastguard"), async (req: any, res) => {
    try {
      const { alertId } = req.params;
      await storage.dismissAlert(alertId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing alert:", error);
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
