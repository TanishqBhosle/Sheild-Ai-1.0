import { motion } from 'framer-motion'
import { Cpu } from 'lucide-react'
import type { ModerationResult } from '../../types'
import { Badge } from '../ui/Badge'

const keys = [
  'toxicity',
  'harassment',
  'spam',
  'violence',
  'nsfw',
  'hateSpeech',
] as const

export function AIAnalysisPanel({ mod }: { mod: ModerationResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-[#27272a] bg-[#18181b] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
        <Cpu className="h-4 w-4 text-indigo-400" />
        Model output
      </div>
      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k} className="grid grid-cols-[100px_1fr_48px] items-center gap-2">
            <span className="font-mono text-xs text-ink-faint">{k}</span>
            <motion.div
              className="h-2 overflow-hidden rounded-full bg-[#27272a]"
              initial={false}
            >
              <motion.div
                className="h-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(mod.scores[k] * 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </motion.div>
            <span className="text-right text-xs text-ink-muted">
              {Math.round(mod.scores[k] * 100)}%
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{mod.category}</Badge>
        <span className="text-xs italic text-ink-muted">{mod.reasoning}</span>
      </div>
      <p className="text-xs text-ink-faint">
        {mod.model} · {mod.latencyMs}ms
      </p>
    </div>
  )
}
