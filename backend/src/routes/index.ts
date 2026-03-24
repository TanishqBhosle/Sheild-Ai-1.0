import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { rateLimit } from '../middleware/rateLimit'
import authRoutes from './auth.routes'
import contentRoutes from './content.routes'
import moderationRoutes from './moderation.routes'
import appealsRoutes from './appeals.routes'
import adminRoutes from './admin.routes'
import analyticsRoutes from './analytics.routes'

const router = Router()

router.use(rateLimit)
router.use(authenticate)

router.use('/auth', authRoutes)
router.use('/content', contentRoutes)
router.use('/moderation', moderationRoutes)
router.use('/appeals', appealsRoutes)
router.use('/admin', adminRoutes)
router.use('/analytics', analyticsRoutes)

export default router
