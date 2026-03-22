import { Router } from 'express'
import { z } from 'zod'
import {
  submitContent,
  listContent,
  getContentById,
  deleteContent,
  postFeedback,
} from '../controllers/content.controller'
import { requireRole } from '../middleware/role.guard'
import { validateBody, validateQuery } from '../middleware/validate'
import { CONTENT_TYPES } from '../config/constants'

const router = Router()

const submitSchema = z
  .object({
    type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]),
    payload: z.string().min(1).max(10_000).optional(),
    storageRef: z.string().startsWith('gs://').optional(),
  })
  .refine((d) => Boolean(d.payload) || Boolean(d.storageRef), {
    message: 'Either payload or storageRef must be provided',
  })

const listQuerySchema = z.object({
  type: z.enum([CONTENT_TYPES[0], CONTENT_TYPES[1], CONTENT_TYPES[2], CONTENT_TYPES[3]]).optional(),
  status: z.enum(['analyzing', 'allowed', 'flagged', 'blocked']).optional(),
  from: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  to: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  submittedBy: z.string().min(1).optional(),
})

const feedbackSchema = z.object({
  correctLabel: z.string().min(1),
  notes: z.string().max(1000).optional().default(''),
})

router.post('/', validateBody(submitSchema), submitContent)
router.get('/', requireRole('moderator', 'admin'), validateQuery(listQuerySchema), listContent)
router.get('/:id', getContentById)
router.delete('/:id', requireRole('admin'), deleteContent)
router.post(
  '/:id/feedback',
  requireRole('moderator', 'admin'),
  validateBody(feedbackSchema),
  postFeedback
)

export default router
