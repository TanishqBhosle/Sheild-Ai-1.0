import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[120px] rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-ink-primary outline-none focus:ring-2 ring-indigo-500/40',
        className
      )}
      {...props}
    />
  )
}
