export const REGION = 'asia-south1'
export const REGIONS = { PRIMARY: REGION } as const

export const DEFAULT_THRESHOLDS = {
  hateSpeech: 0.65,
  spam: 0.8,
  violence: 0.7,
  nsfw: 0.75,
  harassment: 0.68,
} as const

export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'] as const
export const DECISION_TYPES = ['allow', 'flag', 'block', 'escalated'] as const
export const CONTENT_TYPES = ['text', 'image', 'audio', 'video'] as const
export const USER_ROLES = ['user', 'moderator', 'admin'] as const
export const APPEAL_STATUSES = [
  'pending',
  'under_review',
  'overturned',
  'upheld',
] as const

export const CACHE_TTL = {
  STATS: 5 * 60 * 1000,
  ANALYTICS: 15 * 60 * 1000,
} as const

export const LIMITS = {
  MAX_CONTENT_LENGTH: 10_000,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 50,
  MAX_FILE_SIZE_IMAGE: 10 * 1024 * 1024,
  MAX_FILE_SIZE_AUDIO: 50 * 1024 * 1024,
  MAX_FILE_SIZE_VIDEO: 200 * 1024 * 1024,
} as const
