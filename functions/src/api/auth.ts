import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// POST /v1/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    // Validate role
    const validRoles = ["viewer", "moderator", "platform_admin"];
    const assignedRole = validRoles.includes(role) ? role : "viewer";

    const auth = getAuth();
    const db = getFirestore();

    // Create Firebase user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
    });

    // Auto-create organization from email domain
    const orgId = uuidv4();
    const orgName = displayName ? `${displayName}'s Org` : `${email.split("@")[0]}'s Org`;
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 50);

    await db.doc(`organizations/${orgId}`).set({
      orgId,
      name: orgName,
      slug,
      ownerId: userRecord.uid,
      plan: "free",
      status: "active",
      settings: {
        autoRejectAbove: 80,
        humanReviewThreshold: 0.65,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Add user as member with selected role
    await db.doc(`organizations/${orgId}/members/${userRecord.uid}`).set({
      userId: userRecord.uid,
      orgId,
      email,
      displayName: displayName || email.split("@")[0],
      role: assignedRole,
      joinedAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
    });

    // Set custom claims with selected role
    await auth.setCustomUserClaims(userRecord.uid, {
      orgId,
      role: assignedRole,
      plan: "free",
    });

    // Create default policy
    const policyRef = db.collection(`organizations/${orgId}/policies`).doc();
    await policyRef.set({
      policyId: policyRef.id,
      orgId,
      name: "Default Policy",
      version: 1,
      isActive: true,
      categories: [
        { name: "hateSpeech", enabled: true, sensitivity: 70, alwaysReview: false },
        { name: "harassment", enabled: true, sensitivity: 70, alwaysReview: false },
        { name: "violence", enabled: true, sensitivity: 70, alwaysReview: false },
        { name: "nsfw", enabled: true, sensitivity: 80, alwaysReview: false },
        { name: "spam", enabled: true, sensitivity: 50, alwaysReview: false },
        { name: "selfHarm", enabled: true, sensitivity: 90, alwaysReview: true },
        { name: "misinformation", enabled: true, sensitivity: 60, alwaysReview: false },
      ],
      createdBy: userRecord.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await db.doc(`organizations/${orgId}`).update({
      "settings.defaultPolicyId": policyRef.id,
    });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      orgId,
      role: assignedRole,
      plan: "free",
      message: "Account created successfully. Please sign in.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Signup error:", error);
    res.status(400).json({ error: error.message || "Signup failed" });
  }
});

// POST /v1/auth/set-claims (admin only — for role changes)
router.post("/set-claims", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx || (ctx.role !== "org_owner" && ctx.role !== "org_admin" && ctx.role !== "platform_admin")) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const { userId, role } = req.body;
    if (!userId || !role) {
      res.status(400).json({ error: "userId and role are required" });
      return;
    }

    const auth = getAuth();
    await auth.setCustomUserClaims(userId, {
      orgId: ctx.orgId,
      role,
      plan: ctx.plan,
    });

    res.json({ success: true, message: `Claims updated for user ${userId}` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to set claims" });
  }
});

export default router;
