import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/auth/AuthPage';
import DashboardLayout from '../components/layouts/DashboardLayout';
import DashboardHome from '../pages/dashboard/DashboardHome';
import ContentList from '../pages/dashboard/ContentList';
import ContentDetail from '../pages/dashboard/ContentDetail';
import ModeratorLayout from '../components/layouts/ModeratorLayout';
import ModeratorQueue from '../pages/moderator/ModeratorQueue';
import ModeratorStats from '../pages/moderator/ModeratorStats';
import AdminLayout from '../components/layouts/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import OrgManagement from '../pages/admin/OrgManagement';
import UserManagement from '../pages/admin/UserManagement';
import PlatformAnalytics from '../pages/admin/PlatformAnalytics';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading, role } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-aegis-bg">
        <div className="w-8 h-8 border-2 border-aegis-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRoute(role)} replace />;
  }
  
  return <>{children}</>;
}

export function AppRouter() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-aegis-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-aegis-text2 text-sm font-medium">Initializing Shield AI...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Unified Auth Page */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Panel 1: End-User Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'moderator', 'platform_admin']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="content" element={<ContentList />} />
        <Route path="content/:id" element={<ContentDetail />} />
      </Route>

      {/* Panel 2: Moderator Dashboard */}
      <Route path="/moderator" element={<ProtectedRoute allowedRoles={['moderator', 'platform_admin']}><ModeratorLayout /></ProtectedRoute>}>
        <Route index element={<ModeratorQueue />} />
        <Route path="stats" element={<ModeratorStats />} />
      </Route>

      {/* Panel 3: Platform Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['platform_admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function getDefaultRoute(role: string | null): string {
  switch (role) {
    case 'platform_admin': return '/admin';
    case 'moderator': return '/moderator';
    default: return '/dashboard';
  }
}
