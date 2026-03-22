import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Toggle({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="h-5 w-9 rounded-full bg-[#27272a] p-0.5 transition peer-checked:bg-indigo-600">
        <span className="block h-4 w-4 translate-x-0 rounded-full bg-white transition peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
