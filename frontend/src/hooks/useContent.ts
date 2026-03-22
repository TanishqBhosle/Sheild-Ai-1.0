import { useCallback, useState } from 'react'
import {
  getContentDetail,
  listContent,
  submitContent,
} from '../services/content.service'
import type { ContentStatus, ContentType } from '../types'

export function useContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const list = useCallback(
    async (params: {
      type?: ContentType
      status?: ContentStatus
      page?: number
      limit?: number
      from?: string
      to?: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await listContent(params)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load content'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const detail = useCallback(async (contentId: string) => {
    setLoading(true)
    setError(null)
    try {
      return await getContentDetail(contentId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const submit = useCallback(
    async (body: {
      type: ContentType
      payload?: string
      storageRef?: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        return await submitContent(body)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Submit failed'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { loading, error, list, detail, submit }
}
