import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-ink-primary outline-none focus:ring-2 ring-indigo-500/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
