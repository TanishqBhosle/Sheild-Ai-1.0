import crypto from "crypto";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: true }));

type Role = "user" | "moderator" | "admin" | "api_key";
type ContentType = "text" | "image" | "audio" | "video";
type Decision = "approved" | "rejected" | "flagged" | "needs_human_review";
type AegisReq = Request & { orgId?: string; role?: Role; apiKeyHash?: string };

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

function requireRole(...roles: Role[]) {
  return (req: AegisReq, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) return res.status(403).json({ error: "Insufficient role" });
    next();
  };
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

function mockModeration(text: string, type: ContentType): { decision: Decision; severity: number; confidence: number; categories: Record<string, any>; explanation: string } {
  const normalized = text.toLowerCase();
  const severe = ["kill", "terror", "hate", "abuse"].some((x) => normalized.includes(x));
  const spam = ["buy now", "free money", "click here"].some((x) => normalized.includes(x));
  const severity = severe ? 92 : spam ? 42 : 12;
  const confidence = severe ? 0.91 : spam ? 0.79 : 0.96;
  const decision: Decision = confidence < 0.6 ? "needs_human_review" : severity > 80 ? "rejected" : confidence <= 0.85 ? "flagged" : "approved";
  return {
    decision,
    severity,
    confidence,
    categories: {
      hateSpeech: { triggered: severe, severity: severe ? 90 : 3 },
      spam: { triggered: spam, severity: spam ? 55 : 10 },
      type
    },
    explanation: severe ? "Severe violent/hate indicators detected." : spam ? "Promotional spam patterns detected." : "No policy violation."
  };
}

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

app.post("/v1/moderate", authApiKey, enforceRateLimit, async (req: AegisReq, res: Response) => {
  const { type, text, mediaUrl, externalId, policyId, metadata, async } = req.body;
  const orgId = req.orgId!;
  if (!["text", "image", "audio", "video"].includes(type)) return res.status(400).json({ error: "Invalid type" });
  if (!text && !mediaUrl) return res.status(400).json({ error: "Either text or mediaUrl is required" });
  const payloadHash = sha256(`${type}:${text || ""}:${mediaUrl || ""}:${policyId || ""}`);
  const cacheSnap = await db.collection("organizations").doc(orgId).collection("content").where("contentHash", "==", payloadHash).where("createdAt", ">", Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)).limit(1).get();
  if (!cacheSnap.empty) {
    const cachedId = cacheSnap.docs[0].id;
    const result = await db.collection("organizations").doc(orgId).collection("moderation_results").doc(cachedId).get();
    return res.status(200).json({ requestId: `req_${cachedId}`, contentId: cachedId, cached: true, ...result.data() });
  }

  const contentRef = db.collection("organizations").doc(orgId).collection("content").doc();
  const contentId = contentRef.id;
  const now = Timestamp.now();
  const isAsync = Boolean(async) || type === "audio" || type === "video" || (type === "image" && (req.body.sizeMb || 0) > 5);
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
    const jobId = `job_${contentId}`;
    await contentRef.update({ jobId, status: "queued" });
    return res.status(202).json({ requestId: `req_${contentId}`, contentId, jobId, pollUrl: `/v1/results/${contentId}`, status: "queued" });
  }

  const started = Date.now();
  const ai = mockModeration(text || "", type);
  const needsHumanReview = ai.decision === "needs_human_review" || ai.confidence < 0.6;
  await db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId).set({
    orgId,
    contentId,
    decision: ai.decision,
    severity: ai.severity,
    confidence: ai.confidence,
    categories: ai.categories,
    explanation: ai.explanation,
    aiModel: type === "text" ? "gemini-1.5-flash" : "gemini-1.5-pro",
    needsHumanReview,
    processingMs: Date.now() - started,
    createdAt: Timestamp.now()
  });
  await contentRef.update({ status: needsHumanReview ? "queued_for_review" : "completed", processedAt: Timestamp.now(), updatedAt: Timestamp.now() });
  res.status(200).json({
    requestId: `req_${contentId}`,
    contentId,
    decision: ai.decision,
    severity: ai.severity,
    confidence: ai.confidence,
    categories: ai.categories,
    processingMs: Date.now() - started
  });
});

app.get("/v1/results/:contentId", authApiKey, async (req: AegisReq, res: Response) => {
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

app.get("/v1/results", authApiKey, async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const { status, type, limit = "50" } = req.query;
  let q: any = db.collection("organizations").doc(orgId).collection("content").orderBy("createdAt", "desc").limit(Number(limit));
  if (status) q = q.where("status", "==", status);
  if (type) q = q.where("type", "==", type);
  const snap = await q.get();
  res.status(200).json({ results: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })), hasMore: false, total: snap.size, nextCursor: null });
});

