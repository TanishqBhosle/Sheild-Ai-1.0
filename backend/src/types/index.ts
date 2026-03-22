/* eslint-disable @typescript-eslint/no-namespace -- Express Request.user augmentation */
import type * as admin from 'firebase-admin'

export type ContentType = 'text' | 'image' | 'audio' | 'video'
export type DecisionType = 'allow' | 'flag' | 'block' | 'escalated'
export type SeverityType = 'low' | 'medium' | 'high' | 'critical'
export type UserRole = 'user' | 'moderator' | 'admin'
export type AppealStatus =
  | 'pending'
  | 'under_review'
  | 'overturned'
  | 'upheld'
export type ResolutionType = 'overturned' | 'upheld' | 'info_requested'
export type ContentStatus = 'analyzing' | 'allowed' | 'flagged' | 'blocked'

export interface AuthUser {
  uid: string
  email: string
  role: UserRole
}

export interface UserDoc {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: UserRole
  provider: string
  createdAt: admin.firestore.Timestamp
  isActive: boolean
  casesReviewed: number
  lastActiveAt?: admin.firestore.Timestamp
}

export interface ContentDoc {
  contentId: string
  type: ContentType
  payload?: string
  storageRef?: string
  submittedBy: string
  submittedAt: admin.firestore.Timestamp
  status: ContentStatus
  isDeleted: boolean
  deletedAt?: admin.firestore.Timestamp
  deletedBy?: string
  language?: string
  platform?: string
}

export interface ModerationScores {
  toxicity: number
  harassment: number
  spam: number
  violence: number
  nsfw: number
  hateSpeech: number
}

export interface ModerationResult {
  resultId: string
  contentId: string
  aiDecision: DecisionType
  finalDecision: DecisionType | null
  severity: SeverityType
  confidence: number
  scores: ModerationScores
  category: string
  reasoning: string
  model: string
  latencyMs: number
  reviewedBy: string | null
  reviewedAt: admin.firestore.Timestamp | null
  notes: string | null
  isOverride: boolean
  createdAt: admin.firestore.Timestamp
}

export interface AppealDoc {
  appealId: string
  contentId: string
  userId: string
  reason: string
  status: AppealStatus
  resolution?: ResolutionType
  responseMessage?: string
  reviewedBy?: string
  submittedAt: admin.firestore.Timestamp
  resolvedAt?: admin.firestore.Timestamp
  notifyUser: boolean
}

export interface PolicyThresholds {
  hateSpeech: number
  spam: number
  violence: number
  nsfw: number
  harassment: number
}

export interface PolicyAutomation {
  autoBlockCritical: boolean
  humanReviewMediumPlus: boolean
  learningMode: boolean
}

export interface PolicyDoc {
  thresholds: PolicyThresholds
  automation: PolicyAutomation
  updatedBy: string
  updatedAt: admin.firestore.Timestamp
}

export interface RuleCondition {
  field: 'text' | 'category' | 'score'
  operator: 'contains' | 'equals' | 'gt' | 'lt'
  value: string | number
}

export interface ModerationRule {
  ruleId: string
  name: string
  category: string
  conditions: RuleCondition[]
  action: DecisionType
  priority: number
  isActive: boolean
  createdBy: string
  createdAt: admin.firestore.Timestamp
  updatedAt?: admin.firestore.Timestamp
}

export interface AuditLog {
  logId: string
  actorId: string
  action: string
  targetId: string
  targetType: 'content' | 'appeal' | 'policy' | 'rule' | 'user'
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  timestamp: admin.firestore.Timestamp
  ipAddress?: string
}

export interface FeedbackDoc {
  feedbackId: string
  contentId: string
  moderatorId: string
  correctLabel: string
  notes: string
  createdAt: admin.firestore.Timestamp
}

export interface GeminiAnalysisResult {
  decision: DecisionType
  severity: SeverityType
  confidence: number
  category: string
  scores: ModerationScores
  reasoning: string
  latencyMs: number
}

export interface DecisionResult {
  action: DecisionType
  severity: SeverityType
  requiresHumanReview: boolean
  appliedRule?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
