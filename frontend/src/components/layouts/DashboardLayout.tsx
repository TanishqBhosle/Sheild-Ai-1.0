import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../app/providers/AuthProvider';
import { logout } from '../../lib/auth';
import { LayoutDashboard, FileText as FileIcon, BarChart3, LogOut, ChevronLeft } from 'lucide-react';
import Logo from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';
import { useState } from 'react';
import { PLANS } from '../../constants/plans';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/dashboard/content', icon: FileIcon, label: 'Content' },
];

export default function DashboardLayout() {
  const { user, role, plan } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const planInfo = PLANS[(plan as keyof typeof PLANS) || 'free'] || PLANS.free;

  return (
    <div className="flex h-screen bg-aegis-bg overflow-hidden">
      <motion.aside animate={{ width: collapsed ? 64 : 240 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-aegis-bg2 border-r border-aegis-border flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-aegis-border flex items-center justify-between min-h-[56px]">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <span className="text-aegis-text font-bold text-sm">Shield AI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                  {planInfo.name.toUpperCase()}
                </span>
              </motion.div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-aegis-bg3 rounded transition-colors">
            <ChevronLeft className={`w-4 h-4 text-aegis-text3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label, end }: any) => (
            <NavLink key={path} to={path} end={end}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-all duration-300 ${
                isActive 
                  ? 'bg-amber-500/15 text-amber-500 border-l-2 border-amber-500' 
                  : 'text-aegis-text3 hover:text-aegis-text hover:bg-aegis-bg3'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{label}</motion.span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-aegis-border">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-aegis-accent/30 border border-aegis-accent/50 flex items-center justify-center text-xs font-bold text-aegis-accent">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-aegis-text truncate">{user?.email}</p>
                <p className="text-[10px] text-aegis-text3">{role === 'user' ? 'User' : role}</p>
              </div>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/auth'); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-aegis-text3 hover:text-red-400 rounded transition-colors">
            <LogOut className="w-3.5 h-3.5" />{!collapsed && 'Sign out'}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-aegis-bg2 border-b border-aegis-border flex items-center justify-between px-6 shrink-0">
          <h1 className="text-sm font-semibold text-aegis-text">Dashboard</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-xs text-aegis-text3">
              <div className="w-8 h-8 rounded-full bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center text-xs font-bold text-aegis-accent">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
