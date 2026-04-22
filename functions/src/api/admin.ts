import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "../utils/firestoreHelpers";

const router = Router();

// GET /v1/admin/organizations
router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const snap = await db.collection("organizations").orderBy("createdAt", "desc").limit(limit).get();
    res.json({ organizations: snap.docs.map(d => d.data()), total: snap.size });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /v1/admin/organizations/:orgId/suspend
router.post("/organizations/:orgId/suspend", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { orgId } = req.params;
    const { reason } = req.body;
    const db = getFirestore();
    await db.doc(`organizations/${orgId}`).update({ status: "suspended", updatedAt: Timestamp.now() });
    await writeAuditLog({
      orgId, actor: ctx.uid, actorEmail: ctx.email,
      action: "org.suspended", resourceType: "organization", resourceId: orgId,
      after: { status: "suspended", reason: reason || "No reason provided" },
    });
    res.json({ success: true, orgId, status: "suspended" });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /v1/admin/organizations/:orgId/reinstate
router.post("/organizations/:orgId/reinstate", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { orgId } = req.params;
    const db = getFirestore();
    await db.doc(`organizations/${orgId}`).update({ status: "active", updatedAt: Timestamp.now() });
    await writeAuditLog({
      orgId, actor: ctx.uid, actorEmail: ctx.email,
      action: "org.reinstated", resourceType: "organization", resourceId: orgId,
      after: { status: "active" },
    });
    res.json({ success: true, orgId, status: "active" });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/admin/platform-stats
router.get("/platform-stats", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const orgsSnap = await db.collection("organizations").get();
    const totalOrgs = orgsSnap.size;
    const activeOrgs = orgsSnap.docs.filter(d => d.data().status === "active").length;
    const plans: Record<string, number> = {};
    orgsSnap.docs.forEach(d => {
      const p = d.data().plan || "free";
      plans[p] = (plans[p] || 0) + 1;
    });
    res.json({ totalOrgs, activeOrgs, suspendedOrgs: totalOrgs - activeOrgs, planBreakdown: plans });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
