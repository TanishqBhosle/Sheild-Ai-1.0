import { Router } from 'express'
import { z } from 'zod'
import {
  createAppeal,
  listAppeals,
  getAppealById,
  resolveAppeal,
} from '../controllers/appeals.controller'
import { requireRole } from '../middleware/role.guard'
import { validateBody, validateQuery } from '../middleware/validate'

const router = Router()

const appealSchema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(10).max(2000),
  notifyUser: z.boolean().optional().default(true),
})

const appealListQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'overturned', 'upheld']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const resolveSchema = z.object({
  resolution: z.enum(['overturned', 'upheld', 'info_requested']),
  responseMessage: z.string().max(2000).optional(),
  notifyUser: z.boolean().optional().default(true),
})

router.post('/', validateBody(appealSchema), createAppeal)
router.get('/', requireRole('moderator', 'admin'), validateQuery(appealListQuerySchema), listAppeals)
router.get('/:id', getAppealById)
router.patch(
  '/:id/resolve',
  requireRole('moderator', 'admin'),
  validateBody(resolveSchema),
  resolveAppeal
)

export default router
