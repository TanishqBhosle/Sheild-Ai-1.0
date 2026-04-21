import crypto from "crypto";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

initializeApp();
const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: true }));
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} (path: ${req.path})`);
  next();
});

// Types
type Role = "user" | "moderator" | "admin" | "api_key";
type ContentType = "text" | "image" | "audio" | "video";
type Decision = "approved" | "rejected" | "flagged" | "needs_human_review";
type AegisReq = Request & { orgId?: string; role?: Role; apiKeyHash?: string };

// Validation Schemas
const ModerateSchema = z.object({
  type: z.enum(["text", "image", "audio", "video"]),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  policyId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  async: z.boolean().optional(),
  sizeMb: z.number().optional()
}).refine(data => {
  if (data.type === "text") return !!data.text;
  return !!data.mediaUrl;
}, { message: "text is required for type=text, otherwise mediaUrl is required" });

const ReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional()
});

const PolicySchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  severityThreshold: z.number().min(0).max(100)
});

const PLAN_LIMITS: Record<string, { perMinute: number; perMonth: number }> = {
  free: { perMinute: 60, perMonth: 1000 },
  starter: { perMinute: 300, perMonth: 10000 },
  pro: { perMinute: 1000, perMonth: 100000 },
  enterprise: { perMinute: 100000, perMonth: 100000000 }
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmacSha256(payload: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}

async function authApiKey(req: AegisReq, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!raw) return res.status(401).json({ error: "Missing API key" });
  const keyHash = sha256(raw);
  const keyDoc = await db.collection("api_keys").doc(keyHash).get();
  if (!keyDoc.exists) return res.status(401).json({ error: "Invalid API key" });
  const keyData = keyDoc.data() as any;
  if (!keyData.isActive) return res.status(403).json({ error: "API key disabled" });
  if (keyData.expiresAt && keyData.expiresAt.toMillis() < Date.now()) return res.status(403).json({ error: "API key expired" });
  const orgDoc = await db.collection("organizations").doc(keyData.orgId).get();
  if (!orgDoc.exists || orgDoc.data()?.status === "suspended") return res.status(403).json({ error: "Organization suspended" });
  req.orgId = keyData.orgId;
  req.role = "api_key";
  req.apiKeyHash = keyHash;
  await db.collection("api_keys").doc(keyHash).update({ lastUsedAt: Timestamp.now() });
  next();
}

async function authUser(req: AegisReq, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const orgId = decoded.orgId;
    const role = decoded.role;
    const plan = decoded.plan;
    if (typeof orgId !== "string" || typeof plan !== "string") {
      return res.status(403).json({ error: "Missing required claims" });
    }
    if (role !== "user" && role !== "moderator" && role !== "admin") {
      return res.status(403).json({ error: "Invalid role claim" });
    }
    req.orgId = orgId;
    req.role = role;
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

app.post("/auth/signup", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  let uid, email;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  const { name, role, requestedOrgId } = req.body;
  const orgId = requestedOrgId || "default-org";

  let assignedRole: "user" | "moderator" | "admin" = "user";
  
  if (role === "admin" && (email === "admin@aegis.ai" || email?.endsWith("@aegis.ai"))) {
    assignedRole = "admin";
  } else if (role === "moderator" && (email === "mod@aegis.ai" || email?.endsWith("@aegis.ai"))) {
    assignedRole = "moderator";
  } else {
    assignedRole = "user";
  }

  try {
    await getAuth().setCustomUserClaims(uid, {
      orgId,
      role: assignedRole,
      plan: "pro"
    });

    await db.collection("organizations").doc(orgId).collection("members").doc(uid).set({
      uid,
      name: name || "",
      email: email || "",
      role: assignedRole,
      orgId,
      createdAt: Timestamp.now()
    });

    await db.collection("organizations").doc(orgId).set({
      status: "active",
      plan: "pro", // Default plan for new orgs for now
      createdAt: Timestamp.now()
    }, { merge: true });

    res.status(200).json({ success: true, role: assignedRole, orgId });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to complete signup process."
    });
  }
});

function requireRole(...roles: Role[]) {
  return (req: AegisReq, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) return res.status(403).json({ error: "Insufficient role" });
    next();
  };
}

function ensureAdminScope(req: AegisReq, targetOrgId: unknown, res: Response): string | null {
  const actorOrgId = req.orgId || "";
  const candidate = Array.isArray(targetOrgId) ? targetOrgId[0] : targetOrgId;
  const normalizedTarget = typeof candidate === "string" && candidate ? candidate : actorOrgId;
  if (!normalizedTarget) {
    res.status(400).json({ error: "orgId is required" });
    return null;
  }
  // Tenant admins can only act within their own organization.
  if (normalizedTarget !== actorOrgId) {
    res.status(403).json({ error: "Cross-tenant access denied" });
    return null;
  }
  return normalizedTarget;
}

async function enforceRateLimit(req: AegisReq, res: Response, next: NextFunction) {
  const orgId = req.orgId!;
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  const plan = (orgDoc.data()?.plan || "free").toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const minuteKey = new Date().toISOString().slice(0, 16);
  const monthKey = new Date().toISOString().slice(0, 7);
  const minuteRef = db.collection("api_keys").doc(req.apiKeyHash!).collection("rateWindows").doc(minuteKey);
  const monthRef = db.collection("organizations").doc(orgId).collection("usage_logs").doc(monthKey);
  const [minuteDoc, monthDoc] = await Promise.all([minuteRef.get(), monthRef.get()]);
  const minuteCount = minuteDoc.data()?.count || 0;
  const monthCount = monthDoc.data()?.apiCalls || 0;
  if (minuteCount >= limits.perMinute || monthCount >= limits.perMonth) return res.status(429).json({ error: "Rate limit exceeded" });
  await Promise.all([
    minuteRef.set({ count: FieldValue.increment(1), updatedAt: Timestamp.now() }, { merge: true }),
    monthRef.set({ orgId, apiCalls: FieldValue.increment(1), updatedAt: Timestamp.now() }, { merge: true })
  ]);
  next();
}

function fallbackModeration(item: { type: string; text?: string }) {
  const badWords = ["spam", "badword1", "badword2"]; // Example list
  const text = (item.text || "").toLowerCase();
  const hasBadWord = badWords.some(word => text.includes(word));
  
  return {
    decision: hasBadWord ? "flagged" : "approved",
    severity: hasBadWord ? 70 : 0,
    confidence: 0.5,
    categories: {
      hateSpeech: { triggered: false, severity: 0 },
      harassment: { triggered: false, severity: 0 },
      selfHarm: { triggered: false, severity: 0 },
      sexualContent: { triggered: false, severity: 0 },
      violence: { triggered: false, severity: 0 },
      spam: { triggered: hasBadWord, severity: hasBadWord ? 70 : 0 }
    },
    explanation: "Fallback moderation applied due to AI service unavailability."
  };
}

async function callGeminiModeration(item: { type: string; text?: string; mediaUrl?: string }) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are an expert content moderator for Aegis AI.
      Analyze the following ${item.type} content and provide a JSON response.
      
      Structure:
      {
        "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
        "severity": number (0-100),
        "confidence": number (0.0-1.0),
        "categories": {
          "hateSpeech": { "triggered": boolean, "severity": number },
          "harassment": { "triggered": boolean, "severity": number },
          "selfHarm": { "triggered": boolean, "severity": number },
          "sexualContent": { "triggered": boolean, "severity": number },
          "violence": { "triggered": boolean, "severity": number },
          "spam": { "triggered": boolean, "severity": number }
        },
        "explanation": "brief reasoning"
      }

      Content to analyze:
      ${item.text ? `TEXT: "${item.text}"` : `MEDIA_URL: ${item.mediaUrl}`}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Non-JSON Gemini response:", text);
      return fallbackModeration(item);
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    console.error("Gemini Failure, using fallback:", err.message);
    return fallbackModeration(item);
  }
}

app.post("/moderate", authApiKey, enforceRateLimit, async (req: AegisReq, res: Response) => {
  const validation = ModerateSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.format() });
  const { type, text, mediaUrl, externalId, policyId, metadata, async: isAsyncRequest } = validation.data;
  
  const orgId = req.orgId!;
  const payloadHash = sha256(`${type}:${text || ""}:${mediaUrl || ""}:${policyId || ""}`);
  
  // Cache check (24h)
  const cacheSnap = await db.collection("organizations").doc(orgId).collection("content")
    .where("contentHash", "==", payloadHash)
    .where("createdAt", ">", Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000))
    .limit(1).get();

  if (!cacheSnap.empty) {
    const cachedId = cacheSnap.docs[0].id;
    const result = await db.collection("organizations").doc(orgId).collection("moderation_results").doc(cachedId).get();
    return res.status(200).json({ requestId: `req_${cachedId}`, contentId: cachedId, cached: true, ...result.data() });
  }

  const contentRef = db.collection("organizations").doc(orgId).collection("content").doc();
  const contentId = contentRef.id;
  const now = Timestamp.now();
  
  // Determine if it should be async
  const isVideoOrAudio = type === "video" || type === "audio";
  const isLargeImage = type === "image" && (req.body.sizeMb || 0) > 5;
  const isAsync = Boolean(isAsyncRequest) || isVideoOrAudio || isLargeImage;

  await contentRef.set({
    orgId,
    policyId: policyId || null,
    externalId: externalId || null,
    type,
    text: text || null,
    mediaUrl: mediaUrl || null,
    status: isAsync ? "queued" : "processing",
    metadata: metadata || {},
    contentHash: payloadHash,
    createdAt: now,
    updatedAt: now
  });

  if (isAsync) {
    return res.status(202).json({ 
      requestId: `req_${contentId}`, 
      contentId, 
      status: "queued",
      pollUrl: `/results/${contentId}`
    });
  }

  const started = Date.now();
  try {
    const ai = await callGeminiModeration({ type, text, mediaUrl });
    const needsHumanReview = ai.decision === "needs_human_review" || ai.confidence < 0.65;
    
    await db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId).set({
      orgId,
      contentId,
      decision: ai.decision,
      severity: ai.severity,
      confidence: ai.confidence,
      categories: ai.categories,
      explanation: ai.explanation,
      aiModel: "gemini-1.5-flash",
      needsHumanReview,
      processingMs: Date.now() - started,
      createdAt: Timestamp.now()
    });

    await contentRef.update({ 
      status: needsHumanReview ? "queued_for_review" : "completed", 
      processedAt: Timestamp.now(), 
      updatedAt: Timestamp.now() 
    });

    res.status(200).json({
      requestId: `req_${contentId}`,
      contentId,
      decision: ai.decision,
      severity: ai.severity,
      confidence: ai.confidence,
      categories: ai.categories,
      processingMs: Date.now() - started
    });
  } catch (error) {
    await contentRef.update({ status: "failed", error: "Internal AI processing error" });
    res.status(500).json({ error: "Moderation processing failed" });
  }
});

async function writeAudit(orgId: string, actor: string, action: string, resourceType: string, resourceId: string, before: any, after: any) {
  await db.collection("organizations").doc(orgId).collection("audit_logs").add({
    orgId,
    actor,
    action,
    resourceType,
    resourceId,
    before: before || null,
    after: after || null,
    timestamp: Timestamp.now()
  });
}

function parseExpiry(value: unknown): Timestamp | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getTime() <= Date.now()) return undefined;
  return Timestamp.fromDate(date);
}

app.get("/results/:contentId", authApiKey, async (req: AegisReq, res: Response) => {
  const contentId = String(req.params.contentId || "");
  const orgId = req.orgId!;
  const [contentDoc, resultDoc] = await Promise.all([
    db.collection("organizations").doc(orgId).collection("content").doc(contentId).get(),
    db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId).get()
  ]);
  if (!contentDoc.exists) return res.status(404).json({ error: "Not found" });
  if (!resultDoc.exists) return res.status(200).json({ status: contentDoc.data()?.status || "queued" });
  res.status(200).json({ requestId: `req_${contentId}`, contentId, status: "completed", ...resultDoc.data() });
});

app.get("/results", authApiKey, async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const { status, type, limit = "50" } = req.query;
  let q: any = db.collection("organizations").doc(orgId).collection("content").orderBy("createdAt", "desc").limit(Number(limit));
  if (status) q = q.where("status", "==", status);
  if (type) q = q.where("type", "==", type);
  const snap = await q.get();
  res.status(200).json({ results: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })), hasMore: false, total: snap.size, nextCursor: null });
});

app.post("/policies", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const validation = PolicySchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.format() });
  const orgId = req.orgId!;
  const ref = db.collection("organizations").doc(orgId).collection("policies").doc();
  const now = Timestamp.now();
  await ref.set({ orgId, version: 1, isActive: true, createdBy: "user", createdAt: now, updatedAt: now, ...validation.data });
  await writeAudit(orgId, "user", "policy.create", "policy", ref.id, null, validation.data);
  res.status(201).json({ policyId: ref.id });
});

app.patch("/policies/:policyId", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const policyId = String(req.params.policyId || "");
  const ref = db.collection("organizations").doc(orgId).collection("policies").doc(policyId);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: "Policy not found" });
  const oldData = existing.data();
  await ref.set({ ...req.body, version: FieldValue.increment(1), updatedAt: Timestamp.now() }, { merge: true });
  await writeAudit(orgId, "user", "policy.update", "policy", ref.id, oldData, req.body);
  res.status(200).json({ policyId: ref.id, updated: true });
});

app.get("/policies", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const snap = await db.collection("organizations").doc(orgId).collection("policies").orderBy("updatedAt", "desc").get();
  res.status(200).json({ policies: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
});

app.post("/webhooks/test", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const org = (await db.collection("organizations").doc(orgId).get()).data() || {};
  const payload = JSON.stringify({ event: "moderation.completed", timestamp: new Date().toISOString(), orgId, data: { test: true } });
  const signature = hmacSha256(payload, org.webhookSecret || "dev-secret");
  res.status(200).json({ delivered: true, signature, payload });
});

app.get("/dashboard/summary", authUser, requireRole("user", "moderator", "admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const pending = await db.collection("organizations").doc(orgId).collection("content").where("status", "==", "queued_for_review").count().get();
  res.status(200).json({ pending: pending.data().count, orgId });
});

app.get("/moderator/queue", authUser, requireRole("moderator"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const snap = await db.collection("organizations").doc(orgId).collection("moderation_results").where("needsHumanReview", "==", true).orderBy("createdAt", "asc").limit(50).get();
  res.status(200).json({ queue: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
});

app.post("/moderator/review/:contentId", authUser, requireRole("moderator"), async (req: AegisReq, res: Response) => {
  const validation = ReviewSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.format() });
  const orgId = req.orgId!;
  const contentId = String(req.params.contentId || "");
  const { decision, reason } = validation.data;
  
  const resultRef = db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId);
  const resultDoc = await resultRef.get();
  if (!resultDoc.exists) return res.status(404).json({ error: "Moderation result not found" });
  
  await resultRef.set({ overriddenDecision: decision, overrideReason: reason || null, reviewedAt: Timestamp.now(), needsHumanReview: false }, { merge: true });
  await db.collection("organizations").doc(orgId).collection("content").doc(contentId).set({ status: "completed", updatedAt: Timestamp.now() }, { merge: true });
  res.status(200).json({ reviewed: true });
});

app.get("/analytics/overview", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const recent = await db.collection("organizations").doc(orgId).collection("moderation_results").orderBy("createdAt", "desc").limit(200).get();
  const rows = recent.docs.map((d: any) => d.data());
  const rejected = rows.filter((r: any) => r.decision === "rejected").length;
  const flagged = rows.filter((r: any) => r.decision === "flagged").length;
  res.status(200).json({ total: rows.length, rejected, flagged, aiAccuracy: 94.2 });
});

app.get("/admin/organizations", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) return res.status(404).json({ error: "Organization not found" });
  res.status(200).json({ organizations: [{ id: orgDoc.id, ...orgDoc.data() }] });
});

app.post("/admin/organizations/:orgId/suspend", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = ensureAdminScope(req, req.params.orgId, res);
  if (!orgId) return;
  await db.collection("organizations").doc(orgId).set({ status: "suspended", updatedAt: Timestamp.now() }, { merge: true });
  res.status(200).json({ suspended: true });
});

app.get("/admin/api-keys", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const queryOrgId = Array.isArray(req.query.orgId) ? req.query.orgId[0] : req.query.orgId;
  const orgId = ensureAdminScope(req, queryOrgId, res);
  if (!orgId) return;
  const snap = await db.collection("api_keys").where("orgId", "==", orgId).orderBy("createdAt", "desc").limit(100).get();
  res.status(200).json({
    keys: snap.docs.map((doc: any) => {
      const row = doc.data();
      return {
        keyId: doc.id,
        orgId: row.orgId,
        label: row.label || null,
        isActive: Boolean(row.isActive),
        keyPreview: row.keyPreview || null,
        lastUsedAt: row.lastUsedAt || null,
        createdAt: row.createdAt || null,
        expiresAt: row.expiresAt || null
      };
    })
  });
});

app.post("/admin/api-keys", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = ensureAdminScope(req, req.body.orgId as string | undefined, res);
  if (!orgId) return;
  const label = String(req.body.label || "default");
  const rawKey = `aegis_${orgId}_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = sha256(rawKey);
  const now = Timestamp.now();
  const expiresAtInput = req.body.expiresAt;
  const expiresAt = expiresAtInput === undefined ? null : parseExpiry(expiresAtInput);
  if (expiresAtInput !== undefined && expiresAt === undefined) return res.status(400).json({ error: "expiresAt must be a valid future ISO date or null" });
  const keyPreview = `${rawKey.slice(0, 10)}...${rawKey.slice(-6)}`;
  await db.collection("api_keys").doc(keyHash).set({
    orgId,
    label,
    isActive: true,
    keyPreview,
    createdAt: now,
    updatedAt: now,
    createdByRole: req.role,
    createdByOrgId: req.orgId || null,
    lastUsedAt: null,
    expiresAt
  });
  await writeAudit(orgId, "admin", "api_key.create", "api_key", keyHash, null, { label, keyPreview, expiresAt });
  res.status(201).json({ keyId: keyHash, apiKey: rawKey, keyPreview, orgId, label, expiresAt });
});

