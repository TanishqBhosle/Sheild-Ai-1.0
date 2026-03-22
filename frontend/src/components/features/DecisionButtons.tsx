import { Button } from '../ui/Button'
import type { DecisionType } from '../../types'

export function DecisionButtons({
  onSelect,
  disabled,
}: {
  onSelect: (d: DecisionType) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        className="w-full border-emerald-500/40 hover:bg-emerald-500/10"
        disabled={disabled}
        onClick={() => onSelect('allow')}
      >
        Approve and publish
      </Button>
      <Button
        variant="secondary"
        className="w-full border-amber-500/40 hover:bg-amber-500/10"
        disabled={disabled}
        onClick={() => onSelect('flag')}
      >
        Flag for senior review
      </Button>
      <Button
        variant="danger"
        className="w-full"
        disabled={disabled}
        onClick={() => onSelect('block')}
      >
        Block content
      </Button>
      <Button
        variant="secondary"
        className="w-full border-indigo-500/40 hover:bg-indigo-500/10"
        disabled={disabled}
        onClick={() => onSelect('escalated')}
      >
        Escalate to admin
      </Button>
    </div>
  )
}
