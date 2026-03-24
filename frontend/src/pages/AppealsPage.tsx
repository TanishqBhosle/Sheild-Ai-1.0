import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { fbDb } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { useAppeals } from '../hooks/useAppeals'
import type { AppealDoc, AppealStatus, ResolutionType } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Select } from '../components/ui/Select'

export default function AppealsPage() {
  const { user, role } = useAuth()
  const { list, resolve, loading, error } = useAppeals()
  const [items, setItems] = useState<AppealDoc[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const staff = role === 'moderator' || role === 'admin'

  const loadStaff = useCallback(async () => {
    const r = await list({ limit: 50 })
    setItems(r.items)
  }, [list])

  useEffect(() => {
    if (staff) {
      void loadStaff().catch(() => undefined)
      return undefined
    }
    if (!user) {
      return undefined
    }
    const q = query(
      collection(fbDb, 'appeals'),
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    )
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as AppealDoc))
    })
  }, [staff, user, loadStaff])

  const counts = items.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<AppealStatus, number>
  )

  const onResolve = async (id: string, resolution: ResolutionType) => {
    try {
      await resolve(id, { resolution })
      toast.success('Resolved')
      await loadStaff()
    } catch {
      toast.error('Failed')
    }
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-400">{error}</p>
        <Button onClick={() => void loadStaff()}>Retry</Button>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-xl font-semibold">Appeals</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            'pending',
            'under_review',
            'overturned',
            'upheld',
          ] as AppealStatus[]
        ).map((s) => (
          <Card key={s} className="text-center">
            <p className="text-xs text-ink-muted capitalize">{s.replace('_', ' ')}</p>
            <p className="text-2xl font-semibold">{counts[s] ?? 0}</p>
          </Card>
        ))}
      </div>
      {staff && loading && items.length === 0 ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.appealId} className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() =>
                  setOpen((o) => (o === a.appealId ? null : a.appealId))
                }
              >
                <span className="font-mono text-xs text-ink-muted">{a.appealId}</span>
                <span className="text-xs capitalize">{a.status}</span>
              </button>
              {open === a.appealId ? (
                <div className="space-y-2 border-t border-[#27272a] pt-2 text-sm text-ink-muted">
                  <p>{a.reason}</p>
                  {staff ? (
                    <div className="flex flex-wrap gap-2">
                      <Select
                        onChange={(e) =>
                          void onResolve(
                            a.appealId,
                            e.target.value as ResolutionType
                          )
                        }
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Resolve…
                        </option>
                        <option value="overturned">Overturn</option>
                        <option value="upheld">Uphold</option>
                        <option value="info_requested">Info requested</option>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
