import type { SeverityType } from '../../types'
import { cn } from '../../lib/utils'

const map: Record<SeverityType, string> = {
  low: 'bg-[var(--sev-low-bg)] text-[var(--sev-low)]',
  medium: 'bg-[var(--sev-medium-bg)] text-[var(--sev-medium)]',
  high: 'bg-[var(--sev-high-bg)] text-[var(--sev-high)]',
  critical:
    'bg-[var(--sev-critical-bg)] text-[var(--sev-critical)] animate-pulse-critical',
}

export function SeverityPill({ severity }: { severity: SeverityType }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        map[severity]
      )}
    >
      {severity}
    </span>
  )
}
