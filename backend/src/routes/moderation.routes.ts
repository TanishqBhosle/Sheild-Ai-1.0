import { Router } from 'express'
import { z } from 'zod'
import {
  getQueue,
  getModerationByContentId,
  patchDecision,
  getStats,
} from '../controllers/moderation.controller'
import { getModerationAnalytics } from '../controllers/analytics.controller'
import { requireRole } from '../middleware/role.guard'
import { validateBody, validateQuery } from '../middleware/validate'
import { CONTENT_TYPES, DECISION_TYPES } from '../config/constants'

const router = Router()

router.use(requireRole('moderator', 'admin'))

const moderationQueueQuerySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const decisionSchema = z.object({
  decision: z.enum([
    DECISION_TYPES[0],
    DECISION_TYPES[1],
    DECISION_TYPES[2],
    DECISION_TYPES[3],
  ]),
  notes: z.string().max(1000).optional(),
  notifyUser: z.boolean().optional().default(false),
})

const analyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', 'today']).optional().default('7d'),
})

router.get('/queue', validateQuery(moderationQueueQuerySchema), getQueue)
router.get('/stats', getStats)
router.get('/analytics', validateQuery(analyticsQuerySchema), getModerationAnalytics)
router.get('/:id', getModerationByContentId)
router.patch('/:id/decision', validateBody(decisionSchema), patchDecision)

export default router
