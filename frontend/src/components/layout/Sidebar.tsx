import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { ROUTES } from '../../constants'
import {
  LayoutDashboard,
  ListOrdered,
  Scale,
  LineChart,
  History,
  Upload,
  Shield,
  Users,
} from 'lucide-react'
import type { UserRole } from '../../types'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
    isActive
      ? 'bg-indigo-500/15 text-indigo-300'
      : 'text-ink-muted hover:bg-[#18181b] hover:text-ink-primary'
  )

export function Sidebar({ role }: { role: UserRole }) {
  const showStaff = role === 'moderator' || role === 'admin'
  const showAdmin = role === 'admin'
  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[#27272a] bg-[#111113] lg:flex lg:flex-col">
      <div className="flex items-center gap-2 border-b border-[#27272a] px-4 py-4">
        <Shield className="h-6 w-6 text-indigo-400" />
        <span className="font-semibold">ShieldAI</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to={ROUTES.home} className={linkClass}>
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden lg:inline">Dashboard</span>
        </NavLink>
        {showStaff ? (
          <NavLink to={ROUTES.queue} className={linkClass}>
            <ListOrdered className="h-4 w-4" />
            <span className="hidden lg:inline">Queue</span>
          </NavLink>
        ) : null}
        <NavLink to={ROUTES.submit} className={linkClass}>
          <Upload className="h-4 w-4" />
          <span className="hidden lg:inline">Submit</span>
        </NavLink>
        <NavLink to={ROUTES.appeals} className={linkClass}>
          <Scale className="h-4 w-4" />
          <span className="hidden lg:inline">Appeals</span>
        </NavLink>
        {showStaff ? (
          <>
            <NavLink to={ROUTES.analytics} className={linkClass}>
              <LineChart className="h-4 w-4" />
              <span className="hidden lg:inline">Analytics</span>
            </NavLink>
            <NavLink to={ROUTES.history} className={linkClass}>
              <History className="h-4 w-4" />
              <span className="hidden lg:inline">History</span>
            </NavLink>
          </>
        ) : null}
        {showAdmin ? (
          <>
            <NavLink to={ROUTES.adminPolicy} className={linkClass}>
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">Policy</span>
            </NavLink>
            <NavLink to={ROUTES.adminTeam} className={linkClass}>
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Team</span>
            </NavLink>
          </>
        ) : null}
      </nav>
    </aside>
  )
}
