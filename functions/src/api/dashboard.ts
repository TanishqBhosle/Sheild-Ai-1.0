import { Router, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

const router = Router();

// GET /v1/dashboard/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const db = getFirestore();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

    const dailyDoc = await db.doc(`organizations/${ctx.orgId}/usage_logs/${monthKey}/daily/${todayKey}`).get();
    const dailyData = dailyDoc.data() || { apiCalls: 0 };

    const recentSnap = await db.collection(`organizations/${ctx.orgId}/moderation_results`)
      .orderBy("createdAt", "desc").limit(10).get();
    const recentResults = recentSnap.docs.map(d => d.data());
    const avgLatency = recentResults.length > 0
      ? Math.round(recentResults.reduce((s, r) => s + (r.processingMs || 0), 0) / recentResults.length) : 0;

    res.json({ apiCallsToday: dailyData.apiCalls || 0, flaggedToday: 0, pendingReview: 0, avgLatencyMs: avgLatency, recentResults });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/dashboard/analytics
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }
    const db = getFirestore();
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
    const dailySnap = await db.collection(`organizations/${ctx.orgId}/usage_logs/${monthKey}/daily`)
      .orderBy("date", "desc").limit(7).get();
    const monthlyDoc = await db.doc(`organizations/${ctx.orgId}/usage_logs/${monthKey}`).get();
    res.json({ dailyUsage: dailySnap.docs.map(d => d.data()).reverse(), monthlyUsage: monthlyDoc.data() || {} });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
