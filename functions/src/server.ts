import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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
import webhooksRoutes from "./api/webhooks";
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

// Global middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: "50mb" }));

// Routes
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.use("/v1/auth", authRoutes);
app.use("/v1/moderate", authMiddleware, orgValidator, rateLimiter, moderateRoutes);
app.use("/v1/results", authMiddleware, orgValidator, resultsRoutes);
app.use("/v1/policies", authMiddleware, orgValidator, requireRole("org_admin", "org_owner", "platform_admin"), policiesRoutes);
app.use("/v1/dashboard", authMiddleware, orgValidator, dashboardRoutes);
app.use("/v1/moderator", authMiddleware, orgValidator, requireRole("moderator", "platform_admin"), moderatorRoutes);
app.use("/v1/admin", authMiddleware, requireRole("platform_admin"), adminRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found" }));

app.listen(PORT, () => {
  console.log(`🚀 Aegis AI Production Server running on port ${PORT}`);
});
