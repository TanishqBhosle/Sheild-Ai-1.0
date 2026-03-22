import { Router } from 'express'
import { z } from 'zod'
import { getOverview, getTimeseries, getCategories } from '../controllers/analytics.controller'
import { listAuditLogs } from '../controllers/admin.controller'
import { requireRole } from '../middleware/role.guard'
import { validateQuery } from '../middleware/validate'

const router = Router()

const rangeQuerySchema = z.object({
  range: z.enum(['7d', '30d', 'today']).optional().default('7d'),
})

const auditLogQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.enum(['content', 'appeal', 'policy', 'rule', 'user']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

router.get(
  '/overview',
  requireRole('moderator', 'admin'),
  validateQuery(rangeQuerySchema),
  getOverview
)
router.get(
  '/timeseries',
  requireRole('moderator', 'admin'),
  validateQuery(rangeQuerySchema),
  getTimeseries
)
router.get(
  '/categories',
  requireRole('moderator', 'admin'),
  validateQuery(rangeQuerySchema),
  getCategories
)
router.get(
  '/audit-logs',
  requireRole('admin'),
  validateQuery(auditLogQuerySchema),
  listAuditLogs
)

export default router
