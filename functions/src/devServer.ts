import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with real project (service account auto-detected or use ADC)
// For local dev without a service account, we use the project ID
// The Admin SDK will use Application Default Credentials
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "aegis-ai-d9204",
    storageBucket: "aegis-ai-d9204.firebasestorage.app",
  });
}

// Import middleware
import { authMiddleware } from "./middleware/authMiddleware";
import { rateLimiter } from "./middleware/rateLimiter";
import { requireRole } from "./middleware/rbac";

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

const app = express();
const PORT = 5002;

// Global middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: "50mb" }));

// Health check (no auth)
app.get("/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

// Auth routes
app.use("/v1/auth", authRoutes); 

// All other routes require auth
app.use("/v1/moderate", authMiddleware, rateLimiter, moderateRoutes);
app.use("/v1/results", authMiddleware, resultsRoutes);
app.use("/v1/policies", authMiddleware, requireRole("org_admin", "org_owner", "platform_admin"), policiesRoutes);
app.use("/v1/webhooks", authMiddleware, requireRole("org_admin", "org_owner", "platform_admin"), webhooksRoutes);
app.use("/v1/dashboard", authMiddleware, dashboardRoutes);
app.use("/v1/api-keys", authMiddleware, requireRole("org_admin", "org_owner", "platform_admin"), apikeysRoutes);
app.use("/v1/moderator", authMiddleware, requireRole("moderator", "org_admin", "org_owner", "platform_admin"), moderatorRoutes);
app.use("/v1/admin", authMiddleware, requireRole("platform_admin"), adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`\n⚔  Aegis AI Backend running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/v1/health`);
  console.log(`   Ready for requests.\n`);
});