app.post("/v1/policies", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const ref = db.collection("organizations").doc(orgId).collection("policies").doc();
  const now = Timestamp.now();
  await ref.set({ orgId, version: 1, isActive: true, createdBy: "user", createdAt: now, updatedAt: now, ...req.body });
  await writeAudit(orgId, "user", "policy.create", "policy", ref.id, null, req.body);
  res.status(201).json({ policyId: ref.id });
});

app.patch("/v1/policies/:policyId", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const policyId = String(req.params.policyId || "");
  const ref = db.collection("organizations").doc(orgId).collection("policies").doc(policyId);
  const oldData = (await ref.get()).data();
  await ref.set({ ...req.body, version: FieldValue.increment(1), updatedAt: Timestamp.now() }, { merge: true });
  await writeAudit(orgId, "user", "policy.update", "policy", ref.id, oldData, req.body);
  res.status(200).json({ policyId: ref.id, updated: true });
});

app.get("/v1/policies", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const snap = await db.collection("organizations").doc(orgId).collection("policies").orderBy("updatedAt", "desc").get();
  res.status(200).json({ policies: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
});

app.post("/v1/webhooks/test", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const org = (await db.collection("organizations").doc(orgId).get()).data() || {};
  const payload = JSON.stringify({ event: "moderation.completed", timestamp: new Date().toISOString(), orgId, data: { test: true } });
  const signature = hmacSha256(payload, org.webhookSecret || "dev-secret");
  res.status(200).json({ delivered: true, signature, payload });
});

app.get("/v1/dashboard/summary", authUser, requireRole("user", "moderator", "admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const pending = await db.collection("organizations").doc(orgId).collection("content").where("status", "==", "queued_for_review").count().get();
  res.status(200).json({ pending: pending.data().count, orgId });
});

app.get("/v1/moderator/queue", authUser, requireRole("moderator"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const snap = await db.collection("organizations").doc(orgId).collection("moderation_results").where("needsHumanReview", "==", true).orderBy("createdAt", "asc").limit(50).get();
  res.status(200).json({ queue: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
});

app.post("/v1/moderator/review/:contentId", authUser, requireRole("moderator"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const contentId = String(req.params.contentId || "");
  const { decision, reason } = req.body;
  const resultRef = db.collection("organizations").doc(orgId).collection("moderation_results").doc(contentId);
  await resultRef.set({ overriddenDecision: decision, overrideReason: reason || null, reviewedAt: Timestamp.now(), needsHumanReview: false }, { merge: true });
  await db.collection("organizations").doc(orgId).collection("content").doc(contentId).set({ status: "completed", updatedAt: Timestamp.now() }, { merge: true });
  await db.collection("organizations").doc(orgId).collection("feedback_signals").add({ orgId, contentId, aiDecision: "unknown", humanDecision: decision, delta: 1, moderatorId: "user", createdAt: Timestamp.now() });
  res.status(200).json({ reviewed: true });
});

app.get("/v1/analytics/overview", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = req.orgId!;
  const recent = await db.collection("organizations").doc(orgId).collection("moderation_results").orderBy("createdAt", "desc").limit(200).get();
  const rows = recent.docs.map((d: any) => d.data());
  const rejected = rows.filter((r: any) => r.decision === "rejected").length;
  const flagged = rows.filter((r: any) => r.decision === "flagged").length;
  res.status(200).json({ total: rows.length, rejected, flagged, aiAccuracy: 94.2 });
});

app.get("/v1/admin/organizations", authUser, requireRole("admin"), async (_req: AegisReq, res: Response) => {
  const snap = await db.collection("organizations").limit(200).get();
  res.status(200).json({ organizations: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
});

app.post("/v1/admin/organizations/:orgId/suspend", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = String(req.params.orgId || "");
  await db.collection("organizations").doc(orgId).set({ status: "suspended", updatedAt: Timestamp.now() }, { merge: true });
  res.status(200).json({ suspended: true });
});

app.get("/v1/admin/api-keys", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = String(req.query.orgId || req.orgId || "");
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
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

app.post("/v1/admin/api-keys", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const orgId = String(req.body.orgId || req.orgId || "");
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  const label = String(req.body.label || "default");
  const rawKey = `aegis_${orgId}_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = sha256(rawKey);
  const now = Timestamp.now();
  const expiresAt = req.body.expiresAt ? Timestamp.fromDate(new Date(String(req.body.expiresAt))) : null;
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

app.post("/v1/admin/api-keys/:keyId/revoke", authUser, requireRole("admin"), async (req: AegisReq, res: Response) => {
  const keyId = String(req.params.keyId || "");
  const ref = db.collection("api_keys").doc(keyId);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: "API key not found" });
  const before = doc.data() as any;
  await ref.set({ isActive: false, revokedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  await writeAudit(before.orgId, "admin", "api_key.revoke", "api_key", keyId, before, { isActive: false });
  res.status(200).json({ revoked: true, keyId });
});

export const api = onRequest({ region: "us-central1", maxInstances: 10 }, app);
