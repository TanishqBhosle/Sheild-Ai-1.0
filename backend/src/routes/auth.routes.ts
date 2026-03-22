import { Router } from 'express'
import { getMe, setRoleHttp } from '../controllers/auth.controller'
import { validateBody } from '../middleware/validate'
import { setRoleBodySchema } from './schemas'

const router = Router()

router.get('/me', getMe)
router.post('/set-role', validateBody(setRoleBodySchema), setRoleHttp)

export default router
