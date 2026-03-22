import api from './api'
import type { ContentDoc, ContentStatus, ContentType } from '../types'
import type { ModerationResult } from '../types'

export const submitContent = async (body: {
  type: ContentType
  payload?: string
  storageRef?: string
}): Promise<{ contentId: string; status: string; estimatedMs: number }> => {
  const { data } = await api.post('/v1/content', body)
  return data as { contentId: string; status: string; estimatedMs: number }
}

export const listContent = async (params: {
  type?: ContentType
  status?: ContentStatus
  page?: number
  limit?: number
  from?: string
  to?: string
}): Promise<{ total: number; page: number; limit: number; items: ContentDoc[] }> => {
  const { data } = await api.get('/v1/content', { params })
  return data as {
    total: number
    page: number
    limit: number
    items: ContentDoc[]
  }
}

export const getContentDetail = async (
  contentId: string
): Promise<{ content: ContentDoc; moderation: ModerationResult | null }> => {
  const { data } = await api.get(`/v1/content/${contentId}`)
  return data as { content: ContentDoc; moderation: ModerationResult | null }
}

export const deleteContent = async (
  contentId: string
): Promise<{ success: boolean; contentId: string }> => {
  const { data } = await api.delete(`/v1/content/${contentId}`)
  return data as { success: boolean; contentId: string }
}

export const postFeedback = async (
  contentId: string,
  body: { correctLabel: string; notes?: string }
): Promise<{ feedbackId: string; recorded: boolean }> => {
  const { data } = await api.post(`/v1/content/${contentId}/feedback`, body)
  return data as { feedbackId: string; recorded: boolean }
}