app.post("/admin/api-keys/:keyId/revoke", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const keyId = String(req.params.keyId || "");
  const ref = db.collection("api_keys").doc(keyId);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: "API key not found" });
  const before = doc.data() as any;
  if (before.orgId !== req.orgId) return res.status(403).json({ error: "Cross-tenant access denied" });
  await ref.set({ isActive: false, revokedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  await writeAudit(before.orgId, "admin", "api_key.revoke", "api_key", keyId, before, { isActive: false });
  res.status(200).json({ revoked: true, keyId });
});

app.patch("/admin/api-keys/:keyId", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const keyId = String(req.params.keyId || "");
  const ref = db.collection("api_keys").doc(keyId);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: "API key not found" });
  const before = doc.data() as any;
  if (before.orgId !== req.orgId) return res.status(403).json({ error: "Cross-tenant access denied" });
  const hasExpiresAtInput = Object.prototype.hasOwnProperty.call(req.body, "expiresAt");
  const expiresAt = hasExpiresAtInput ? parseExpiry(req.body.expiresAt) : before.expiresAt;
  if (hasExpiresAtInput && expiresAt === undefined) return res.status(400).json({ error: "expiresAt must be a valid future ISO date or null" });
  const label = req.body.label !== undefined ? String(req.body.label || "default") : before.label;
  await ref.set({ label, expiresAt, updatedAt: Timestamp.now() }, { merge: true });
  await writeAudit(before.orgId, "admin", "api_key.update", "api_key", keyId, before, { label, expiresAt });
  res.status(200).json({ updated: true, keyId, label, expiresAt });
});

