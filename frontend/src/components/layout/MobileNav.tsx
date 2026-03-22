import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { ROUTES } from '../../constants'
import {
  LayoutDashboard,
  ListOrdered,
  Upload,
  Scale,
  LineChart,
} from 'lucide-react'
import type { UserRole } from '../../types'

export function MobileNav({ role }: { role: UserRole }) {
  const staff = role === 'moderator' || role === 'admin'
  const items: Array<{ to: string; icon: typeof LayoutDashboard; label: string }> =
    [
      { to: ROUTES.home, icon: LayoutDashboard, label: 'Home' },
      ...(staff
        ? [{ to: ROUTES.queue, icon: ListOrdered, label: 'Queue' }]
        : []),
      { to: ROUTES.submit, icon: Upload, label: 'Submit' },
      { to: ROUTES.appeals, icon: Scale, label: 'Appeals' },
      ...(staff
        ? [{ to: ROUTES.analytics, icon: LineChart, label: 'Stats' }]
        : []),
    ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#27272a] bg-[#111113] px-2 py-2 lg:hidden">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 text-[10px]',
              isActive ? 'text-indigo-300' : 'text-ink-muted'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
