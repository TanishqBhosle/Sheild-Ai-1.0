import api from './api'
import type {
  DecisionType,
  ModerationRule,
  PolicyDoc,
  UserDoc,
  UserRole,
} from '../types'

export const getPolicies = async (): Promise<PolicyDoc> => {
  const { data } = await api.get<PolicyDoc>('/v1/admin/policies')
  return data
}

export const putPolicies = async (
  body: Pick<PolicyDoc, 'thresholds' | 'automation'>
): Promise<{
  updated: boolean
  savedAt: string
  updatedBy: string
}> => {
  const { data } = await api.put('/v1/admin/policies', body)
  return data as { updated: boolean; savedAt: string; updatedBy: string }
}

export const listRules = async (
  isActive?: boolean
): Promise<{ rules: ModerationRule[] }> => {
  const { data } = await api.get('/v1/admin/rules', {
    params: { isActive: isActive === undefined ? undefined : String(isActive) },
  })
  return data as { rules: ModerationRule[] }
}

export const createRule = async (body: {
  name: string
  category: string
  conditions: ModerationRule['conditions']
  action: DecisionType
  priority: number
}): Promise<{ ruleId: string; status: string; createdAt: string }> => {
  const { data } = await api.post('/v1/admin/rules', body)
  return data as { ruleId: string; status: string; createdAt: string }
}

export const patchRule = async (
  ruleId: string,
  body: Partial<{
    isActive: boolean
    name: string
    conditions: ModerationRule['conditions']
    action: DecisionType
    priority: number
  }>
): Promise<{ ruleId: string; updated: boolean }> => {
  const { data } = await api.patch(`/v1/admin/rules/${ruleId}`, body)
  return data as { ruleId: string; updated: boolean }
}

export const getTeam = async (): Promise<{ users: UserDoc[] }> => {
  const { data } = await api.get('/v1/admin/team')
  return data as { users: UserDoc[] }
}

export const inviteTeam = async (body: {
  email: string
  role: Extract<UserRole, 'moderator' | 'admin'>
}): Promise<{ uid: string; email: string; role: string; invited: boolean }> => {
  const { data } = await api.post('/v1/admin/team/invite', body)
  return data as {
    uid: string
    email: string
    role: string
    invited: boolean
  }
}

export const listAuditLogs = async (params: {
  actorId?: string
  action?: string
  targetType?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<{ total: number; items: Record<string, unknown>[] }> => {
  const { data } = await api.get('/v1/analytics/audit-logs', { params })
  return data as { total: number; items: Record<string, unknown>[] }
}
