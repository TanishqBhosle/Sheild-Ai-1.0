import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { ReactNode } from 'react'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
