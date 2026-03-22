import { useCallback, useState } from 'react'
import { fetchAnalytics, fetchStats } from '../services/moderation.service'

export function useAnalytics() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await fetchStats()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSeries = useCallback(async (range: '7d' | '30d' | 'today') => {
    setLoading(true)
    setError(null)
    try {
      return await fetchAnalytics(range)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, loadStats, loadSeries }
}
