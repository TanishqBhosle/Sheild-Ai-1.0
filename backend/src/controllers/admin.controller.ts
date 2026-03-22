import * as crypto from 'crypto'
import type { Request, Response } from 'express'
import type { Query } from 'firebase-admin/firestore'
import { auth, db, FieldValue } from '../config/firebase'
import { policiesRepo } from '../repositories/policies.repo'
import { moderationRepo } from '../repositories/moderation.repo'
import { auditRepo } from '../repositories/audit.repo'
import { usersRepo } from '../repositories/users.repo'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import type {
  DecisionType,
  ModerationRule,
  PolicyAutomation,
  PolicyThresholds,
  UserRole,
} from '../types'

export const getPolicies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const fallback = await policiesRepo.getDefaultOrFallback()
    const doc = await policiesRepo.getDefault()
    if (!doc) {
      res.json({
        thresholds: fallback.thresholds,
        automation: fallback.automation,
        updatedBy: fallback.updatedBy,
        updatedAt: fallback.updatedAt,
        isDefault: true,
      })
      return
    }
    res.json({ ...doc, isDefault: false })
  } catch (error) {
    logger.error('getPolicies failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const putPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { thresholds, automation } = req.body as {
      thresholds: PolicyThresholds
      automation: PolicyAutomation
    }

    const prev = await policiesRepo.getDefault()

    await policiesRepo.setPolicies(thresholds, automation, req.user.uid)

    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'POLICY_UPDATE',
      targetId: 'default',
      targetType: 'policy',
      previousValue: prev
        ? { thresholds: prev.thresholds, automation: prev.automation }
        : undefined,
      newValue: { thresholds, automation },
    })

    await db.doc('cache/stats').delete().catch(() => undefined)

    const savedAt = new Date().toISOString()
    res.json({
      updated: true,
      savedAt,
      updatedBy: req.user.uid,
    })
  } catch (error) {
    logger.error('putPolicies failed', {
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

export const listRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const isActiveRaw = req.query.isActive as string | undefined
    const isActive =
      isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined
    const rules = await moderationRepo.listRules(isActive)
    res.json({ rules })
  } catch (error) {
    logger.error('listRules failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { name, category, conditions, action, priority } = req.body as {
      name: string
      category: string
      conditions: ModerationRule['conditions']
      action: DecisionType
      priority: number
    }
    const ruleId = `RULE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await moderationRepo.createRule({
      ruleId,
      name,
      category,
      conditions,
      action,
      priority,
      isActive: true,
      createdBy: req.user.uid,
      createdAt: FieldValue.serverTimestamp(),
    })
    const createdAt = new Date().toISOString()
    res.status(201).json({ ruleId, status: 'active', createdAt })
  } catch (error) {
    logger.error('createRule failed', {
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

export const patchRule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const ruleId = req.params['id']
    const body = req.body as Partial<{
      isActive: boolean
      name: string
      conditions: ModerationRule['conditions']
      action: DecisionType
      priority: number
    }>
    const existing = await moderationRepo.findRuleById(ruleId)
    if (!existing) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Rule not found',
        statusCode: 404,
      })
      return
    }
    const patch: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') {
      patch['isActive'] = body.isActive
    }
    if (typeof body.name === 'string') {
      patch['name'] = body.name
    }
    if (body.conditions) {
      patch['conditions'] = body.conditions
    }
    if (body.action) {
      patch['action'] = body.action
    }
    if (typeof body.priority === 'number') {
      patch['priority'] = body.priority
    }
    patch['updatedAt'] = FieldValue.serverTimestamp()
    await moderationRepo.updateRule(ruleId, patch)
    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'RULE_UPDATE',
      targetId: ruleId,
      targetType: 'rule',
      previousValue: { name: existing.name, isActive: existing.isActive },
      newValue: body,
    })
    res.json({ ruleId, updated: true })
  } catch (error) {
    logger.error('patchRule failed', {
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

export const getTeam = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await usersRepo.listTeam()
    res.json({ users })
  } catch (error) {
    logger.error('getTeam failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const inviteTeamMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { email, role } = req.body as { email: string; role: UserRole }

    if (role !== 'moderator' && role !== 'admin') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'role must be moderator or admin',
        statusCode: 400,
      })
      return
    }

    let uid: string
    try {
      const existing = await auth.getUserByEmail(email)
      uid = existing.uid
    } catch {
      const password = crypto.randomBytes(24).toString('base64url')
      const created = await auth.createUser({
        email,
        password,
        emailVerified: false,
      })
      uid = created.uid
    }

    await auth.setCustomUserClaims(uid, { role })
    await usersRepo.updateRole(uid, role)

    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'TEAM_INVITE',
      targetId: uid,
      targetType: 'user',
      newValue: { email, role },
    })

    res.json({ uid, email, role, invited: true })
  } catch (error) {
    logger.error('inviteTeamMember failed', {
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

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as {
      actorId?: string
      action?: string
      targetType?: string
      from?: string
      to?: string
      page?: number
      limit?: number
    }
    const base: Query = db.collection('audit_logs').orderBy('timestamp', 'desc')
    const snap = await base.limit(2000).get()
    const fromDate = q.from ? new Date(q.from).getTime() : null
    const toDate = q.to ? new Date(q.to).getTime() : null

    let rows = snap.docs.map((d) => d.data())
    if (q.actorId) {
      rows = rows.filter((r) => r['actorId'] === q.actorId)
    }
    if (q.action) {
      rows = rows.filter((r) => r['action'] === q.action)
    }
    if (q.targetType) {
      rows = rows.filter((r) => r['targetType'] === q.targetType)
    }
    if (fromDate !== null || toDate !== null) {
      rows = rows.filter((r) => {
        const ts = r['timestamp'] as { toMillis?: () => number } | undefined
        const t = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0
        if (fromDate !== null && t < fromDate) {
          return false
        }
        if (toDate !== null && t > toDate) {
          return false
        }
        return true
      })
    }

    const total = rows.length
    const page = Math.max(1, q.page ?? 1)
    const limit = Math.min(100, q.limit ?? 50)
    const start = (page - 1) * limit
    const items = rows.slice(start, start + limit)
    res.json({ total, items })
  } catch (error) {
    logger.error('listAuditLogs failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}
