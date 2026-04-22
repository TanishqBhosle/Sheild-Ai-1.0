import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware } from "../middleware/authMiddleware";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "aegis-ai-secret-key-2024";

// POST /v1/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    // Validate role
    const validRoles = ["user", "moderator", "platform_admin"];
    const assignedRole = validRoles.includes(role) ? role : "user";

    const auth = getAuth();
    const db = getFirestore();

    // Check if user already exists in Firestore
    const existingUserSnap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existingUserSnap.empty) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Firebase Auth user for emulator/storage compatibility
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
      });
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw err;
      }
    }

    // Save to our custom "users" collection (MERN style)
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      password: hashedPassword,
      displayName: displayName || email.split("@")[0],
      role: assignedRole,
      createdAt: Timestamp.now(),
    });

    // Set custom claims with selected role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: assignedRole,
      plan: "free",
    });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      message: "User created successfully in flat architecture"
    });
  } catch (err: unknown) {
    console.error("Signup error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/test", (req, res) => {
  res.json({ message: "Auth router is working" });
});

/**
 * @route POST /v1/auth/login
 * @desc Login user and return JWT + Firebase token
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = getFirestore();
    const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();

    if (userSnap.empty) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const userData = userSnap.docs[0].data();
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate JWT (for our own API)
    const token = jwt.sign(
      { 
        uid: userData.uid, 
        email: userData.email, 
        role: userData.role,
        plan: "free"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Generate Firebase Custom Token (for Firestore/Storage)
    const auth = getAuth();
    const firebaseToken = await auth.createCustomToken(userData.uid, {
      role: userData.role,
      plan: "free"
    });

    res.json({
      token,
      firebaseToken,
      user: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role
      }
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/set-claims", authMiddleware, async (req: Request, res: Response) => {
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

    // Also update role in Firestore members collection
    const db = getFirestore();
    await db.doc(`organizations/${ctx.orgId}/members/${userId}`).update({
      role,
      updatedAt: Timestamp.now()
    });

    res.json({ success: true, message: `Claims updated for user ${userId}` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to set claims" });
  }
});

// POST /v1/auth/onboarding
// Ensures a user (e.g. from Google login) has an organization and custom claims
router.post("/onboarding", authMiddleware, async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const db = getFirestore();
    const auth = getAuth();

    // 1. Check if user already has custom claims with an orgId
    const userRecord = await auth.getUser(ctx.uid);
    if (userRecord.customClaims?.orgId) {
      res.json({ success: true, message: "User already onboarded", orgId: userRecord.customClaims.orgId });
      return;
    }

    // 2. Check if user is already a member of any organization in Firestore
    const membershipSnap = await db.collectionGroup("members").where("userId", "==", ctx.uid).limit(1).get();
    
    let orgId: string;
    let role: string = "org_owner";

    if (!membershipSnap.empty) {
      const memberDoc = membershipSnap.docs[0].data();
      orgId = memberDoc.orgId;
      role = memberDoc.role;
    } else {
      // 3. Create new organization for new Google user
      orgId = uuidv4();
      const orgName = userRecord.displayName ? `${userRecord.displayName}'s Org` : `${userRecord.email?.split("@")[0]}'s Org`;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 50);

      await db.doc(`organizations/${orgId}`).set({
        orgId,
        name: orgName,
        slug,
        ownerId: ctx.uid,
        plan: "free",
        status: "active",
        settings: {
          autoRejectAbove: 80,
          humanReviewThreshold: 0.65,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Add as member
      await db.doc(`organizations/${orgId}/members/${ctx.uid}`).set({
        userId: ctx.uid,
        orgId,
        email: userRecord.email || "",
        displayName: userRecord.displayName || userRecord.email?.split("@")[0] || "User",
        role: "org_owner",
        joinedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
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
        createdBy: ctx.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await db.doc(`organizations/${orgId}`).update({
        "settings.defaultPolicyId": policyRef.id,
      });
    }

    // 4. Set custom claims
    await auth.setCustomUserClaims(ctx.uid, {
      orgId,
      role,
      plan: "free",
    });

    res.json({ success: true, message: "Onboarding complete", orgId, role });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Onboarding error:", error);
    res.status(500).json({ error: error.message || "Onboarding failed" });
  }
});

// GET /v1/auth/members
// Returns all members of the organization
router.get("/members", authMiddleware, async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const db = getFirestore();
    const membersSnap = await db.collection(`organizations/${ctx.orgId}/members`).orderBy("joinedAt", "desc").get();
    const members = membersSnap.docs.map(doc => doc.data());

    res.json({ members });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch members" });
  }
});

export default router;
