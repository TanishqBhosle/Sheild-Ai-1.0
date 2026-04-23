import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v4 as uuidv4 } from "uuid";
import { UserRole } from "../types";

export async function onboardUser(uid: string, email: string, displayName?: string, requestedRole?: UserRole, password?: string) {
  const db = getFirestore();
  const auth = getAuth();

  const role = requestedRole || "org_owner";
  const orgId = "global";

  // 1. Update flat "users" collection
  await db.collection("users").doc(uid).set({
    uid,
    email,
    displayName: displayName || email.split("@")[0] || "User",
    role,
    orgId,
    ...(password ? { password } : {}),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  // 2. Set custom claims
  await auth.setCustomUserClaims(uid, {
    orgId,
    role,
    plan: "free",
  });

  return { orgId, role };
}