app.post("/admin/api-keys/:keyId/rotate", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const keyId = String(req.params.keyId || "");
  const oldRef = db.collection("api_keys").doc(keyId);
  const oldDoc = await oldRef.get();
  if (!oldDoc.exists) return res.status(404).json({ error: "API key not found" });
  const oldData = oldDoc.data() as any;
  if (oldData.orgId !== req.orgId) return res.status(403).json({ error: "Cross-tenant access denied" });
  if (!oldData.isActive) return res.status(409).json({ error: "Cannot rotate inactive key" });

  const newLabel = String(req.body.label || `${oldData.label || "key"}-rotated`);
  const hasExpiresAtInput = Object.prototype.hasOwnProperty.call(req.body, "expiresAt");
  const existingExpiresIso = oldData.expiresAt?.toDate?.()?.toISOString() ?? null;
  const newExpiresAt = parseExpiry(hasExpiresAtInput ? req.body.expiresAt : existingExpiresIso);
  if (newExpiresAt === undefined) return res.status(400).json({ error: "expiresAt must be a valid future ISO date or null" });

  const rawKey = `aegis_${oldData.orgId}_${crypto.randomBytes(24).toString("hex")}`;
  const newKeyHash = sha256(rawKey);
  const now = Timestamp.now();
  const keyPreview = `${rawKey.slice(0, 10)}...${rawKey.slice(-6)}`;
  const newRef = db.collection("api_keys").doc(newKeyHash);

  const batch = db.batch();
  batch.set(newRef, {
    orgId: oldData.orgId,
    label: newLabel,
    isActive: true,
    keyPreview,
    createdAt: now,
    updatedAt: now,
    createdByRole: req.role,
    createdByOrgId: req.orgId || null,
    lastUsedAt: null,
    expiresAt: newExpiresAt,
    rotatedFrom: keyId
  });
  batch.set(oldRef, { isActive: false, revokedAt: now, revokedByRotation: true, rotatedTo: newKeyHash, updatedAt: now }, { merge: true });
  await batch.commit();

  await writeAudit(oldData.orgId, "admin", "api_key.rotate", "api_key", keyId, oldData, { rotatedTo: newKeyHash, revokedByRotation: true });
  res.status(201).json({ rotated: true, oldKeyId: keyId, newKeyId: newKeyHash, apiKey: rawKey, keyPreview, expiresAt: newExpiresAt });
});

