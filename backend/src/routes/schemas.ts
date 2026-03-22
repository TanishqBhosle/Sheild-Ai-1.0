import { z } from 'zod'
import { CONTENT_TYPES, DECISION_TYPES, USER_ROLES } from '../config/constants'

export const setRoleBodySchema = z.object({
  targetUid: z.string().min(1),
  role: z.enum([USER_ROLES[0], USER_ROLES[1], USER_ROLES[2]]),
})

export const contentSubmitSchema = z.object({
  type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]),
  payload: z.string().max(10_000).optional(),
  storageRef: z.string().optional(),
  submittedBy: z.string().min(1),
})

export const contentListQuerySchema = z.object({
  type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]).optional(),
  status: z.enum(['analyzing', 'allowed', 'flagged', 'blocked']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const feedbackBodySchema = z.object({
  correctLabel: z.string().min(1),
  notes: z.string().optional(),
})

export const moderationQueueQuerySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const decisionBodySchema = z.object({
  decision: z.enum([
    DECISION_TYPES[0],
    DECISION_TYPES[1],
    DECISION_TYPES[2],
    DECISION_TYPES[3],
  ]),
  notes: z.string().optional(),
  notifyUser: z.boolean().optional(),
})

export const analyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', 'today']).optional(),
})

export const appealCreateSchema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(1).max(5000),
  notifyUser: z.boolean().optional(),
})

export const appealListQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'overturned', 'upheld']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const appealResolveSchema = z.object({
  resolution: z.enum(['overturned', 'upheld', 'info_requested']),
  responseMessage: z.string().optional(),
  notifyUser: z.boolean().optional(),
})

const threshold = z.number().min(0).max(1)

export const policiesPutSchema = z.object({
  thresholds: z.object({
    hateSpeech: threshold,
    spam: threshold,
    violence: threshold,
    nsfw: threshold,
    harassment: threshold,
  }),
  automation: z.object({
    autoBlockCritical: z.boolean(),
    humanReviewMediumPlus: z.boolean(),
    learningMode: z.boolean(),
  }),
})

const ruleConditionSchema = z.object({
  field: z.enum(['text', 'category', 'score']),
  operator: z.enum(['contains', 'equals', 'gt', 'lt']),
  value: z.union([z.string(), z.number()]),
})

export const ruleCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  conditions: z.array(ruleConditionSchema).min(1),
  action: z.enum([
    DECISION_TYPES[0],
    DECISION_TYPES[1],
    DECISION_TYPES[2],
    DECISION_TYPES[3],
  ]),
  priority: z.number().int(),
})

export const rulePatchSchema = z
  .object({
    isActive: z.boolean().optional(),
    name: z.string().min(1).optional(),
    conditions: z.array(ruleConditionSchema).optional(),
    action: z.enum([
      DECISION_TYPES[0],
      DECISION_TYPES[1],
      DECISION_TYPES[2],
      DECISION_TYPES[3],
    ]).optional(),
    priority: z.number().int().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'empty patch' })

export const teamInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['moderator', 'admin']),
})

export const auditLogQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.enum(['content', 'appeal', 'policy', 'rule', 'user']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
