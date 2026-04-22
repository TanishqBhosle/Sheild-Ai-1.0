import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "../utils/firestoreHelpers";

const router = Router();

// POST /v1/policies
router.post("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { name, categories, customInstructions } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    const db = getFirestore();
    const ref = db.collection(`organizations/${ctx.orgId}/policies`).doc();

    const policy = {
      policyId: ref.id,
      orgId: ctx.orgId,
      name,
      version: 1,
      isActive: false,
      categories: categories || [],
      customInstructions: customInstructions || "",
      createdBy: ctx.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await ref.set(policy);

    await writeAuditLog({
      orgId: ctx.orgId,
      actor: ctx.uid,
      actorEmail: ctx.email,
      action: "policy.created",
      resourceType: "policy",
      resourceId: ref.id,
      after: policy as unknown as Record<string, unknown>,
    });

    res.status(201).json(policy);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// PATCH /v1/policies/:policyId
router.patch("/:policyId", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { policyId } = req.params;
    const db = getFirestore();
    const ref = db.doc(`organizations/${ctx.orgId}/policies/${policyId}`);
    const doc = await ref.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }

    const before = doc.data() as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      ...req.body,
      version: (before.version as number || 0) + 1,
      updatedAt: Timestamp.now(),
    };

    // Don't allow changing orgId or policyId
    delete updates.orgId;
    delete updates.policyId;

    await ref.update(updates);

    await writeAuditLog({
      orgId: ctx.orgId,
      actor: ctx.uid,
      actorEmail: ctx.email,
      action: "policy.updated",
      resourceType: "policy",
      resourceId: policyId,
      before,
      after: { ...before, ...updates },
    });

    const updated = await ref.get();
    res.json(updated.data());
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/policies
router.get("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const db = getFirestore();
    const snap = await db.collection(`organizations/${ctx.orgId}/policies`)
      .orderBy("updatedAt", "desc")
      .get();

    res.json({ policies: snap.docs.map(d => d.data()) });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
