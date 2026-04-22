import { Router, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

const router = Router();

// GET /v1/results/:contentId
router.get("/:contentId", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { contentId } = req.params;
    const db = getFirestore();

    const contentDoc = await db.doc(`organizations/${ctx.orgId}/content/${contentId}`).get();
    if (!contentDoc.exists) {
      res.status(404).json({ error: "Content not found" });
      return;
    }

    const content = contentDoc.data();

    // Find moderation result
    const resultsSnap = await db.collection(`organizations/${ctx.orgId}/moderation_results`)
      .where("contentId", "==", contentId)
      .limit(1)
      .get();

    const result = resultsSnap.empty ? null : resultsSnap.docs[0].data();

    res.json({
      content,
      result,
      status: content?.status,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/results — paginated list
router.get("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const db = getFirestore();
    const { status, type, limit: limitStr, cursor, from, to } = req.query;
    const limit = Math.min(parseInt(limitStr as string) || 20, 100);

    let query = db.collection(`organizations/${ctx.orgId}/moderation_results`)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      query = query.where("decision", "==", status);
    }

    if (cursor) {
      const cursorDoc = await db.doc(`organizations/${ctx.orgId}/moderation_results/${cursor}`).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snap = await query.get();
    const results = snap.docs.map(doc => doc.data());
    const lastDoc = snap.docs[snap.docs.length - 1];

    res.json({
      results,
      nextCursor: lastDoc?.id || null,
      total: results.length,
      hasMore: results.length === limit,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
