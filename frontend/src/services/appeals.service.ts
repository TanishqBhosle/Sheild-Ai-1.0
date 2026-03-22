import api from './api'
import type { AppealDoc, AppealStatus, ResolutionType } from '../types'

export const createAppeal = async (body: {
  contentId: string
  reason: string
  notifyUser?: boolean
}): Promise<{ appealId: string; status: AppealStatus; submittedAt: string }> => {
  const { data } = await api.post('/v1/appeals', body)
  return data as { appealId: string; status: AppealStatus; submittedAt: string }
}

export const listAppeals = async (params: {
  status?: AppealStatus
  page?: number
  limit?: number
}): Promise<{ total: number; items: AppealDoc[] }> => {
  const { data } = await api.get('/v1/appeals', { params })
  return data as { total: number; items: AppealDoc[] }
}

export const getAppeal = async (appealId: string): Promise<AppealDoc> => {
  const { data } = await api.get(`/v1/appeals/${appealId}`)
  return data as AppealDoc
}

export const resolveAppeal = async (
  appealId: string,
  body: {
    resolution: ResolutionType
    responseMessage?: string
    notifyUser?: boolean
  }
): Promise<{
  appealId: string
  resolution: ResolutionType
  newDecision: import('../types').DecisionType | null
}> => {
  const { data } = await api.patch(`/v1/appeals/${appealId}/resolve`, body)
  return data as {
    appealId: string
    resolution: ResolutionType
    newDecision: import('../types').DecisionType | null
  }
}
