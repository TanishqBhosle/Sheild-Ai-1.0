import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { hashApiKey } from "../utils/apiKeyUtils";
import { AuthContext, ApiKey } from "../types";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = req.headers["x-request-id"] as string || uuidv4();
  res.setHeader("X-Request-Id", requestId);

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Missing Authorization header", requestId });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  // Check if it's an API key (starts with grd_)
  if (token.startsWith("grd_")) {
    try {
      const keyHash = hashApiKey(token);
      const db = getFirestore();
      const keyDoc = await db.collection("api_keys").doc(keyHash).get();

      if (!keyDoc.exists) {
        res.status(401).json({ error: "Invalid API key", requestId });
        return;
      }

      const keyData = keyDoc.data() as ApiKey;

      if (!keyData.isActive) {
        res.status(401).json({ error: "API key is inactive", requestId });
        return;
      }

      if (keyData.expiresAt && keyData.expiresAt.toDate() < new Date()) {
        res.status(401).json({ error: "API key has expired", requestId });
        return;
      }

      // Update last used
      await keyDoc.ref.update({ lastUsedAt: new Date() });

      req.authContext = {
        uid: `apikey_${keyData.keyPrefix}`,
        email: "",
        orgId: keyData.orgId,
        role: "api_key",
        plan: "free", // Will be resolved by orgValidator
      };

      next();
      return;
    } catch (err) {
      res.status(401).json({ error: "API key validation failed", requestId });
      return;
    }
  }

  // Otherwise treat as Firebase ID token
  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);

    req.authContext = {
      uid: decoded.uid,
      email: decoded.email || "",
      orgId: decoded.orgId as string || "",
      role: (decoded.role as AuthContext["role"]) || "viewer",
      plan: (decoded.plan as AuthContext["plan"]) || "free",
    };

    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Invalid Firebase token", requestId });
  }
}

/** Optional auth — sets authContext if token present, but doesn't reject */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  await authMiddleware(req, res, next);
}
