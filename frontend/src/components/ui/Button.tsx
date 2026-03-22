import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  className,
  variant = 'primary',
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
  children?: ReactNode
}) {
  const styles: Record<Variant, string> = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent',
    secondary:
      'bg-[#18181b] border border-[#27272a] text-ink-primary hover:bg-[#27272a]',
    ghost: 'bg-transparent text-ink-muted hover:text-ink-primary',
    danger: 'bg-red-600/10 border border-red-500/40 text-red-400 hover:bg-red-600/20',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50',
        styles[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  )
}
