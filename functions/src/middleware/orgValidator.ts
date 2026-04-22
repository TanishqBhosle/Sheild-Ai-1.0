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

  try {
    const db = getFirestore();
    const orgDoc = await db.doc(`organizations/${ctx.orgId}`).get();

    if (!orgDoc.exists) {
      res.status(404).json({ error: "Organization not found" });
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
    res.status(500).json({ error: "Organization validation failed" });
  }
}
