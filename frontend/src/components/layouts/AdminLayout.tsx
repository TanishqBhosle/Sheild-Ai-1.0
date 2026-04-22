import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { logout } from '../../lib/auth';
import { LayoutDashboard, Building2, BarChart3, LogOut, Users } from 'lucide-react';

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-aegis-bg overflow-hidden">
      <aside className="w-[170px] bg-aegis-bg2 border-r border-aegis-border flex flex-col shrink-0">
        <div className="p-4 border-b border-aegis-border flex items-center gap-2">
          <span className="text-purple-400 font-bold text-sm">⚔ Aegis AI</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">ADMIN</span>
        </div>
        <nav className="flex-1 py-2">
          {[
            { path: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
            { path: '/admin/organizations', icon: Building2, label: 'Organisations' },
            { path: '/admin/users', icon: Users, label: 'Users' },
            { path: '/admin/analytics', icon: BarChart3, label: 'Platform Stats' },
          ].map(({ path, icon: Icon, label, end }) => (
            <NavLink key={path} to={path} end={end}
              className={({ isActive }) => `flex items-center gap-2 px-3 py-2 mx-2 rounded-lg text-sm transition-all ${
                isActive ? 'bg-purple-500/12 text-purple-400' : 'text-aegis-text3 hover:text-aegis-text hover:bg-aegis-bg3'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-aegis-border">
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 w-full px-2 py-1 text-xs text-aegis-text3 hover:text-red-400 rounded transition-colors">
            <LogOut className="w-3.5 h-3.5" />Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-aegis-bg2 border-b border-aegis-border flex items-center justify-between px-6 shrink-0">
          <h1 className="text-sm font-semibold text-aegis-text">Platform Admin</h1>
          <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold text-purple-400">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6"><Outlet /></div>
      </main>
    </div>
  );
}
