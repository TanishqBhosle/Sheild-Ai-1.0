import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useModeration } from '../hooks/useModeration'
import type { ContentType, DecisionType, SeverityType } from '../types'
import type { QueueItem as QI } from '../services/moderation.service'
import { QueueItem } from '../components/features/QueueItem'
import { ContentPreview } from '../components/features/ContentPreview'
import { AIAnalysisPanel } from '../components/features/AIAnalysisPanel'
import { DecisionButtons } from '../components/features/DecisionButtons'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { CheckCircle2 } from 'lucide-react'
import { Skeleton } from '../components/ui/Skeleton'

export default function QueuePage() {
  const { loadQueue, decide, loading, error } = useModeration()
  const [items, setItems] = useState<QI[]>([])
  const [selected, setSelected] = useState<QI | null>(null)
  const [note, setNote] = useState('')
  const [modal, setModal] = useState<DecisionType | null>(null)
  const [typeF, setTypeF] = useState<ContentType | ''>('')
  const [sevF, setSevF] = useState<SeverityType | ''>('')

  const refresh = async () => {
    const res = await loadQueue({
      type: typeF || undefined,
      severity: sevF || undefined,
      limit: 50,
    })
    setItems(res.items)
    if (
      selected &&
      !res.items.find((i) => i.content.contentId === selected.content.contentId)
    ) {
      setSelected(res.items[0] ?? null)
    }
  }

  useEffect(() => {
    void refresh().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on filter
  }, [typeF, sevF])

  const confirmDecision = async () => {
    if (!selected || !modal) {
      return
    }
    try {
      await decide(selected.content.contentId, {
        decision: modal,
        notes: note || undefined,
      })
      toast.success('Decision saved')
      setModal(null)
      setNote('')
      setItems((prev) => prev.filter((i) => i.content.contentId !== selected.content.contentId))
      setSelected(null)
      await refresh()
    } catch {
      toast.error('Failed to save')
    }
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-400">{error}</p>
        <Button onClick={() => void refresh()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col gap-4 lg:flex-row">
      <div className="flex w-full flex-col border-[#27272a] lg:w-[40%] lg:border-r lg:pr-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Select
            value={typeF}
            onChange={(e) => setTypeF(e.target.value as ContentType | '')}
          >
            <option value="">All types</option>
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="audio">audio</option>
            <option value="video">video</option>
          </Select>
          <Select
            value={sevF}
            onChange={(e) => setSevF(e.target.value as SeverityType | '')}
          >
            <option value="">All severity</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </Select>
          <Button variant="secondary" type="button" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {loading && items.length === 0 ? (
            <Skeleton className="h-24" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10 text-emerald-400" />}
              title="All caught up!"
            />
          ) : (
            items.map((it) => (
              <QueueItem
                key={it.content.contentId}
                content={it.content}
                moderation={it.moderation}
                selected={selected?.content.contentId === it.content.contentId}
                onClick={() => setSelected(it)}
              />
            ))
          )}
        </div>
      </div>
      <div className="flex w-full flex-1 flex-col lg:w-[60%]">
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="empty"
              className="flex flex-1 items-center justify-center text-ink-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Select an item from the queue to review
            </motion.div>
          ) : (
            <motion.div
              key={selected.content.contentId}
              className="space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <span className="font-mono">{selected.content.contentId}</span>
                <span className="rounded-md border border-[#27272a] px-2 py-0.5 text-xs">
                  {selected.content.status}
                </span>
              </div>
              <ContentPreview content={selected.content} />
              <AIAnalysisPanel mod={selected.moderation} />
              <Textarea
                placeholder="Add a note before making a decision..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <DecisionButtons
                disabled={loading}
                onSelect={(d) => setModal(d)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Modal
        open={modal !== null}
        title="Confirm decision"
        onClose={() => setModal(null)}
      >
        <p className="mb-3 text-sm text-ink-muted">
          Apply <strong>{modal}</strong> to this item?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => setModal(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirmDecision()}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  )
}
