import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async () => {
    try {
      const data = await api("/auth/me", { method: "GET" });
      setUser(data.user);
    } catch {
      try {
        const refreshed = await api("/auth/refresh", { method: "POST" });
        setUser(refreshed.user);
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  const register = async (payload) => {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setUser(data.user);
    return data.user;
  };

  const login = async ({ email, password }) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setUser(data.user);
    return data.user;
  };

  const refresh = async () => {
    const data = await api("/auth/refresh", { method: "POST" });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, register, login, refresh, logout, hydrate }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