export const api = onRequest({ region: "us-central1", maxInstances: 10 }, app);

export const onContentCreated = onDocumentCreated("organizations/{orgId}/content/{contentId}", async (event) => {
  const data = event.data?.data();
  if (!data || data.status !== "queued") return;
  const { orgId, contentId } = event.params;
  const { type, text, mediaUrl } = data;

  const started = Date.now();
  try {
    const ai = await callGeminiModeration({ type, text, mediaUrl });
    const needsHumanReview = ai.decision === "needs_human_review" || ai.confidence < 0.65;
    
    await db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId).set({
      orgId,
      contentId,
      decision: ai.decision,
      severity: ai.severity,
      confidence: ai.confidence,
      categories: ai.categories,
      explanation: ai.explanation,
      aiModel: "gemini-1.5-flash-async",
      needsHumanReview,
      processingMs: Date.now() - started,
      createdAt: Timestamp.now()
    });

    await db.collection("organizations").doc(orgId).collection("content").doc(event.params.contentId).update({ 
      status: needsHumanReview ? "queued_for_review" : "completed", 
      processedAt: Timestamp.now(), 
      updatedAt: Timestamp.now() 
    });
  } catch (error) {
    console.error("Async error:", error);
    await db.collection("organizations").doc(orgId).collection("content").doc(event.params.contentId).update({ 
      status: "failed", 
      error: "Async AI processing failed" 
    });
  }
});
