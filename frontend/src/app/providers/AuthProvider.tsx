import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { UserRole, PlanTier } from '../../types/org.types';

interface AuthState {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  plan: PlanTier | null;
  orgId: string | null;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthState>({ 
  user: null, loading: true, role: null, plan: null, orgId: null,
  refreshAuth: () => {} 
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    user: null, loading: true, role: null, plan: null, orgId: null,
    refreshAuth: () => {} // Placeholder
  });

  useEffect(() => {
    // Check for custom JWT first (MERN style persistence)
    const customUserStr = localStorage.getItem('aegis_user');
    const customToken = localStorage.getItem('aegis_token');

    if (customToken && customUserStr) {
      try {
        const u = JSON.parse(customUserStr);
        setState({
          user: u as any,
          loading: false,
          role: u.role || 'user',
          plan: u.plan || 'free',
          orgId: u.orgId || '',
          refreshAuth
        });
      } catch (err) {
        console.error('Failed to parse user data from localStorage:', err);
        localStorage.removeItem('aegis_user');
        localStorage.removeItem('aegis_token');
      }
    }

    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        // Only override if custom token is not present or we are using Google login
        if (!localStorage.getItem('aegis_token')) {
          setState({
            user, loading: false,
            role: (token.claims.role as UserRole) || 'user',
            plan: (token.claims.plan as PlanTier) || 'free',
            orgId: (token.claims.orgId as string) || '',
            refreshAuth
          });
        }
      } else if (!localStorage.getItem('aegis_token')) {
        setState({ 
          user: null, loading: false, role: null, plan: null, orgId: null,
          refreshAuth 
        });
      }
    });
    return unsub;
  }, []);

  function refreshAuth() {
    const customUserStr = localStorage.getItem('aegis_user');
    const customToken = localStorage.getItem('aegis_token');
    if (customToken && customUserStr) {
      try {
        const u = JSON.parse(customUserStr);
        setState({
          user: u as any,
          loading: false,
          role: u.role || 'user',
          plan: u.plan || 'free',
          orgId: u.orgId || '',
          refreshAuth
        });
      } catch (err) {
        localStorage.removeItem('aegis_user');
        localStorage.removeItem('aegis_token');
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      // If no custom token, trigger a re-check of Firebase auth
      auth.currentUser?.getIdToken(true).then(() => {
        // This will trigger onIdTokenChanged
      });
    }
  }

  // Update the placeholder with the real function
  useEffect(() => {
    setState(prev => ({ ...prev, refreshAuth }));
  }, []);

  return <AuthContext.Provider value={{ ...state, refreshAuth }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
