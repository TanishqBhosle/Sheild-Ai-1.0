import type { Request, Response } from 'express'
import { appealsRepo } from '../repositories/appeals.repo'
import { contentRepo } from '../repositories/content.repo'
import { moderationRepo } from '../repositories/moderation.repo'
import { auditRepo } from '../repositories/audit.repo'
import { notifyUserEvent } from '../services/notification.service'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import type { AppealStatus, DecisionType, ResolutionType } from '../types'

export const createAppeal = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { contentId, reason, notifyUser } = req.body as {
      contentId: string
      reason: string
      notifyUser?: boolean
    }

    const content = await contentRepo.findById(contentId)
    if (!content) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Content not found',
        statusCode: 404,
      })
      return
    }

    const isStaff = req.user.role === 'moderator' || req.user.role === 'admin'
    if (!isStaff && content.submittedBy !== req.user.uid) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Forbidden',
        statusCode: 403,
      })
      return
    }

    const existing = await appealsRepo.findByContentIdForUser(
      contentId,
      req.user.uid
    )
    if (existing) {
      res.status(409).json({
        error: 'CONFLICT',
        message: 'Appeal already exists for this content',
        statusCode: 409,
      })
      return
    }

    if (content.status !== 'flagged' && content.status !== 'blocked') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Appeals only allowed for flagged or blocked content',
        statusCode: 400,
      })
      return
    }

    const appealId = `APL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await appealsRepo.create({
      appealId,
      contentId,
      userId: req.user.uid,
      reason,
      status: 'pending',
      notifyUser: notifyUser ?? false,
    })

    const submittedAt = new Date().toISOString()
    res.status(201).json({ appealId, status: 'pending' as AppealStatus, submittedAt })
  } catch (error) {
    logger.error('createAppeal failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const listAppeals = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as {
      status?: AppealStatus
      page?: number
      limit?: number
    }
    const page = q.page ?? 1
    const limit = q.limit ?? 50
    const { items, total } = await appealsRepo.list({
      status: q.status,
      page,
      limit,
    })
    res.json({ total, items })
  } catch (error) {
    logger.error('listAppeals failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getAppealById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const appealId = req.params['id']
    const appeal = await appealsRepo.findById(appealId)
    if (!appeal) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Appeal not found',
        statusCode: 404,
      })
      return
    }
    const isStaff = req.user.role === 'moderator' || req.user.role === 'admin'
    if (!isStaff && appeal.userId !== req.user.uid) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Forbidden',
        statusCode: 403,
      })
      return
    }
    res.json(appeal)
  } catch (error) {
    logger.error('getAppealById failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const resolveAppeal = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const appealId = req.params['id']
    const { resolution, responseMessage, notifyUser } = req.body as {
      resolution: ResolutionType
      responseMessage?: string
      notifyUser?: boolean
    }

    const appeal = await appealsRepo.findById(appealId)
    if (!appeal) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Appeal not found',
        statusCode: 404,
      })
      return
    }

    let newDecision: DecisionType | null = null
    let appealStatus: AppealStatus = 'under_review'

    if (resolution === 'overturned') {
      appealStatus = 'overturned'
      newDecision = 'allow'
      await contentRepo.updateStatus(appeal.contentId, 'allowed')
      await moderationRepo.updateDecision(appeal.contentId, {
        finalDecision: 'allow',
        reviewedBy: req.user.uid,
        notes: responseMessage ?? 'Appeal overturned',
        isOverride: true,
      })
    } else if (resolution === 'upheld') {
      appealStatus = 'upheld'
      const mod = await moderationRepo.findByContentId(appeal.contentId)
      newDecision = mod?.finalDecision ?? mod?.aiDecision ?? 'block'
    } else {
      appealStatus = 'under_review'
      newDecision = null
    }

    await appealsRepo.update(appealId, {
      status: appealStatus,
      resolution,
      responseMessage: responseMessage ?? null,
      reviewedBy: req.user.uid,
      resolvedAt: 'AUTO',
      notifyUser: notifyUser ?? false,
    })

    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'APPEAL_RESOLVE',
      targetId: appealId,
      targetType: 'appeal',
      newValue: { resolution, appealStatus },
    })

    if (notifyUser) {
      notifyUserEvent({
        userId: appeal.userId,
        contentId: appeal.contentId,
        decision: newDecision ?? 'flag',
        message: responseMessage,
      })
    }

    res.json({ appealId, resolution, newDecision })
  } catch (error) {
    logger.error('resolveAppeal failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}
