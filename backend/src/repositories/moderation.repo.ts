import type * as admin from 'firebase-admin'
import type { Query } from 'firebase-admin/firestore'
import { db } from '../config/firebase'
import type {
  DecisionType,
  ModerationResult,
  ModerationRule,
  SeverityType,
} from '../types'
import { LIMITS, SEVERITY_ORDER } from '../config/constants'
import type { ContentDoc } from '../types'

const RESULTS = 'moderation_results'
const RULES = 'moderation_rules'

const severityRank = (s: SeverityType): number =>
  SEVERITY_ORDER.indexOf(s)

export interface QueueFilters {
  severity?: SeverityType
  type?: ContentDoc['type']
  page?: number
  limit?: number
}

export const moderationRepo = {
  async create(
    data: Omit<ModerationResult, 'createdAt' | 'reviewedAt'> & {
      createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp
      reviewedAt:
        | admin.firestore.FieldValue
        | admin.firestore.Timestamp
        | null
    }
  ): Promise<void> {
    await db.collection(RESULTS).doc(data.resultId).set(data)
  },

  async findByContentId(contentId: string): Promise<ModerationResult | null> {
    const snap = await db
      .collection(RESULTS)
      .where('contentId', '==', contentId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    if (snap.empty) {
      return null
    }
    return snap.docs[0].data() as ModerationResult
  },

  async getQueue(filters: QueueFilters): Promise<{
    items: Array<{ content: ContentDoc; moderation: ModerationResult }>
    total: number
  }> {
    let q: Query = db
      .collection(RESULTS)
      .where('finalDecision', '==', null) as Query
    q = q.orderBy('createdAt', 'asc')

    const allSnap = await q.limit(500).get()
    let pairs: Array<{ content: ContentDoc; moderation: ModerationResult }> = []

    for (const doc of allSnap.docs) {
      const moderation = doc.data() as ModerationResult
      const contentSnap = await db
        .collection('content')
        .doc(moderation.contentId)
        .get()
      if (!contentSnap.exists) {
        continue
      }
      const content = contentSnap.data() as ContentDoc
      if (content.isDeleted || content.status !== 'flagged') {
        continue
      }
      if (filters.severity && moderation.severity !== filters.severity) {
        continue
      }
      if (filters.type && content.type !== filters.type) {
        continue
      }
      pairs.push({ content, moderation })
    }

    pairs.sort(
      (a, b) =>
        severityRank(b.moderation.severity) - severityRank(a.moderation.severity)
    )

    const total = pairs.length
    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.min(100, filters.limit ?? 20)
    const start = (page - 1) * limit
    pairs = pairs.slice(start, start + limit)

    return { items: pairs, total }
  },

  async updateDecision(
    contentId: string,
    patch: {
      finalDecision: DecisionType
      reviewedBy: string
      reviewedAt: admin.firestore.FieldValue
      notes: string | null
      isOverride: boolean
    }
  ): Promise<void> {
    const snap = await db
      .collection(RESULTS)
      .where('contentId', '==', contentId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    if (snap.empty) {
      return
    }
    await snap.docs[0].ref.update(patch)
  },

  async getActiveRules(): Promise<ModerationRule[]> {
    const snap = await db
      .collection(RULES)
      .where('isActive', '==', true)
      .orderBy('priority', 'asc')
      .get()
    return snap.docs.map((d) => d.data() as ModerationRule)
  },

  async getStats(since: Date): Promise<{
    totalToday: number
    pendingReview: number
    autoBlocked: number
    avgLatencyMs: number
    overrides: number
    reviewed: number
  }> {
    const contentSnap = await db
      .collection('content')
      .where('submittedAt', '>=', since)
      .where('isDeleted', '==', false)
      .count()
      .get()
    const totalToday = contentSnap.data().count

    const pendingSnap = await db
      .collection('moderation_results')
      .where('finalDecision', '==', null)
      .count()
      .get()
    const pendingReview = pendingSnap.data().count

    const blockedSnap = await db
      .collection('content')
      .where('status', '==', 'blocked')
      .where('isDeleted', '==', false)
      .count()
      .get()
    const autoBlocked = blockedSnap.data().count

    const resultsSnap = await db
      .collection('moderation_results')
      .where('createdAt', '>=', since)
      .limit(LIMITS.MAX_PAGE_SIZE)
      .get()

    let latencySum = 0
    let latencyN = 0
    let overrides = 0
    let reviewed = 0
    for (const d of resultsSnap.docs) {
      const m = d.data() as ModerationResult
      if (typeof m.latencyMs === 'number' && m.latencyMs > 0) {
        latencySum += m.latencyMs
        latencyN += 1
      }
      if (m.isOverride) {
        overrides += 1
      }
      if (m.reviewedBy && m.reviewedBy !== 'AI_AUTO') {
        reviewed += 1
      }
    }

    const avgLatencyMs = latencyN > 0 ? Math.round(latencySum / latencyN) : 0

    return {
      totalToday,
      pendingReview,
      autoBlocked,
      avgLatencyMs,
      overrides,
      reviewed,
    }
  },

  async createRule(
    rule: Omit<ModerationRule, 'createdAt'> & {
      createdAt: admin.firestore.FieldValue
    }
  ): Promise<void> {
    await db.collection(RULES).doc(rule.ruleId).set(rule)
  },

  async updateRule(
    ruleId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    await db.collection(RULES).doc(ruleId).update(patch)
  },

  async findRuleById(ruleId: string): Promise<ModerationRule | null> {
    const snap = await db.collection(RULES).doc(ruleId).get()
    if (!snap.exists) {
      return null
    }
    return snap.data() as ModerationRule
  },

  async listRules(isActive?: boolean): Promise<ModerationRule[]> {
    let q: Query = db.collection(RULES) as Query
    if (typeof isActive === 'boolean') {
      q = q.where('isActive', '==', isActive)
    }
    const snap = await q.orderBy('priority', 'asc').get()
    return snap.docs.map((d) => d.data() as ModerationRule)
  },
}
