import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, setActiveBusinessId, getActiveBusinessId } from "../lib/api";
import { User, Membership, Role } from "../types";

interface AuthContextValue {
  user: User | null;
  memberships: Membership[];
  activeBusinessId: string | null;
  activeMembership: Membership | null;
  role: Role | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  switchBusiness: (businessId: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(getActiveBusinessId());
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setMemberships(data.memberships);

      const stillValid = data.memberships.find((m: Membership) => m.businessId === getActiveBusinessId());
      if (!stillValid && data.memberships.length > 0) {
        setActiveBusinessId(data.memberships[0].businessId);
        setActiveBusinessIdState(data.memberships[0].businessId);
      } else if (stillValid) {
        setActiveBusinessIdState(stillValid.businessId);
      }
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.post("/auth/login", { email, password });
      await loadMe();
    },
    [loadMe]
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      await api.post("/auth/register", { fullName, email, password });
      await loadMe();
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    setMemberships([]);
    setActiveBusinessId(null);
    setActiveBusinessIdState(null);
  }, []);

  const switchBusiness = useCallback((businessId: string) => {
    setActiveBusinessId(businessId);
    setActiveBusinessIdState(businessId);
  }, []);

  const activeMembership = memberships.find((m) => m.businessId === activeBusinessId) ?? null;

  const value: AuthContextValue = {
    user,
    memberships,
    activeBusinessId,
    activeMembership,
    role: activeMembership?.role ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshSession: loadMe,
    switchBusiness,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
