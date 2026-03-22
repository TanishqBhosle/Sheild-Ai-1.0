import { cn } from '../../lib/utils'

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const s =
    size === 'lg' ? 'h-10 w-10 border-2' : size === 'sm' ? 'h-4 w-4 border' : 'h-6 w-6 border-2'
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-indigo-500 border-t-transparent',
        s,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
