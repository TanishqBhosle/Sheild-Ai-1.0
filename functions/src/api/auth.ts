import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware } from "../middleware/authMiddleware";
import { onboardUser } from "../utils/authHelpers";
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

    // Onboard user (Create Org + Set Claims)
    const { orgId, role: finalRole } = await onboardUser(userRecord.uid, email, displayName, assignedRole as any, hashedPassword);

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      orgId,
      role: finalRole,
      message: "User created and onboarded successfully"
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
    
    if (!userData.password) {
      res.status(401).json({ error: "This account uses a different sign-in method (e.g. Google)" });
      return;
    }

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
        orgId: userData.orgId || "",
        role: userData.role,
        plan: "free"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Generate Firebase Custom Token (for Firestore/Storage)
    const auth = getAuth();
    const firebaseToken = await auth.createCustomToken(userData.uid, {
      orgId: userData.orgId || "",
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

    const { orgId, role } = await onboardUser(ctx.uid, ctx.email, undefined, ctx.role);

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
