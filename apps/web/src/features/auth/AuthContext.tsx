import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { apiRequest } from "../../app/api";

interface RoleRecord {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  status: string;
  roleIds: string[];
  roles: RoleRecord[];
  lastLoginAt: string | null;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refresh: () => Promise<void>;
}

const storageKey = "facility-intelligence-token";
const AuthContext = createContext<AuthContextValue | null>(null);

function permissionMatches(granted: string, required: string): boolean {
  if (granted === required || granted === "platform:*") {
    return true;
  }

  const [grantedResource, grantedAction] = granted.split(":");
  const [requiredResource, requiredAction] = required.split(":");

  return grantedResource === requiredResource && grantedAction === "*"
    ? true
    : grantedResource === requiredResource && grantedAction === requiredAction;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(storageKey));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest<{ data: AuthUser }>("/api/auth/me", {}, token);
      setUser(response.data);
    } catch {
      window.localStorage.removeItem(storageKey);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [token]);

  async function login(email: string, password: string) {
    const response = await apiRequest<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    window.localStorage.setItem(storageKey, response.token);
    setToken(response.token);
    setUser(response.user);
    setLoading(false);
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      refresh,
      hasPermission(permission) {
        const permissions = user?.roles.flatMap((role) => role.permissions) ?? [];
        return permissions.some((granted) => permissionMatches(granted, permission));
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
