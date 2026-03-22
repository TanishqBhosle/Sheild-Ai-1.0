import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { firebaseDb } from '../config/firebase'
import {
  fetchAnalytics,
  fetchQueue,
  fetchStats,
  patchDecision,
} from '../services/moderation.service'
import type { ContentDoc, DecisionType, SeverityType } from '../types'
import type { ContentType } from '../types'

export function useModeration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveFlagged, setLiveFlagged] = useState<ContentDoc[]>([])

  useEffect(() => {
    let unsub: Unsubscribe | undefined
    try {
      const q = query(
        collection(firebaseDb, 'content'),
        where('status', '==', 'flagged'),
        where('isDeleted', '==', false),
        orderBy('submittedAt', 'desc')
      )
      unsub = onSnapshot(
        q,
        (snap) => {
          setLiveFlagged(snap.docs.map((d) => d.data() as ContentDoc))
        },
        () => {
          setLiveFlagged([])
        }
      )
    } catch {
      setLiveFlagged([])
    }
    return () => {
      unsub?.()
    }
  }, [])

  const loadQueue = useCallback(
    async (params: {
      severity?: SeverityType
      type?: ContentType
      page?: number
      limit?: number
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await fetchQueue(params)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Queue failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const stats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await fetchStats()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stats failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const analytics = useCallback(async (range: '7d' | '30d' | 'today') => {
    setLoading(true)
    setError(null)
    try {
      return await fetchAnalytics(range)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analytics failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const decide = useCallback(
    async (
      contentId: string,
      body: { decision: DecisionType; notes?: string; notifyUser?: boolean }
    ) => {
      setLoading(true)
      setError(null)
      try {
        return await patchDecision(contentId, body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Decision failed'
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
    liveFlagged,
    loadQueue,
    stats,
    analytics,
    decide,
  }
}
