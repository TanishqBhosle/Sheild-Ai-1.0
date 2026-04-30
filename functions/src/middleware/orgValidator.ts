import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { Organization, PlanTier } from "../types";

export async function orgValidator(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ctx = req.authContext;
  if (!ctx) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Platform admins bypass org validation
  if (ctx.role === "platform_admin") {
    next();
    return;
  }

  if (!ctx.orgId) {
    res.status(403).json({ error: "No organization associated with this account" });
    return;
  }

  // FLAT ARCHITECTURE: "global" is the shared org for all users.
  // Skip Firestore lookup — just inject plan and proceed.
  if (ctx.orgId === "global") {
    ctx.plan = ctx.plan || "free";
    next();
    return;
  }

  try {
    const db = getFirestore();
    const orgDoc = await db.doc(`organizations/${ctx.orgId}`).get();

    if (!orgDoc.exists) {
      // Fallback: if org doc not found, still allow through (avoids blocking all users)
      console.warn(`[OrgValidator] Organization ${ctx.orgId} not found in Firestore — allowing through`);
      ctx.plan = ctx.plan || "free";
      next();
      return;
    }

    const org = orgDoc.data() as Organization;

    if (org.status === "suspended") {
      res.status(403).json({
        error: "Organization is suspended",
        message: "Contact support for reinstatement",
      });
      return;
    }

    // Inject plan into auth context
    ctx.plan = org.plan as PlanTier;

    next();
  } catch (err) {
    console.error("Org validation error:", err);
    // On error, still allow through to avoid blocking all users
    ctx.plan = ctx.plan || "free";
    next();
  }
}
