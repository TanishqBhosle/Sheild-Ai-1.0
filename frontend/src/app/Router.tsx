import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import DashboardLayout from '../components/layouts/DashboardLayout';
import DashboardHome from '../pages/dashboard/DashboardHome';
import ContentList from '../pages/dashboard/ContentList';
import ContentDetail from '../pages/dashboard/ContentDetail';
import ApiKeys from '../pages/dashboard/ApiKeys';
import Policies from '../pages/dashboard/Policies';
import Analytics from '../pages/dashboard/Analytics';
import Webhooks from '../pages/dashboard/Webhooks';
import TeamMembers from '../pages/dashboard/TeamMembers';
import Billing from '../pages/dashboard/Billing';
import ModeratorLayout from '../components/layouts/ModeratorLayout';
import ModeratorQueue from '../pages/moderator/ModeratorQueue';
import ModeratorStats from '../pages/moderator/ModeratorStats';
import AdminLayout from '../components/layouts/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import OrgManagement from '../pages/admin/OrgManagement';
import PlatformAnalytics from '../pages/admin/PlatformAnalytics';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-aegis-bg"><div className="w-8 h-8 border-2 border-aegis-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-aegis-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-aegis-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-aegis-text2 text-sm">Loading Aegis AI...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute(role)} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to={getDefaultRoute(role)} replace /> : <SignupPage />} />

      {/* Panel 1: End-User Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="content" element={<ContentList />} />
        <Route path="content/:id" element={<ContentDetail />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="policies" element={<Policies />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="team" element={<TeamMembers />} />
        <Route path="billing" element={<Billing />} />
      </Route>

      {/* Panel 2: Moderator Dashboard */}
      <Route path="/moderator" element={<ProtectedRoute><ModeratorLayout /></ProtectedRoute>}>
        <Route index element={<ModeratorQueue />} />
        <Route path="stats" element={<ModeratorStats />} />
      </Route>

      {/* Panel 3: Platform Admin */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="organizations" element={<OrgManagement />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? getDefaultRoute(role) : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function getDefaultRoute(role: string | null): string {
  switch (role) {
    case 'platform_admin': return '/admin';
    case 'moderator': return '/moderator';
    default: return '/dashboard';
  }
}
