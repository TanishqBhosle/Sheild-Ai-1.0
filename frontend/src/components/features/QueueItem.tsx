import { formatDistanceToNow } from 'date-fns'
import type { ContentDoc, ModerationResult, SeverityType } from '../../types'
import { ContentTypeIcon } from './ContentTypeIcon'
import { SeverityPill } from './SeverityPill'
import { ConfidenceBar } from '../ui/ConfidenceBar'
import { cn } from '../../lib/utils'

function tsToDate(
  t: ContentDoc['submittedAt'] | undefined
): Date | null {
  if (!t) {
    return null
  }
  if (typeof (t as { toDate?: () => Date }).toDate === 'function') {
    return (t as { toDate: () => Date }).toDate()
  }
  const s = (t as { seconds?: number }).seconds
  return s ? new Date(s * 1000) : null
}

export function QueueItem({
  content,
  moderation,
  selected,
  onClick,
}: {
  content: ContentDoc
  moderation: ModerationResult
  selected: boolean
  onClick: () => void
}) {
  const preview =
    content.payload?.slice(0, 60) ?? content.storageRef?.slice(0, 40) ?? ''
  const when = tsToDate(content.submittedAt)
  const critical = moderation.severity === 'critical'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-[#27272a] bg-[#111113] p-3 text-left transition hover:border-indigo-500/40',
        selected && 'border-l-2 border-l-indigo-500 bg-indigo-950/20',
        critical && 'border-l-2 border-l-red-500'
      )}
    >
      <div className="flex items-start gap-3">
        <ContentTypeIcon type={content.type} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SeverityPill severity={moderation.severity as SeverityType} />
            <span className="text-[10px] text-ink-faint">
              {when ? formatDistanceToNow(when, { addSuffix: true }) : ''}
            </span>
          </div>
          <p className="truncate text-xs text-ink-muted">{preview}</p>
          <ConfidenceBar value={moderation.confidence} />
          <p className="font-mono text-[10px] text-ink-faint">
            {moderation.category}
          </p>
        </div>
      </div>
    </button>
  )
}
