import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { UserRole, PlanTier } from '../../types/org.types';

interface AuthState {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  orgId: string | null;
  plan: PlanTier | null;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, role: null, orgId: null, plan: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, role: null, orgId: null, plan: null });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setState({
          user, loading: false,
          role: (token.claims.role as UserRole) || 'viewer',
          orgId: (token.claims.orgId as string) || null,
          plan: (token.claims.plan as PlanTier) || 'free',
        });
      } else {
        setState({ user: null, loading: false, role: null, orgId: null, plan: null });
      }
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
