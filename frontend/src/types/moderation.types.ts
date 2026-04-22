export type ModerationDecision = 'approved' | 'rejected' | 'flagged' | 'needs_human_review';

export interface CategoryScore {
  triggered: boolean;
  severity: number;
  confidence: number;
}

export interface ModerationResult {
  resultId: string;
  contentId: string;
  orgId: string;
  decision: ModerationDecision;
  overriddenDecision?: ModerationDecision;
  overriddenBy?: string;
  overrideReason?: string;
  severity: number;
  confidence: number;
  categories: Record<string, CategoryScore>;
  explanation: string;
  aiModel: string;
  processingMs: number;
  needsHumanReview: boolean;
  reviewedBy?: string;
  reviewedAt?: unknown;
  reviewNotes?: string;
  createdAt: unknown;
}

export interface Policy {
  policyId: string;
  orgId: string;
  name: string;
  version: number;
  isActive: boolean;
  categories: PolicyCategory[];
  customInstructions?: string;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface PolicyCategory {
  name: string;
  enabled: boolean;
  sensitivity: number;
  alwaysReview: boolean;
}

export interface ApiKeyInfo {
  keyPrefix: string;
  name: string;
  isActive: boolean;
  scopes: string[];
  createdAt: unknown;
  expiresAt?: unknown;
  lastUsedAt?: unknown;
}
