import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "../utils/firestoreHelpers";
import { dispatchWebhook } from "../workers/webhookDispatcher";
import { Organization } from "../types";

const router = Router();

// GET /v1/moderator/queue
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const db = getFirestore();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const snap = await db.collection(`organizations/${ctx.orgId}/moderation_results`)
      .where("needsHumanReview", "==", true)
      .orderBy("createdAt", "asc").limit(limit).get();

    const items: Array<Record<string, unknown>> = [];
    for (const doc of snap.docs) {
      const result = doc.data();
      if (result.reviewedBy) continue;
      const contentDoc = await db.doc(`organizations/${ctx.orgId}/content/${result.contentId}`).get();
      items.push({ ...result, content: contentDoc.data() || null });
    }

    // Sort by priority: severity > 80 first, then 60-80, then FIFO
    items.sort((a, b) => {
      const as = (a.severity as number) || 0;
      const bs = (b.severity as number) || 0;
      const pa = as > 80 ? 0 : as > 60 ? 1 : 2;
      const pb = bs > 80 ? 0 : bs > 60 ? 1 : 2;
      return pa !== pb ? pa - pb : 0;
    });

    res.json({ queue: items, total: items.length });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /v1/moderator/review/:contentId
router.post("/review/:contentId", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { contentId } = req.params;
    const { decision, notes } = req.body;
    if (!decision) { res.status(400).json({ error: "decision is required" }); return; }

    const db = getFirestore();
    const resultsSnap = await db.collection(`organizations/${ctx.orgId}/moderation_results`)
      .where("contentId", "==", contentId).limit(1).get();
    if (resultsSnap.empty) { res.status(404).json({ error: "Result not found" }); return; }

    const resultDoc = resultsSnap.docs[0];
    const resultData = resultDoc.data();
    const batch = db.batch();

    batch.update(resultDoc.ref, {
      overriddenDecision: decision,
      overriddenBy: ctx.uid,
      overrideReason: notes || "",
      reviewedBy: ctx.uid,
      reviewedAt: Timestamp.now(),
      reviewNotes: notes || "",
      needsHumanReview: false,
    });

    batch.update(db.doc(`organizations/${ctx.orgId}/content/${contentId}`), {
      status: "completed", updatedAt: Timestamp.now(),
    });

    // Store feedback signal
    const signalRef = db.collection(`organizations/${ctx.orgId}/feedback_signals`).doc();
    batch.set(signalRef, {
      signalId: signalRef.id, orgId: ctx.orgId, contentId,
      aiDecision: resultData.decision, humanDecision: decision,
      delta: Math.abs((resultData.severity || 0) - (decision === "approved" ? 0 : 100)),
      moderatorId: ctx.uid, createdAt: Timestamp.now(),
    });

    await batch.commit();

    await writeAuditLog({
      orgId: ctx.orgId, actor: ctx.uid, actorEmail: ctx.email,
      action: "moderation.reviewed", resourceType: "content", resourceId: contentId,
      before: { decision: resultData.decision }, after: { decision },
    });

    // Fire webhook
    const orgDoc = await db.doc(`organizations/${ctx.orgId}`).get();
    const org = orgDoc.data() as Organization;
    if (org?.webhookUrl && org?.webhookSecret) {
      dispatchWebhook(org.webhookUrl, org.webhookSecret, "review.completed", ctx.orgId,
        { contentId, aiDecision: resultData.decision, humanDecision: decision }
      ).catch(e => console.error("Webhook error:", e));
    }

    res.json({ success: true, contentId, decision });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
