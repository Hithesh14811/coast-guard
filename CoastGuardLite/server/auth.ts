import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";

const SALT_ROUNDS = 12;

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "coastguard-lite-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        res.status(400).json({ message: "Email already registered" });
        return;
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
      });
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Registration failed" });
      }
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }
      
      // Verify password
      const isValid = await bcrypt.compare(validatedData.password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Login failed" });
      }
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Logout failed" });
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        res.status(401).json({ message: "User not found" });
        return;
      }
      
      // Get fisherman profile if exists
      const fishermanProfile = await storage.getFishermanProfileByUserId(user.id);
      
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        fishermanProfile: fishermanProfile || null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  
  // Attach user to request for later use
  (req as any).user = user;
  next();
};

// Middleware to check if user has a specific role
export const requireRole = (role: string): RequestHandler => {
  return async (req, res, next) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    if (user.role !== role) {
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      return;
    }
    
    next();
  };
};
