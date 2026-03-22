import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAnalytics } from '../hooks/useAnalytics'
import type { ModerationStats } from '../types'
import { StackedBarChart } from '../components/charts/StackedBarChart'
import { SeverityBarChart } from '../components/charts/SeverityBarChart'
import { SparklineChart } from '../components/charts/SparklineChart'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'

export default function AnalyticsPage() {
  const { loadStats, loadSeries } = useAnalytics()
  const [range, setRange] = useState<'7d' | '30d' | 'today'>('7d')
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [series, setSeries] = useState<
    Array<{ date: string; submitted: number; flagged: number; blocked: number }>
  >([])
  const [sev, setSev] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const [st, an] = await Promise.all([loadStats(), loadSeries(range)])
        if (c) {
          return
        }
        setStats(st)
        setSeries(an.timeSeries)
        setSev(an.severityDistribution)
      } finally {
        if (!c) {
          setLoading(false)
        }
      }
    })()
    return () => {
      c = true
    }
  }, [range, loadStats, loadSeries])

  const spark = (n: number) =>
    Array.from({ length: 8 }, (_, i) => ({ x: String(i), y: Math.max(0, n - i) }))

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex gap-2">
          {(['today', '7d', '30d'] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'primary' : 'secondary'}
              type="button"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>
      {loading || !stats ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Total today', stats.totalToday],
            ['Pending', stats.pendingReview],
            ['Latency ms', stats.avgLatencyMs],
            ['Overrides %', Math.round(stats.overrideRate * 100)],
          ].map(([label, val]) => (
            <Card key={String(label)}>
              <p className="text-xs text-ink-muted">{label}</p>
              <p className="text-2xl font-semibold">{val as number}</p>
              <SparklineChart data={spark(Number(val))} />
            </Card>
          ))}
        </div>
      )}
      <Card>
        <h2 className="mb-2 text-sm text-ink-muted">7-day stack</h2>
        {loading ? <Skeleton className="h-64" /> : <StackedBarChart data={series} />}
      </Card>
      <Card>
        <h2 className="mb-2 text-sm text-ink-muted">Severity</h2>
        {loading ? (
          <Skeleton className="h-56" />
        ) : (
          <SeverityBarChart
            data={Object.entries(sev).map(([name, value]) => ({ name, value }))}
          />
        )}
      </Card>
    </motion.div>
  )
}
