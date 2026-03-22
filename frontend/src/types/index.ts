import type { Timestamp } from 'firebase/firestore'

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

export interface UserDoc {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: UserRole
  provider: string
  createdAt: Timestamp | { seconds: number; nanoseconds: number }
  isActive: boolean
  casesReviewed: number
  lastActiveAt?: Timestamp
}

export interface ContentDoc {
  contentId: string
  type: ContentType
  payload?: string
  storageRef?: string
  submittedBy: string
  submittedAt: Timestamp | { seconds: number; nanoseconds: number }
  status: ContentStatus
  isDeleted: boolean
  deletedAt?: Timestamp
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
  reviewedAt: Timestamp | { seconds: number; nanoseconds: number } | null
  notes: string | null
  isOverride: boolean
  createdAt: Timestamp | { seconds: number; nanoseconds: number }
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
  submittedAt: Timestamp | { seconds: number; nanoseconds: number }
  resolvedAt?: Timestamp | { seconds: number; nanoseconds: number }
  notifyUser: boolean
}

export interface PolicyDoc {
  thresholds: {
    hateSpeech: number
    spam: number
    violence: number
    nsfw: number
    harassment: number
  }
  automation: {
    autoBlockCritical: boolean
    humanReviewMediumPlus: boolean
    learningMode: boolean
  }
  updatedBy: string
  updatedAt: Timestamp | { seconds: number; nanoseconds: number } | null
  isDefault?: boolean
}

export interface ModerationRule {
  ruleId: string
  name: string
  category: string
  conditions: Array<{
    field: 'text' | 'category' | 'score'
    operator: 'contains' | 'equals' | 'gt' | 'lt'
    value: string | number
  }>
  action: DecisionType
  priority: number
  isActive: boolean
  createdBy: string
  createdAt: Timestamp | { seconds: number; nanoseconds: number }
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number }
}

export interface ModerationStats {
  totalToday: number
  pendingReview: number
  autoBlocked: number
  modelAccuracy: number
  avgLatencyMs: number
  falsePositiveRate: number
  appealSuccessRate: number
  avgReviewTimeMin: number
  overrideRate: number
}
