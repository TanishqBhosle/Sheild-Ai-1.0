import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-[#27272a] bg-[#18181b] px-2 py-0.5 text-xs text-ink-muted',
        className
      )}
    >
      {children}
    </span>
  )
}
