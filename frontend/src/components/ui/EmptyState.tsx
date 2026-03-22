import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-ink-muted">
      {icon}
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {description ? <p className="text-xs">{description}</p> : null}
    </div>
  )
}
