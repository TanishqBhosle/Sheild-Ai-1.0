import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PanelRole, useAuth } from "./auth";

function FullPageMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm">{text}</p>
    </div>
  );
}

export function AuthGate() {
  const { isReady } = useAuth();
  if (!isReady) return <FullPageMessage text="Checking session..." />;
  return <Outlet />;
}

export function RequireLogin() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RedirectByRole() {
  const { user, claims } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!claims) return <Navigate to="/unauthorized" replace />;
  return <Navigate to={`/${claims.role}`} replace />;
}

export function RequireRole({ role }: { role: PanelRole }) {
  const { claims } = useAuth();
  if (!claims) return <Navigate to="/unauthorized" replace />;
  if (claims.role !== role) return <Navigate to={`/${claims.role}`} replace />;
  return <Outlet />;
}
