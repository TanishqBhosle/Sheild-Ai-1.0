import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDebounce } from '../hooks/useDebounce'
import { useContent } from '../hooks/useContent'
import type { ContentDoc } from '../types'
import { Input } from '../components/ui/Input'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'

export default function HistoryPage() {
  const { list, loading, error } = useContent()
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ContentDoc[]>([])
  const [total, setTotal] = useState(0)
  const limit = 50

  useEffect(() => {
    void (async () => {
      try {
        const r = await list({ page, limit })
        const filtered = debounced
          ? r.items.filter(
              (i) =>
                i.contentId.toLowerCase().includes(debounced.toLowerCase()) ||
                (i.payload?.toLowerCase().includes(debounced.toLowerCase()) ?? false)
            )
          : r.items
        setRows(filtered)
        setTotal(debounced ? filtered.length : r.total)
      } catch {
        setRows([])
      }
    })()
  }, [page, debounced, list])

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-xl font-semibold">History</h1>
      <Input placeholder="Search ID or text…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#27272a]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#27272a] text-ink-muted">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contentId} className="h-12 border-b border-[#27272a]/60">
                  <td className="p-3 font-mono text-xs">{r.contentId}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / limit) || 1}
        onChange={setPage}
      />
    </motion.div>
  )
}
