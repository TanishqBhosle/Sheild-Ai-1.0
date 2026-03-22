import { Routes, Route, Outlet } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { RequireStaff } from './components/layout/RequireStaff'
import { RequireAdmin } from './components/layout/RequireAdmin'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import QueuePage from './pages/QueuePage'
import AppealsPage from './pages/AppealsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import HistoryPage from './pages/HistoryPage'
import SubmitPage from './pages/SubmitPage'
import NotFoundPage from './pages/NotFoundPage'
import PolicyPage from './pages/admin/PolicyPage'
import TeamPage from './pages/admin/TeamPage'

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <ShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="queue"
          element={
            <RequireStaff>
              <QueuePage />
            </RequireStaff>
          }
        />
        <Route path="appeals" element={<AppealsPage />} />
        <Route
          path="analytics"
          element={
            <RequireStaff>
              <AnalyticsPage />
            </RequireStaff>
          }
        />
        <Route
          path="history"
          element={
            <RequireStaff>
              <HistoryPage />
            </RequireStaff>
          }
        />
        <Route path="submit" element={<SubmitPage />} />
        <Route
          path="admin/policy"
          element={
            <RequireAdmin>
              <PolicyPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/team"
          element={
            <RequireAdmin>
              <TeamPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
