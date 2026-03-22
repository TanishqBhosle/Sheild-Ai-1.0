import api from './api'
import type { UserDoc, UserRole } from '../types'

export const fetchMe = async (): Promise<UserDoc> => {
  const { data } = await api.get<UserDoc>('/v1/auth/me')
  return data
}

export const setUserRole = async (
  targetUid: string,
  role: UserRole
): Promise<{ success: boolean; uid: string; role: string }> => {
  const { data } = await api.post('/v1/auth/set-role', { targetUid, role })
  return data as { success: boolean; uid: string; role: string }
}
