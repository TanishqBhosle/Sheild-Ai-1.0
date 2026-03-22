import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Shield, Clock, Ban, Zap } from 'lucide-react'
import { useModeration } from '../hooks/useModeration'
import type { ModerationStats } from '../types'
import { StatCard } from '../components/features/StatCard'
import { ActivityLineChart } from '../components/charts/ActivityLineChart'
import { CategoryDonutChart } from '../components/charts/CategoryDonutChart'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { ROUTES } from '../constants'

export default function DashboardPage() {
  const { role } = useAuth()
  const { stats, analytics } = useModeration()
  const nav = useNavigate()
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today')
  const [s, setS] = useState<ModerationStats | null>(null)
  const [series, setSeries] = useState<
    Array<{ date: string; submitted: number; flagged: number; blocked: number }>
  >([])
  const [cats, setCats] = useState<Array<{ category: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const [st, an] = await Promise.all([stats(), analytics(range)])
        if (cancelled) {
          return
        }
        setS(st)
        setSeries(an.timeSeries)
        setCats(an.categoryBreakdown.map((c) => ({ category: c.category, count: c.count })))
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Failed to load')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [range, stats, analytics])

  if (err) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">{err}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (role === 'user') {
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-ink-muted">
          Submit content for AI moderation or review your appeals.
        </p>
        <Link
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          to={ROUTES.submit}
        >
          Go to Submit
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="flex gap-2">
          {(['today', '7d', '30d'] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'primary' : 'secondary'}
              type="button"
              onClick={() => setRange(r)}
            >
              {r === 'today' ? 'Today' : r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      {loading || !s ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total today" value={s.totalToday} icon={<Shield className="h-5 w-5" />} />
          <StatCard
            label="Pending review"
            value={s.pendingReview}
            icon={<Clock className="h-5 w-5" />}
            onClick={() => nav(ROUTES.queue)}
          />
          <StatCard label="Auto blocked" value={s.autoBlocked} icon={<Ban className="h-5 w-5" />} />
          <StatCard
            label="Model accuracy %"
            value={Math.round(s.modelAccuracy * 100)}
            icon={<Zap className="h-5 w-5" />}
          />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <CardSection title="Activity" className="lg:col-span-3">
          {loading ? <Skeleton className="h-64" /> : <ActivityLineChart data={series} />}
        </CardSection>
        <CardSection title="Categories" className="lg:col-span-2">
          {loading ? <Skeleton className="h-64" /> : <CategoryDonutChart data={cats} />}
        </CardSection>
      </div>
    </motion.div>
  )
}

function CardSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-[#27272a] bg-[#111113] p-4 ${className ?? ''}`}>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">{title}</h2>
      {children}
    </div>
  )
}
