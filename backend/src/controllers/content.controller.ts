import type { Request, Response } from 'express'
import { contentRepo } from '../repositories/content.repo'
import { moderationRepo } from '../repositories/moderation.repo'
import { auditRepo } from '../repositories/audit.repo'
import { usersRepo } from '../repositories/users.repo'
import { feedbackRepo } from '../repositories/feedback.repo'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import { LIMITS } from '../config/constants'
import type { ContentType, ContentStatus } from '../types'

const sanitizePayload = (raw: string | undefined): string | undefined => {
  if (raw === undefined) {
    return undefined
  }
  // Remove tags and dangerous attributes like on* or javascript:
  return raw
    .replace(/<[^>]*>?/gm, '') // Strip tags
    .replace(/on\w+\s*=/gi, '') // Strip event handlers
    .replace(/javascript:/gi, '') // Strip javascript protocol
    .trim()
}

export const submitContent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { type, payload, storageRef } = req.body as {
      type: ContentType
      payload?: string
      storageRef?: string
    }
    const submittedBy = req.user.uid

    const p = sanitizePayload(payload)
    const hasPayload = Boolean(p && p.length > 0)
    const hasRef = Boolean(storageRef && storageRef.length > 0)
    if (!hasPayload && !hasRef) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'payload or storageRef required',
        statusCode: 400,
      })
      return
    }

    if (p && p.length > LIMITS.MAX_CONTENT_LENGTH) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'payload exceeds max length',
        statusCode: 400,
      })
      return
    }

    const contentId = `MOD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    await contentRepo.create({
      contentId,
      type,
      payload: hasPayload ? p : undefined,
      storageRef: hasRef ? storageRef : undefined,
      submittedBy,
      status: 'analyzing',
    })

    res.status(202).json({
      contentId,
      status: 'analyzing',
      estimatedMs: 300,
    })
  } catch (error) {
    logger.error('submitContent failed', {
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

export const listContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as {
      type?: ContentType
      status?: ContentStatus
      page?: number
      limit?: number
      from?: Date
      to?: Date
      submittedBy?: string
    }

    const page = q.page ?? 1
    const limit = q.limit ?? 50
    const { items, total } = await contentRepo.findAll({
      type: q.type,
      status: q.status,
      from: q.from,
      to: q.to,
      page,
      limit,
      submittedBy: q.submittedBy,
    })
    res.json({ total, page, limit, items })
  } catch (error) {
    logger.error('listContent failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getContentById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const contentId = req.params['id']
    const [content, moderation] = await Promise.all([
      contentRepo.findById(contentId),
      moderationRepo.findByContentId(contentId),
    ])
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
    res.json({ content, moderation })
  } catch (error) {
    logger.error('getContentById failed', {
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

export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const contentId = req.params['id']
    await contentRepo.softDelete(contentId, req.user.uid)
    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'CONTENT_SOFT_DELETE',
      targetId: contentId,
      targetType: 'content',
    })
    res.json({ success: true, contentId })
  } catch (error) {
    logger.error('deleteContent failed', {
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

export const postFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const contentId = req.params['id']
    const { correctLabel, notes } = req.body as {
      correctLabel: string
      notes?: string
    }
    const feedbackId = `FB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await feedbackRepo.create({
      feedbackId,
      contentId,
      moderatorId: req.user.uid,
      correctLabel,
      notes: notes ?? '',
    })
    await usersRepo.incrementCasesReviewed(req.user.uid)
    res.json({ feedbackId, recorded: true })
  } catch (error) {
    logger.error('postFeedback failed', {
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
