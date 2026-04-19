import { create } from 'zustand';
import { User } from 'firebase/auth';

export type UserRole = 'user' | 'moderator' | 'admin';

interface UserSettings {
  fullName: string;
  email: string;
  notifications: boolean;
  sensitivity: number;
  activeCategories: string[];
}

interface AppState {
  isAuthenticated: boolean;
  userRole: UserRole;
  user: User | null;
  settings: UserSettings;
  theme: 'light' | 'dark';
  activeTab: string;
  moderationData: any[];
  setAuth: (isAuthenticated: boolean, userRole: UserRole, user: User | null) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setTab: (tab: string) => void;
  setModerationData: (data: any[]) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  userRole: 'user',
  user: null,
  theme: 'light',
  activeTab: 'dashboard',
  moderationData: [],
  settings: {
    fullName: '',
    email: '',
    notifications: true,
    sensitivity: 75,
    activeCategories: ['Hate Speech', 'Violence', 'Harassment', 'Sexual Content'],
  },
  setAuth: (isAuthenticated, userRole, user) => set({ isAuthenticated, userRole, user }),
  updateSettings: (newSettings) => set((state) => ({ 
    settings: { ...state.settings, ...newSettings } 
  })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setTab: (activeTab) => set({ activeTab }),
  setModerationData: (moderationData) => set({ moderationData }),
  logout: () => set({ isAuthenticated: false, userRole: 'user', user: null }),
}));
