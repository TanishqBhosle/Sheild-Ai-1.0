import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

let _db: ReturnType<typeof getFirestore> | null = null;
function db() {
  if (!_db) _db = getFirestore();
  return _db;
}

export async function incrementUsage(
  contentType: string
): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayKey = `${monthKey}-${String(now.getDate()).padStart(2, "0")}`;

  const monthRef = db().doc(`usage_metrics/monthly_${monthKey}`);
  const dayRef = db().doc(`usage_metrics/daily_${dayKey}`);

  const typeField = `${contentType}Requests` as string;

  const batch = db().batch();

  batch.set(monthRef, {
    period: monthKey,
    apiCalls: FieldValue.increment(1),
    [typeField]: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  batch.set(dayRef, {
    date: dayKey,
    period: monthKey,
    apiCalls: FieldValue.increment(1),
    [typeField]: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  await batch.commit();
}

export async function writeAuditLog(params: {
  orgId?: string; // Optional in flat architecture
  actor: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const logRef = db().collection("audit_logs").doc();
  
  // Filter out undefined properties to prevent Firestore errors
  const cleanData = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined)
  );

  await logRef.set({
    logId: logRef.id,
    ...cleanData,
    timestamp: Timestamp.now(),
  });
}

export function getDb() {
  return db();
}
