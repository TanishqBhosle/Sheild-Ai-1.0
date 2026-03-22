import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-ink-primary outline-none ring-indigo-500/40 focus:ring-2',
        className
      )}
      {...props}
    />
  )
}
