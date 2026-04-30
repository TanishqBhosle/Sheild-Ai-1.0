/**
 * Standalone Express Server
 * Used for production deployments on platforms like Render or Heroku.
 * Handles Firebase Admin initialization and route mounting.
 */
import "dotenv/config";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Enforce critical env vars in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.GEMINI_API_KEY) console.error("❌ CRITICAL: GEMINI_API_KEY is not set!");
  if (!process.env.JWT_SECRET) console.warn("⚠️  WARNING: JWT_SECRET is not set — using insecure default!");
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
      });
      console.log("✅ Firebase Admin initialized via Service Account");
    } catch (err) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
      process.exit(1);
    }
  } else {
    // Fallback for environments with ADC (like Google Cloud) or local dev
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || "aegis-ai-d9204",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "aegis-ai-d9204.firebasestorage.app",
    });
    console.log("ℹ️ Firebase Admin initialized via Project ID (Fallback)");
  }
}

// Import routes
import authRoutes from "./api/auth";
import moderateRoutes from "./api/moderate";
import resultsRoutes from "./api/results";
import policiesRoutes from "./api/policies";
// import webhooksRoutes from "./api/webhooks";
import dashboardRoutes from "./api/dashboard";
import moderatorRoutes from "./api/moderator";
import adminRoutes from "./api/admin";
import apikeysRoutes from "./api/apikeys";


// Import middleware
import { authMiddleware } from "./middleware/authMiddleware";
import { rateLimiter } from "./middleware/rateLimiter";
import { orgValidator } from "./middleware/orgValidator";
import { requireRole } from "./middleware/rbac";

const app = express();
const PORT = process.env.PORT || 5002;

// Allowed origins — add your Vercel frontend URL here
const ALLOWED_ORIGINS = [
  "https://sheild-ai-1-0.vercel.app",
  "https://sheild-ai-1-0-915x.vercel.app",
  "https://sheild-ai-1-0-2.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.ALLOWED_ORIGIN, // Optional extra origin from env
].filter(Boolean);

console.log("🔒 Allowed Origins:", ALLOWED_ORIGINS);

// Global middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, mobile apps, API calls)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // In development, allow all
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));

// Routes
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" }));
app.use("/v1/auth", authRoutes);
app.use("/v1/moderate", authMiddleware, orgValidator, rateLimiter, moderateRoutes);
app.use("/v1/results", authMiddleware, orgValidator, resultsRoutes);
app.use("/v1/policies", authMiddleware, orgValidator, requireRole("org_admin", "org_owner", "platform_admin"), policiesRoutes);
// app.use("/v1/webhooks", authMiddleware, orgValidator, requireRole("org_admin", "org_owner", "platform_admin"), webhooksRoutes);
app.use("/v1/dashboard", authMiddleware, orgValidator, dashboardRoutes);
app.use("/v1/moderator", authMiddleware, orgValidator, requireRole("moderator", "platform_admin"), moderatorRoutes);
app.use("/v1/admin", authMiddleware, requireRole("platform_admin"), adminRoutes);
app.use("/v1/api-keys", authMiddleware, orgValidator, requireRole("org_admin", "org_owner", "platform_admin", "user"), apikeysRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found" }));

app.listen(PORT, () => {
  console.log(`🚀 Aegis AI Production Server running on port ${PORT}`);
});
