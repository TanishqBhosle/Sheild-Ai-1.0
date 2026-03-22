import { useCallback, useState } from 'react'
import {
  createAppeal,
  getAppeal,
  listAppeals,
  resolveAppeal,
} from '../services/appeals.service'
import type { AppealStatus, ResolutionType } from '../types'

export function useAppeals() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const list = useCallback(
    async (params: { status?: AppealStatus; page?: number; limit?: number }) => {
      setLoading(true)
      setError(null)
      try {
        return await listAppeals(params)
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

  const create = useCallback(
    async (body: {
      contentId: string
      reason: string
      notifyUser?: boolean
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await createAppeal(body)
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

  const getOne = useCallback(async (appealId: string) => {
    setLoading(true)
    setError(null)
    try {
      return await getAppeal(appealId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const resolve = useCallback(
    async (
      appealId: string,
      body: {
        resolution: ResolutionType
        responseMessage?: string
        notifyUser?: boolean
      }
    ) => {
      setLoading(true)
      setError(null)
      try {
        return await resolveAppeal(appealId, body)
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

  return { loading, error, list, create, getOne, resolve }
}
