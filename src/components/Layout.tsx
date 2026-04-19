import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  BarChart3, 
  FileText,
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X, 
  Shield,
  Moon,
  Sun,
  User as UserIcon,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Button, Badge, ScaleImage } from './UI';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
  const { userRole, settings, logout, theme, toggleTheme } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'moderator', 'admin'] },
    { id: 'moderation', label: 'Moderation', icon: ShieldCheck, roles: ['moderator', 'admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['user', 'moderator', 'admin'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className={cn("min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-500", theme)}>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="fixed left-0 top-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 hidden lg:flex flex-col"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xl font-bold tracking-tight whitespace-nowrap"
              >
                Aegis AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-white" : "group-hover:text-blue-500")} />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-semibold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {activeTab === item.id && isSidebarOpen && (
                <motion.div layoutId="activeNav" className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className={cn(
            "rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-4 transition-all overflow-hidden",
            !isSidebarOpen && "p-2"
          )}>
            <div className="flex items-center gap-3">
              <ScaleImage 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${settings.fullName}`} 
                alt="User" 
                containerClassName="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 shrink-0 shadow-sm" 
              />
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{settings.fullName || 'User'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{userRole}</p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button 
                onClick={handleLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        "lg:ml-[280px]",
        !isSidebarOpen && "lg:ml-[80px]"
      )}>
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors hidden lg:block"
            >
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search resources, logs, or users..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
            
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  "flex items-center gap-2 p-1 pr-3 rounded-xl transition-all",
                  isUserMenuOpen ? "bg-slate-100 dark:bg-slate-800 shadow-inner" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <ScaleImage 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${settings.fullName}`} 
                  alt="User" 
                  containerClassName="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" 
                />
                <span className="text-sm font-bold hidden sm:block">{settings.fullName?.split(' ')[0]}</span>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-500" />
                        Settings
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-sm font-semibold text-rose-500"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 pb-20">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
