import { Timestamp, FieldValue } from "firebase-admin/firestore";

// ──── Enums ────
export type UserRole = "platform_admin" | "org_owner" | "org_admin" | "moderator" | "user" | "api_key";
export type ContentType = "text" | "image" | "audio" | "video" | "batch";
export type ContentStatus = "pending" | "processing" | "completed" | "failed" | "queued_for_review";
export type ModerationDecision = "approved" | "rejected" | "flagged" | "needs_human_review";
export type OrgStatus = "active" | "suspended" | "trial";
export type PlanTier = "free" | "starter" | "pro" | "enterprise";

// ──── Organizations ────
export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: PlanTier;
  stripeCustomerId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  status: OrgStatus;
  trialEndsAt?: Timestamp;
  settings: OrgSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrgSettings {
  autoRejectAbove: number;
  humanReviewThreshold: number;
  defaultPolicyId?: string;
  requireHumanReviewBetween?: [number, number];
}

// ──── Members ────
export interface Member {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  invitedBy?: string;
  joinedAt: Timestamp;
  lastActiveAt: Timestamp;
}

// ──── Policies ────
export interface Policy {
  policyId: string;
  orgId: string;
  name: string;
  version: number;
  isActive: boolean;
  categories: PolicyCategory[];
  customInstructions?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PolicyCategory {
  name: string;
  enabled: boolean;
  sensitivity: number; // 0-100
  alwaysReview: boolean;
}

// ──── Content ────
export interface Content {
  contentId: string;
  orgId: string;
  policyId?: string;
  submittedBy: string;
  externalId?: string;
  type: ContentType;
  text?: string;
  mediaUrl?: string;
  mediaStoragePath?: string;
  status: ContentStatus;
  jobId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processedAt?: Timestamp;
}

// ──── Moderation Results ────
export interface ModerationResult {
  resultId: string;
  contentId: string;
  orgId: string;
  decision: ModerationDecision;
  overriddenDecision?: ModerationDecision;
  overriddenBy?: string;
  overrideReason?: string;
  severity: number; // 0-100
  confidence: number; // 0-1
  categories: Record<string, CategoryScore>;
  explanation: string;
  aiModel: string;
  promptVersion: string;
  processingMs: number;
  needsHumanReview: boolean;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt: Timestamp;
}

export interface CategoryScore {
  triggered: boolean;
  severity: number; // 0-100
  confidence: number; // 0-1
}

// ──── Usage Logs ────
export interface UsageLog {
  period: string; // YYYY-MM
  orgId: string;
  apiCalls: number;
  textRequests: number;
  imageRequests: number;
  audioRequests: number;
  videoRequests: number;
  tokensConsumed: number;
  storageBytes: number;
  humanReviewCount: number;
  overageChargesUsd: number;
  updatedAt: Timestamp;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  orgId: string;
  apiCalls: number;
  textRequests: number;
  imageRequests: number;
  audioRequests: number;
  videoRequests: number;
  period: string;
  updatedAt: Timestamp;
}

// ──── Audit Logs ────
export interface AuditLog {
  logId: string;
  orgId: string;
  actor: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

// ──── API Keys ────
export interface ApiKey {
  keyHash: string;
  keyPrefix: string;
  orgId: string;
  name: string;
  createdBy: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

// ──── Feedback Signals ────
export interface FeedbackSignal {
  signalId: string;
  orgId: string;
  contentId: string;
  aiDecision: ModerationDecision;
  humanDecision: ModerationDecision;
  delta: number;
  moderatorId: string;
  createdAt: Timestamp;
}

// ──── API Request/Response Types ────
export interface ModerateRequest {
  type: ContentType;
  text?: string;
  mediaUrl?: string;
  externalId?: string;
  policyId?: string;
  metadata?: Record<string, unknown>;
  async?: boolean;
}

export interface ModerateResponse {
  requestId: string;
  contentId: string;
  decision: ModerationDecision;
  severity: number;
  confidence: number;
  categories: Record<string, CategoryScore>;
  processingMs: number;
  explanation?: string;
  status: ModerationDecision;
}

export interface AsyncModerateResponse {
  requestId: string;
  contentId: string;
  status: "processing";
  pollUrl: string;
  estimatedCompletionMs: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  nextCursor?: string;
  total: number;
  hasMore: boolean;
}

// ──── Auth context injected by middleware ────
export interface AuthContext {
  uid: string;
  email: string;
  orgId: string;
  role: UserRole;
  plan: PlanTier;
}

// ──── Rate Limit Plan Config ────
export const PLAN_LIMITS: Record<PlanTier, { reqPerMin: number; reqPerMonth: number; overageRate: number }> = {
  free:       { reqPerMin: 60,    reqPerMonth: 1000,    overageRate: 0 },
  starter:    { reqPerMin: 300,   reqPerMonth: 10000,   overageRate: 0.008 },
  pro:        { reqPerMin: 1000,  reqPerMonth: 100000,  overageRate: 0.004 },
  enterprise: { reqPerMin: 10000, reqPerMonth: 10000000, overageRate: 0 },
};
