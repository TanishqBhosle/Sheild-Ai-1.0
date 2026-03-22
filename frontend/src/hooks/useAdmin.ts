import { useCallback, useState } from 'react'
import {
  createRule,
  getPolicies,
  getTeam,
  inviteTeam,
  listRules,
  patchRule,
  putPolicies,
} from '../services/admin.service'
import type { DecisionType, ModerationRule, PolicyDoc, UserRole } from '../types'

export function useAdmin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const policiesGet = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await getPolicies()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const policiesSave = useCallback(
    async (body: Pick<PolicyDoc, 'thresholds' | 'automation'>) => {
      setLoading(true)
      setError(null)
      try {
        return await putPolicies(body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const rulesList = useCallback(async (isActive?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      return await listRules(isActive)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const ruleCreate = useCallback(
    async (body: {
      name: string
      category: string
      conditions: ModerationRule['conditions']
      action: DecisionType
      priority: number
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await createRule(body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const rulePatch = useCallback(
    async (
      ruleId: string,
      body: Partial<{
        isActive: boolean
        name: string
        conditions: ModerationRule['conditions']
        action: DecisionType
        priority: number
      }>
    ) => {
      setLoading(true)
      setError(null)
      try {
        return await patchRule(ruleId, body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const team = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await getTeam()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const invite = useCallback(
    async (body: {
      email: string
      role: Extract<UserRole, 'moderator' | 'admin'>
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await inviteTeam(body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    policiesGet,
    policiesSave,
    rulesList,
    ruleCreate,
    rulePatch,
    team,
    invite,
  }
}
