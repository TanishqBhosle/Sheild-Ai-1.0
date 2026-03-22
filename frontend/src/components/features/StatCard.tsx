import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string
  value: number
  icon?: ReactNode
  onClick?: () => void
}) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = 0
    const dur = 600
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(from + (value - from) * eased))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[#111113] p-4 text-left"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {icon ? (
        <div className="absolute right-3 top-3 text-ink-muted">{icon}</div>
      ) : null}
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink-primary">{n}</p>
    </Comp>
  )
}
