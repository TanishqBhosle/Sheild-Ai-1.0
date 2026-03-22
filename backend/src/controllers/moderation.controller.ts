import type { Request, Response } from 'express'
import type { Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore'
import { db, FieldValue } from '../config/firebase'
import { moderationRepo } from '../repositories/moderation.repo'
import { contentRepo } from '../repositories/content.repo'
import { auditRepo } from '../repositories/audit.repo'
import { usersRepo } from '../repositories/users.repo'
import { notifyUserEvent } from '../services/notification.service'
import { DECISION_TYPES, CACHE_TTL } from '../config/constants'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import type { DecisionType, ContentStatus, SeverityType } from '../types'

const decisionToStatus = (d: DecisionType): ContentStatus => {
  const map: Record<DecisionType, ContentStatus> = {
    allow: 'allowed',
    flag: 'flagged',
    block: 'blocked',
    escalated: 'flagged',
  }
  return map[d]
}

export const getQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as {
      severity?: SeverityType
      type?: string
      page?: number
      limit?: number
    }
    const page = q.page ?? 1
    const limit = q.limit ?? 50
    const { items, total } = await moderationRepo.getQueue({
      severity: q.severity,
      type: q.type as import('../types').ContentType | undefined,
      page,
      limit,
    })
    res.json({ total, items })
  } catch (error) {
    logger.error('getQueue failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getModerationByContentId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const contentId = req.params['id']
    const mod = await moderationRepo.findByContentId(contentId)
    if (!mod) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Moderation result not found',
        statusCode: 404,
      })
      return
    }
    res.json(mod)
  } catch (error) {
    logger.error('getModerationByContentId failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const patchDecision = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const contentId = req.params['id']
    const { decision, notes, notifyUser } = req.body as {
      decision: DecisionType
      notes?: string
      notifyUser?: boolean
    }

    if (!DECISION_TYPES.includes(decision)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid decision',
        statusCode: 400,
      })
      return
    }

    const current = await moderationRepo.findByContentId(contentId)
    if (!current) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Moderation result not found',
        statusCode: 404,
      })
      return
    }

    const isOverride = decision !== current.aiDecision
    await moderationRepo.updateDecision(contentId, {
      finalDecision: decision,
      reviewedBy: req.user.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      notes: notes ?? null,
      isOverride,
    })

    const newStatus = decisionToStatus(decision)
    await contentRepo.updateStatus(contentId, newStatus)

    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'MODERATION_DECISION',
      targetId: contentId,
      targetType: 'content',
      previousValue: { finalDecision: current.finalDecision },
      newValue: { finalDecision: decision, isOverride },
    })

    await usersRepo.incrementCasesReviewed(req.user.uid)

    if (notifyUser) {
      const content = await contentRepo.findById(contentId)
      if (content) {
        notifyUserEvent({
          userId: content.submittedBy,
          contentId,
          decision,
          message: notes,
        })
      }
    }

    const updatedAt = new Date().toISOString()
    res.json({ contentId, finalDecision: decision, updatedAt })
  } catch (error) {
    logger.error('patchDecision failed', {
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

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheRef = db.doc('cache/stats')
    const cacheSnap = await cacheRef.get()
    const now = Date.now()
    if (cacheSnap.exists) {
      const data = cacheSnap.data() as {
        expiresAt?: number
        payload?: Record<string, number>
      }
      if (typeof data.expiresAt === 'number' && data.expiresAt > now && data.payload) {
        res.json(data.payload)
        return
      }
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const stats = await moderationRepo.getStats(start)

    const appealsResolved = await db
      .collection('appeals')
      .where('status', 'in', ['overturned', 'upheld'])
      .count()
      .get()
    const totalAppealOutcomes = appealsResolved.data().count

    const overturned = await db
      .collection('appeals')
      .where('status', '==', 'overturned')
      .count()
      .get()
    const overturnedCount = overturned.data().count

    const appealSuccessRate =
      totalAppealOutcomes > 0 ? overturnedCount / totalAppealOutcomes : 0

    const modelAccuracy =
      stats.reviewed > 0
        ? Math.max(0, Math.min(1, 1 - stats.overrides / stats.reviewed))
        : 0.85

    const falsePositiveRate =
      stats.reviewed > 0 ? stats.overrides / stats.reviewed : 0

    const overrideRate =
      stats.reviewed > 0 ? stats.overrides / stats.reviewed : 0

    const resultsForTime = await db
      .collection('moderation_results')
      .where('createdAt', '>=', start)
      .limit(200)
      .get()

    let reviewMs = 0
    let reviewN = 0
    for (const d of resultsForTime.docs) {
      const m = d.data()
      const cAt = m['createdAt'] as FirestoreTimestamp | undefined
      const rAt = m['reviewedAt'] as FirestoreTimestamp | undefined
      if (cAt && rAt && typeof cAt.toMillis === 'function' && typeof rAt.toMillis === 'function') {
        const delta = rAt.toMillis() - cAt.toMillis()
        if (delta > 0) {
          reviewMs += delta
          reviewN += 1
        }
      }
    }
    const avgReviewTimeMin =
      reviewN > 0 ? reviewMs / reviewN / 60000 : 0

    const payload = {
      totalToday: stats.totalToday,
      pendingReview: stats.pendingReview,
      autoBlocked: stats.autoBlocked,
      modelAccuracy,
      avgLatencyMs: stats.avgLatencyMs,
      falsePositiveRate,
      appealSuccessRate,
      avgReviewTimeMin,
      overrideRate,
    }

    await cacheRef.set({
      expiresAt: now + CACHE_TTL.STATS,
      payload,
    })

    res.json(payload)
  } catch (error) {
    logger.error('getStats failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}
