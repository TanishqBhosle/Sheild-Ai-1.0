import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { PLAN_LIMITS } from "../types";

export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ctx = req.authContext;
  if (!ctx) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const limits = PLAN_LIMITS[ctx.plan];
  if (!limits) {
    next();
    return;
  }

  const db = getFirestore();
  const now = new Date();
  const windowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

  // Flat path: rate_limits/u_{uid}_{windowKey}
  const rateLimitRef = db.doc(`rate_limits/u_${ctx.uid}_${windowKey}`);

  try {
    const result = await db.runTransaction(async (txn) => {
      const doc = await txn.get(rateLimitRef);
      const currentCount = doc.exists ? (doc.data()?.count || 0) : 0;

      if (currentCount >= limits.reqPerMin) {
        return { limited: true, count: currentCount };
      }

      txn.set(rateLimitRef, {
        count: FieldValue.increment(1),
        uid: ctx.uid,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return { limited: false, count: currentCount + 1 };
    });

    // Set rate limit headers
    const resetTime = new Date(now);
    resetTime.setSeconds(60 - resetTime.getSeconds());
    resetTime.setMilliseconds(0);

    res.setHeader("X-RateLimit-Limit", limits.reqPerMin.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limits.reqPerMin - result.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.floor(resetTime.getTime() / 1000).toString());

    if (result.limited) {
      res.status(429).json({
        error: "Rate limit exceeded",
        limit: limits.reqPerMin,
        resetAt: resetTime.toISOString(),
      });
      return;
    }

    next();
  } catch (err) {
    // On rate limit check failure, allow the request through
    console.error("Rate limit check error:", err);
    next();
  }
}
