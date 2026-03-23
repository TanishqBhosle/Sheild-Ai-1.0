import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-ink-primary outline-none ring-indigo-500/40 focus:ring-2',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
