import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import * as functionsV1 from 'firebase-functions/v1'
import type { UserRecord } from 'firebase-admin/auth'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import app from './app'
import { FieldValue, auth } from './config/firebase'
import { analyzeContent } from './services/gemini.service'
import { evaluateDecision } from './services/decision.service'
import { contentRepo } from './repositories/content.repo'
import { moderationRepo } from './repositories/moderation.repo'
import { policiesRepo } from './repositories/policies.repo'
import { auditRepo } from './repositories/audit.repo'
import { usersRepo } from './repositories/users.repo'
import { logger } from './utils/logger'
import { DEFAULT_THRESHOLDS, REGION } from './config/constants'
import type { ContentDoc, UserDoc } from './types'

const SECRETS = ['GEMINI_API_KEY']
const FUNCTION_OPTS = { region: REGION, memory: '512MiB' as const }

export const api = onRequest(
  { ...FUNCTION_OPTS, secrets: SECRETS, timeoutSeconds: 60, minInstances: 0 },
  app
)

export const onUserCreated = functionsV1
  .region(REGION)
  .auth.user()
  .onCreate(async (user: UserRecord) => {
    const doc: UserDoc = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      role: 'user',
      provider: user.providerData?.[0]?.providerId ?? 'password',
      createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      isActive: true,
      casesReviewed: 0,
    }
    try {
      await usersRepo.create(doc)
      logger.info('User doc created', { uid: user.uid })
    } catch (err) {
      logger.error('Failed to create user doc', {
        uid: user.uid,
        error: (err as Error).message,
      })
    }
  })

export const onContentCreated = onDocumentCreated(
  {
    document: 'content/{contentId}',
    region: REGION,
    secrets: SECRETS,
    timeoutSeconds: 120,
    memory: '512MiB',
    retry: false,
  },
  async (event) => {
    const contentId = event.params.contentId
    const data = event.data?.data() as ContentDoc | undefined

    if (!data) {
      logger.warn('onContentCreated: snapshot data missing', { contentId })
      return
    }

    logger.info('Starting analysis', { contentId, type: data.type })

    try {
      const [policy, rules] = await Promise.all([
        policiesRepo.getDefault(),
        moderationRepo.getActiveRules(),
      ])

      const thresholds = policy?.thresholds ?? DEFAULT_THRESHOLDS
      const automation = policy?.automation ?? {
        autoBlockCritical: true,
        humanReviewMediumPlus: true,
        learningMode: false,
      }

      const contentToAnalyze = data.payload ?? data.storageRef ?? ''
      const geminiResult = await analyzeContent(contentToAnalyze, data.type, data.submittedBy)
      const decision = evaluateDecision(geminiResult, thresholds, rules, automation)

      const resultId = `${contentId}_result`

      await moderationRepo.create({
        resultId,
        contentId,
        aiDecision: decision.action,
        finalDecision: decision.requiresHumanReview ? null : decision.action,
        severity: decision.severity,
        confidence: geminiResult.confidence,
        scores: geminiResult.scores,
        category: geminiResult.category,
        reasoning: geminiResult.reasoning,
        model: 'gemini-1.5-flash',
        latencyMs: geminiResult.latencyMs,
        reviewedBy: decision.requiresHumanReview ? null : 'AI_AUTO',
        reviewedAt: decision.requiresHumanReview
          ? null
          : FieldValue.serverTimestamp(),
        notes: null,
        isOverride: false,
        createdAt: FieldValue.serverTimestamp(),
      })

      const statusMap = {
        allow: 'allowed',
        flag: 'flagged',
        block: 'blocked',
        escalated: 'flagged',
      } as const

      await contentRepo.updateStatus(contentId, statusMap[decision.action])

      logger.info('Analysis complete', {
        contentId,
        decision: decision.action,
        severity: decision.severity,
      })
    } catch (err) {
      logger.error('Analysis failed — flagging for human review', {
        contentId,
        error: (err as Error).message,
      })

      await contentRepo.updateStatus(contentId, 'flagged')
      try {
        await moderationRepo.create({
          resultId: `${contentId}_result`,
          contentId,
          aiDecision: 'flag',
          finalDecision: null,
          severity: 'medium',
          confidence: 0,
          scores: {
            toxicity: 0,
            harassment: 0,
            spam: 0,
            violence: 0,
            nsfw: 0,
            hateSpeech: 0,
          },
          category: 'Other',
          reasoning: 'AI analysis failed. Flagged for human review.',
          model: 'gemini-1.5-flash',
          latencyMs: 0,
          reviewedBy: null,
          reviewedAt: null,
          notes: 'Auto-flagged due to AI error.',
          isOverride: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch {
        /* best effort */
      }
    }
  }
)

export const setUserRole = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required')
  }

  const callerRole = request.auth.token['role'] as string | undefined
  const raw = request.data as { targetUid?: string; role?: string }
  const targetUid = raw.targetUid
  const role = raw.role

  if (!targetUid || !role) {
    throw new HttpsError('invalid-argument', 'targetUid and role are required')
  }

  const validRoles = ['user', 'moderator', 'admin']
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role: ${role}`)
  }

  if (callerRole !== 'admin') {
    const list = await usersRepo.listTeam(1)
    const isAdminPresent = list.some(u => u.role === 'admin')
    if (isAdminPresent) {
      throw new HttpsError('permission-denied', 'Not authorized')
    }
    // Only allow bootstrapping if explicitly enabled in environment
    if (process.env.ENABLE_ADMIN_BOOTSTRAP !== 'true') {
      throw new HttpsError(
        'permission-denied',
        'Initial admin setup is disabled. Set ENABLE_ADMIN_BOOTSTRAP=true to enable.'
      )
    }
    logger.warn('New admin bootstrap bypass used', { uid: request.auth.uid })
  }

  await auth.setCustomUserClaims(targetUid, { role })
  await usersRepo.updateRole(targetUid, role as any)

  await auditRepo.writeLog({
    actorId: request.auth.uid,
    action: 'SET_USER_ROLE',
    targetId: targetUid,
    targetType: 'user',
    newValue: { role },
  })

  return { success: true, uid: targetUid, role }
})
