import api from './api'
import type {
  ContentDoc,
  ContentType,
  DecisionType,
  ModerationResult,
  ModerationStats,
  SeverityType,
} from '../types'

export interface QueueItem {
  content: ContentDoc
  moderation: ModerationResult
}

export const fetchQueue = async (params: {
  severity?: SeverityType
  type?: ContentType
  page?: number
  limit?: number
}): Promise<{ total: number; items: QueueItem[] }> => {
  const { data } = await api.get('/v1/moderation/queue', { params })
  return data as { total: number; items: QueueItem[] }
}

export const fetchModeration = async (
  contentId: string
): Promise<ModerationResult> => {
  const { data } = await api.get(`/v1/moderation/${contentId}`)
  return data as ModerationResult
}

export const patchDecision = async (
  contentId: string,
  body: { decision: DecisionType; notes?: string; notifyUser?: boolean }
): Promise<{ contentId: string; finalDecision: DecisionType; updatedAt: string }> => {
  const { data } = await api.patch(`/v1/moderation/${contentId}/decision`, body)
  return data as {
    contentId: string
    finalDecision: DecisionType
    updatedAt: string
  }
}

export const fetchStats = async (): Promise<ModerationStats> => {
  const { data } = await api.get('/v1/moderation/stats')
  return data as ModerationStats
}

export const fetchAnalytics = async (
  range: '7d' | '30d' | 'today'
): Promise<{
  timeSeries: Array<{
    date: string
    submitted: number
    flagged: number
    blocked: number
    allowed: number
  }>
  categoryBreakdown: Array<{ category: string; count: number; percentage: number }>
  severityDistribution: Record<string, number>
}> => {
  const { data } = await api.get('/v1/moderation/analytics', {
    params: { range },
  })
  return data as {
    timeSeries: Array<{
      date: string
      submitted: number
      flagged: number
      blocked: number
      allowed: number
    }>
    categoryBreakdown: Array<{
      category: string
      count: number
      percentage: number
    }>
    severityDistribution: Record<string, number>
  }
}
