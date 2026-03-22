import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { CommandPaletteTrigger } from '../features/CommandPalette'
import { Badge } from '../ui/Badge'

export function Topbar() {
  const { user, role, logout } = useAuth()
  return (
    <header className="flex h-[52px] items-center justify-between border-b border-[#27272a] bg-[#111113] px-4">
      <div className="text-sm text-ink-muted">
        {user?.email ?? 'Guest'}
      </div>
      <div className="flex items-center gap-2">
        <Badge>{role}</Badge>
        <CommandPaletteTrigger />
        <Button variant="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </header>
  )
}
