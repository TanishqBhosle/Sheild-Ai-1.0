import { Router } from 'express'
import {
  getPolicies,
  putPolicies,
  listRules,
  createRule,
  patchRule,
  getTeam,
  inviteTeamMember,
} from '../controllers/admin.controller'
import { requireRole } from '../middleware/role.guard'
import { validateBody, validateQuery } from '../middleware/validate'
import {
  policiesPutSchema,
  ruleCreateSchema,
  rulePatchSchema,
  teamInviteSchema,
} from './schemas'
import { z } from 'zod'

const router = Router()

const rulesQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
})

router.get('/policies', requireRole('moderator', 'admin'), getPolicies)
router.put(
  '/policies',
  requireRole('admin'),
  validateBody(policiesPutSchema),
  putPolicies
)

router.get(
  '/rules',
  requireRole('moderator', 'admin'),
  validateQuery(rulesQuerySchema),
  listRules
)
router.post(
  '/rules',
  requireRole('admin'),
  validateBody(ruleCreateSchema),
  createRule
)
router.patch(
  '/rules/:id',
  requireRole('admin'),
  validateBody(rulePatchSchema),
  patchRule
)

router.get('/team', requireRole('admin'), getTeam)
router.post(
  '/team/invite',
  requireRole('admin'),
  validateBody(teamInviteSchema),
  inviteTeamMember
)

export default router
