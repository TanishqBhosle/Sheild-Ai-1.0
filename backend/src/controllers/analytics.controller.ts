import type { Request, Response } from 'express'
import { db } from '../config/firebase'
import { logger } from '../utils/logger'
import { moderationRepo } from '../repositories/moderation.repo'
import type { ContentDoc } from '../types'

type RangeKey = '7d' | '30d' | 'today'

const startForRange = (range: RangeKey): Date => {
  const d = new Date()
  if (range === 'today') {
    d.setHours(0, 0, 0, 0)
    return d
  }
  const days = range === '7d' ? 7 : 30
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

const dateKey = (d: Date): string => d.toISOString().slice(0, 10)

const parseRange = (raw: unknown): RangeKey => {
  if (raw === '7d' || raw === '30d' || raw === 'today') {
    return raw
  }
  return '7d'
}

const buildAnalyticsPayload = async (range: RangeKey) => {
  const since = startForRange(range)
  const snap = await db
    .collection('content')
    .where('isDeleted', '==', false)
    .where('submittedAt', '>=', since)
    .orderBy('submittedAt', 'asc')
    .limit(2000)
    .get()

  const timeMap = new Map<
    string,
    { submitted: number; flagged: number; blocked: number; allowed: number }
  >()

  for (const doc of snap.docs) {
    const c = doc.data() as ContentDoc
    const ts = c.submittedAt?.toDate?.() ?? new Date()
    const key = dateKey(ts)
    const cur = timeMap.get(key) ?? {
      submitted: 0,
      flagged: 0,
      blocked: 0,
      allowed: 0,
    }
    cur.submitted += 1
    if (c.status === 'flagged') {
      cur.flagged += 1
    }
    if (c.status === 'blocked') {
      cur.blocked += 1
    }
    if (c.status === 'allowed') {
      cur.allowed += 1
    }
    timeMap.set(key, cur)
  }

  const timeSeries = [...timeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      submitted: v.submitted,
      flagged: v.flagged,
      blocked: v.blocked,
      allowed: v.allowed,
    }))

  const modSnap = await db
    .collection('moderation_results')
    .where('createdAt', '>=', since)
    .limit(2000)
    .get()

  const catMap = new Map<string, number>()
  for (const d of modSnap.docs) {
    const cat = String(d.data()['category'] ?? 'Other')
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }
  const catTotal = [...catMap.values()].reduce((a, b) => a + b, 0) || 1
  const categoryBreakdown = [...catMap.entries()].map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / catTotal) * 1000) / 10,
  }))

  const sev: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const d of modSnap.docs) {
    const s = String(d.data()['severity'] ?? 'low')
    if (s in sev) {
      sev[s] += 1
    }
  }

  const severityDistribution = {
    low: sev['low'] ?? 0,
    medium: sev['medium'] ?? 0,
    high: sev['high'] ?? 0,
    critical: sev['critical'] ?? 0,
  }

  return { timeSeries, categoryBreakdown, severityDistribution }
}

export const getModerationAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseRange(req.query['range'])
    const payload = await buildAnalyticsPayload(range)
    res.json(payload)
  } catch (error) {
    logger.error('getModerationAnalytics failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseRange(req.query['range'])
    const since = startForRange(range)
    const stats = await moderationRepo.getStats(since)

    const appealsSnap = await db
      .collection('appeals')
      .where('submittedAt', '>=', since)
      .count()
      .get()

    const { timeSeries, categoryBreakdown, severityDistribution } =
      await buildAnalyticsPayload(range)

    res.json({
      range,
      stats: {
        ...stats,
        appealsInRange: appealsSnap.data().count,
      },
      summary: {
        timeSeriesPoints: timeSeries.length,
        topCategory: categoryBreakdown[0]?.category ?? 'N/A',
        severityDistribution,
      },
    })
  } catch (error) {
    logger.error('getOverview failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getTimeseries = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseRange(req.query['range'])
    const { timeSeries } = await buildAnalyticsPayload(range)
    res.json({ range, timeSeries })
  } catch (error) {
    logger.error('getTimeseries failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseRange(req.query['range'])
    const { categoryBreakdown } = await buildAnalyticsPayload(range)
    res.json({ range, categoryBreakdown })
  } catch (error) {
    logger.error('getCategories failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

