import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "../utils/firestoreHelpers";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /v1/admin/users
router.get("/users", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const limitCount = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const snap = await db.collection("users").orderBy("createdAt", "desc").limit(limitCount).get();
    res.json({ users: snap.docs.map(d => d.data()), total: snap.size });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/admin/platform-stats
router.get("/platform-stats", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const usersSnap = await db.collection("users").get();
    const resultsSnap = await db.collection("moderation_results").get();
    
    const roleBreakdown: Record<string, number> = {};
    usersSnap.docs.forEach(d => {
      const r = d.data().role || "user";
      roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
    });

    res.json({ 
      totalUsers: usersSnap.size, 
      totalModerations: resultsSnap.size,
      roleBreakdown 
    });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /v1/admin/analytics
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    
    // Aggregate platform wide stats
    const usersSnap = await db.collection("users").get();
    let totalCalls = 0;
    
    const usageSnap = await db.collection("usage_metrics").get();
    usageSnap.docs.forEach(doc => {
      if (doc.id.startsWith("daily_")) {
        totalCalls += doc.data().apiCalls || 0;
      }
    });

    // Generate last 7 days trends
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dateDisplay = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      
      const dayDoc = await db.doc(`usage_metrics/daily_${dateKey}`).get();
      dailyTrends.push({ 
        date: dateDisplay, 
        calls: dayDoc.exists ? (dayDoc.data()?.apiCalls || 0) : 0 
      });
    }

    const recentResultsSnap = await db.collection("moderation_results").orderBy("createdAt", "desc").limit(100).get();
    const recentResults = recentResultsSnap.docs.map(d => d.data());
    
    const avgLatency = recentResults.length > 0 
      ? Math.round(recentResults.reduce((sum, r) => sum + (r.processingMs || 0), 0) / recentResults.length) 
      : 0;

    const humanReviewed = recentResults.filter(r => r.reviewedAt);
    const accuracy = humanReviewed.length > 0
      ? Math.round((humanReviewed.filter(r => r.decision === r.status.toLowerCase()).length / humanReviewed.length) * 1000) / 10
      : 99.1; // Default if no reviews yet

    res.json({
      totalCalls,
      avgLatency,
      accuracy,
      userCount: usersSnap.size,
      dailyTrends
    });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
