import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { generateApiKey, hashApiKey, getKeyPrefix } from "../utils/apiKeyUtils";
import { writeAuditLog } from "../utils/firestoreHelpers";

const router = Router();

// POST /v1/api-keys
router.post("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { name, scopes, expiresInDays } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    const rawKey = generateApiKey("live");
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);
    const db = getFirestore();

    const expiresAt = expiresInDays
      ? Timestamp.fromDate(new Date(Date.now() + expiresInDays * 86400000))
      : null;

    await db.doc(`api_keys/${keyHash}`).set({
      keyHash, keyPrefix, orgId: ctx.orgId, name,
      createdBy: ctx.uid, scopes: scopes || ["moderate", "results"],
      rateLimit: 1000, isActive: true,
      expiresAt, createdAt: Timestamp.now(),
    });

    await writeAuditLog({
      orgId: ctx.orgId, actor: ctx.uid, actorEmail: ctx.email,
      action: "apikey.created", resourceType: "api_key", resourceId: keyPrefix,
    });

    // IMPORTANT: Raw key is shown ONCE and never stored
    res.status(201).json({ rawKey, keyPrefix, name, message: "Save this key — it will not be shown again." });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/api-keys
router.get("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const db = getFirestore();
    const snap = await db.collection("api_keys").where("orgId", "==", ctx.orgId).get();
    const keys = snap.docs.map(d => {
      const data = d.data();
      return { keyPrefix: data.keyPrefix, name: data.name, isActive: data.isActive,
        scopes: data.scopes, createdAt: data.createdAt, expiresAt: data.expiresAt, lastUsedAt: data.lastUsedAt };
    });
    res.json({ keys });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// DELETE /v1/api-keys/:keyPrefix
router.delete("/:keyPrefix", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { keyPrefix } = req.params;
    const db = getFirestore();
    const snap = await db.collection("api_keys")
      .where("orgId", "==", ctx.orgId).where("keyPrefix", "==", keyPrefix).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: "API key not found" }); return; }
    await snap.docs[0].ref.update({ isActive: false });
    await writeAuditLog({
      orgId: ctx.orgId, actor: ctx.uid, actorEmail: ctx.email,
      action: "apikey.revoked", resourceType: "api_key", resourceId: keyPrefix,
    });
    res.json({ success: true, message: "API key revoked" });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
