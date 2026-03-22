import type { ContentType } from '../../types'
import { cn } from '../../lib/utils'

const label: Record<ContentType, string> = {
  text: 'T',
  image: 'IMG',
  audio: 'AUD',
  video: 'VID',
}

export function ContentTypeIcon({
  type,
  className,
}: {
  type: ContentType
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#27272a] bg-[#18181b] text-[10px] font-mono text-ink-muted',
        className
      )}
    >
      {label[type]}
    </span>
  )
}
