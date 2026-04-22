import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "../utils/firestoreHelpers";
import { dispatchWebhook } from "../workers/webhookDispatcher";

const router = Router();

// GET /v1/moderator
// List moderation results with optional status filter
router.get("/", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    
    const db = getFirestore();
    const status = req.query.status as string; // approved, flagged, rejected
    const limitCount = Math.min(parseInt(req.query.limit as string) || 50, 100);

    let query = db.collection("moderation_results") as any;
    
    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.orderBy("createdAt", "desc").limit(limitCount).get();

    const items: any[] = [];
    for (const doc of snap.docs) {
      const result = doc.data();
      const contentDoc = await db.doc(`content/${result.contentId}`).get();
      const contentData = contentDoc.data();
      
      let topCategory = "safe";
      let maxScore = 0;
      if (result.categories) {
        for (const [cat, score] of Object.entries(result.categories as Record<string, any>)) {
          if (score.severity > maxScore) {
            maxScore = score.severity;
            topCategory = cat;
          }
        }
      }

      items.push({
        id: result.resultId,
        contentId: result.contentId,
        type: result.type || contentData?.type || "unknown",
        content: contentData?.text || contentData?.mediaUrl || "",
        category: topCategory,
        severity: result.severity,
        status: result.status || result.decision,
        confidence: result.confidence,
        createdAt: result.createdAt,
        explanation: result.explanation,
        aiModel: result.aiModel
      });
    }

    res.json(items);
  } catch (err: unknown) { 
    console.error("Error fetching moderation results:", err);
    res.status(500).json({ error: (err as Error).message }); 
  }
});

// GET /v1/moderator/queue
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("moderation_results")
      .where("needsHumanReview", "==", true)
      .orderBy("createdAt", "asc").limit(50).get();

    const items: any[] = [];
    for (const doc of snap.docs) {
      const result = doc.data();
      const contentDoc = await db.doc(`content/${result.contentId}`).get();
      items.push({ ...result, content: contentDoc.data() || null });
    }
    res.json({ queue: items, total: items.length });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// PATCH /v1/moderator/:contentId
const handleReview = async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    
    const contentId = req.params.contentId.trim();
    const { decision, notes } = req.body;
    const db = getFirestore();
    const normalizedDecision = decision?.toLowerCase(); // approved, rejected
    const newStatus = normalizedDecision === "approved" ? "Approved" : "Rejected";

    console.log(`[ModeratorReview] Attempting review for contentId: ${contentId}`);
    
    // Try finding by contentId field
    let resultsSnap = await db.collection("moderation_results")
      .where("contentId", "==", contentId).limit(1).get();
    
    // If not found, try finding by document ID (resultId)
    if (resultsSnap.empty) {
      console.log(`[ModeratorReview] contentId field not found, trying document ID: ${contentId}`);
      const docRef = db.collection("moderation_results").doc(contentId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        // Mock a snapshot
        resultsSnap = { empty: false, docs: [docSnap] } as any;
      }
    }
    
    if (resultsSnap.empty) { 
      console.log(`[ModeratorReview] FAILED: No document found for: ${contentId}`);
      
      // Emergency Debug: List what IS in the collection
      const allDocs = await db.collection("moderation_results").limit(10).get();
      console.log(`[ModeratorReview] Debug: Current collection has ${allDocs.size} docs.`);
      allDocs.docs.forEach(d => {
        console.log(`  - DocID: ${d.id}, Field contentId: ${d.data().contentId}`);
      });

      res.status(404).json({ error: "Result not found" }); 
      return; 
    }

    const resultDoc = resultsSnap.docs[0];
    console.log(`[ModeratorReview] Found document: ${resultDoc.id}`);
    const batch = db.batch();

    batch.update(resultDoc.ref, {
      decision: normalizedDecision,
      status: newStatus,
      reviewedBy: ctx.uid,
      reviewedAt: Timestamp.now(),
      reviewNotes: notes || "",
      needsHumanReview: false,
    });

    batch.update(db.doc(`content/${contentId}`), {
      status: "completed",
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    await writeAuditLog({
      actor: ctx.uid, actorEmail: ctx.email,
      action: "moderation.reviewed", resourceType: "content", resourceId: contentId,
      after: { status: newStatus },
    });

    res.json({ success: true, contentId, status: newStatus });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
};

router.patch("/:contentId", handleReview);
router.post("/review/:contentId", handleReview);

export default router;

