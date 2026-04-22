import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { logout } from '../../lib/auth';
import { ClipboardList, CheckCircle, BarChart3, LogOut } from 'lucide-react';
import Logo from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';

export default function ModeratorLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-aegis-bg overflow-hidden">
      <aside className="w-[160px] bg-aegis-bg2 border-r border-aegis-border flex flex-col shrink-0">
        <div className="p-4 border-b border-aegis-border flex items-center gap-2 h-[56px]">
          <Logo size="sm" />
          <span className="text-aegis-text font-bold text-sm">Aegis AI</span>
        </div>
        <nav className="flex-1 py-2">
          {[
            { path: '/moderator', icon: ClipboardList, label: 'Queue', end: true },
            { path: '/moderator/stats', icon: BarChart3, label: 'My Stats' },
          ].map(({ path, icon: Icon, label, end }) => (
            <NavLink key={path} to={path} end={end}
              className={({ isActive }) => `flex items-center gap-2 px-3 py-2 mx-2 rounded-lg text-sm transition-all ${
                isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-aegis-text3 hover:text-aegis-text hover:bg-aegis-bg3'
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
          <h1 className="text-sm font-semibold text-aegis-text">Review Queue</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-emerald-500/12 text-emerald-400 border border-emerald-500/30">● Live</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-400">
              {user?.email?.[0]?.toUpperCase() || 'M'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto"><Outlet /></div>
      </main>
    </div>
  );
}
