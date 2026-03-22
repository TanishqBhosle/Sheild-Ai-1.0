import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  return (
    <div className="flex min-h-screen bg-[#09090b] text-ink-primary">
      <Sidebar role={role} />
      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  )
}
