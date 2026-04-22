import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog, incrementUsage } from "../utils/firestoreHelpers";
import { runTextPipeline } from "../ai/pipelines/textPipeline";
import { runImagePipeline } from "../ai/pipelines/imagePipeline";
import { runAudioPipeline } from "../ai/pipelines/audioPipeline";
import { runVideoPipeline } from "../ai/pipelines/videoPipeline";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /v1/dashboard/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const db = getFirestore();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

    const dailyDoc = await db.doc(`usage_metrics/daily_${todayKey}`).get();
    const dailyData = dailyDoc.data() || { apiCalls: 0 };

    const recentSnap = await db.collection("moderation_results")
      .orderBy("createdAt", "desc").limit(10).get();
    const recentResults = recentSnap.docs.map(d => d.data());
    const avgLatency = recentResults.length > 0
      ? Math.round(recentResults.reduce((s, r) => s + (r.processingMs || 0), 0) / recentResults.length) : 0;

    const flaggedSnap = await db.collection("moderation_results")
      .where("status", "==", "Flagged")
      .where("createdAt", ">=", Timestamp.fromDate(new Date(new Date().setHours(0,0,0,0))))
      .get();
    
    const pendingSnap = await db.collection("moderation_results")
      .where("needsHumanReview", "==", true)
      .get();
    
    res.json({ 
      apiCallsToday: dailyData.apiCalls || 0, 
      flaggedToday: flaggedSnap.size, 
      pendingReview: pendingSnap.size, 
      avgLatencyMs: avgLatency, 
      recentResults 
    });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/dashboard/analytics
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const db = getFirestore();
    
    const dailySnap = await db.collection("usage_metrics")
      .where("__name__", ">=", "daily_")
      .orderBy("__name__", "desc").limit(7).get();
    
    res.json({ dailyUsage: dailySnap.docs.map(d => d.data()).reverse() });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /v1/dashboard/run-demo
router.post("/run-demo", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    
    const { mediaType, category } = req.body;
    const db = getFirestore();
    const results: any[] = [];

    // 1. DEMO DATASETS WITH LABELS
    const demoData = [
      // TEXT
      { content: "Hello there! Hope you have a wonderful day.", type: "text", category: "Safe" },
      { content: "I will find you and I will hurt you. You are not safe.", type: "text", category: "Violence" },
      { content: "Stop talking you complete idiot. Nobody wants to hear your stupid opinion.", type: "text", category: "Harassment" },
      { content: "CONGRATULATIONS! You won $1,000,000! Click here to claim now: http://scam.me/win", type: "text", category: "Spam" },
      { content: "I absolutely despise people from that specific ethnic group, they should be removed.", type: "text", category: "Hate Speech" },
      { content: "Here is how to manufacture a dangerous prohibited substance at home.", type: "text", category: "Illegal" },
      
      // IMAGES
      { content: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606", type: "image", category: "Safe" },
      { content: "https://raw.githubusercontent.com/minimaxir/img-moderation-test/master/images/offensive.jpg", type: "image", category: "Inappropriate" },
      
      // AUDIO
      { content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", type: "audio", category: "Safe" },
      { content: "https://storage.googleapis.com/cloud-samples-data/speech/brooklyn_bridge.mp3", type: "audio", category: "Safe" },
      
      // VIDEO
      { content: "https://www.w3schools.com/html/mov_bbb.mp4", type: "video", category: "Safe" },
      { content: "https://www.w3schools.com/html/movie.mp4", type: "video", category: "Safe" }
    ];

    // Filter based on request
    let filteredInputs = demoData;
    if (mediaType && mediaType !== 'all') {
      filteredInputs = filteredInputs.filter(i => i.type === mediaType);
    }
    if (category && category !== 'all') {
      filteredInputs = filteredInputs.filter(i => i.category === category);
    }

    // If nothing found after filtering, use a default fallback
    if (filteredInputs.length === 0) {
       filteredInputs = demoData.slice(0, 3);
    }

    for (const input of filteredInputs) {
      let aiResult;
      try {
        if (input.type === "text") {
          aiResult = await runTextPipeline(input.content);
        } else if (input.type === "image") {
          aiResult = await runImagePipeline(input.content, "image/jpeg");
        } else if (input.type === "audio") {
          aiResult = await runAudioPipeline(input.content, "audio/mpeg");
        } else if (input.type === "video") {
          aiResult = await runVideoPipeline(input.content, "video/mp4");
        }

        if (!aiResult) continue;

        // Map AI decision to status
        let action: "Allow" | "Flag" | "Block" = "Allow";
        if (aiResult.decision === "rejected") action = "Block";
        else if (aiResult.decision === "flagged" || aiResult.needsHumanReview) action = "Flag";

        const sentToModerator = action === "Flag" || aiResult.needsHumanReview;

        const mappedResult = {
          id: `demo_${uuidv4().substring(0, 8)}`,
          type: input.type,
          content: input.content,
          decision: aiResult.decision,
          action: action,
          confidence: aiResult.confidence,
          sentToModerator: sentToModerator,
          explanation: aiResult.explanation,
          timestamp: Timestamp.now()
        };

        results.push(mappedResult);

        // Also add to real moderation_results
        const contentId = `cnt_demo_${uuidv4().substring(0, 6)}`;
        await db.doc(`content/${contentId}`).set({
          contentId, 
          type: input.type, 
          text: input.type === "text" ? input.content : null,
          mediaUrl: input.type !== "text" ? input.content : null,
          status: sentToModerator ? "queued_for_review" : "completed",
          createdAt: Timestamp.now(), 
          updatedAt: Timestamp.now(),
          submittedBy: ctx.uid
        });

        await db.collection("moderation_results").add({
          contentId, 
          resultId: `res_${uuidv4().substring(0, 8)}`, 
          type: input.type,
          decision: aiResult.decision,
          status: action === "Block" ? "Rejected" : (action === "Flag" ? "Flagged" : "Approved"),
          severity: aiResult.severity, 
          confidence: aiResult.confidence,
          categories: aiResult.categories, 
          explanation: aiResult.explanation,
          aiModel: aiResult.aiModel, 
          needsHumanReview: sentToModerator, 
          submittedBy: ctx.uid,
          createdAt: Timestamp.now()
        });

        await incrementUsage(input.type);
      } catch (err) {
        console.error(`Demo processing failed for ${input.type}:`, err);
        results.push({ type: input.type, content: input.content, error: "Processing failed" });
      }
    }

    await writeAuditLog({
      actor: ctx.uid, actorEmail: ctx.email,
      action: "demo.moderation_run", resourceType: "system", resourceId: "demo",
      after: { count: results.length, filters: { mediaType, category } }
    });

    res.json({ success: true, results });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
