import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

export type PanelRole = "user" | "moderator" | "admin";

type Claims = {
  orgId: string;
  plan: string;
  role: PanelRole;
};

type AuthContextValue = {
  isReady: boolean;
  user: User | null;
  claims: Claims | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseClaims(rawClaims: Record<string, unknown> | undefined): Claims | null {
  if (!rawClaims) return null;
  const orgId = rawClaims.orgId;
  const plan = rawClaims.plan;
  const role = rawClaims.role;
  if (typeof orgId !== "string" || typeof plan !== "string" || !["user", "moderator", "admin"].includes(String(role))) {
    return null;
  }
  return { orgId, plan, role: role as PanelRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setClaims(null);
        setIsReady(true);
        return;
      }

      const tokenResult = await nextUser.getIdTokenResult();
      setClaims(parseClaims(tokenResult.claims as Record<string, unknown>));
      setIsReady(true);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      user,
      claims,
      logout: () => signOut(auth)
    }),
    [isReady, user, claims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
