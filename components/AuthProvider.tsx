"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { API_URL } from "@/lib/constants";
import { getToken, setToken, clearToken } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

function redirectForRole(role: string): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "supplier": return "/supplier/dashboard";
    default: return "/projets";
  }
}

const ROLE_SWITCH_EMAILS = [
  "yannis-93290@hotmail.fr",
  "guillaume.bourdon.pro@gmail.com",
];

function applyRoleOverride(user: User): User {
  if (!ROLE_SWITCH_EMAILS.includes(user.email)) return user;
  const override = localStorage.getItem("role_override");
  if (override && ["admin", "client", "supplier"].includes(override)) {
    return { ...user, role: override };
  }
  return user;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /** Hard-navigate to the right dashboard — honours ?redirect= from middleware */
  function navigatePostLogin(role: string) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    const dest = (redirect && redirect.startsWith("/")) ? redirect : redirectForRole(role);
    console.log("[AUTH] navigating to:", dest, "(role:", role, ")");
    window.location.href = dest;
  }

  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        setUser(applyRoleOverride(data.user));
        setTokenState(storedToken);
        setIsAuthenticated(true);
      })
      .catch(() => {
        clearToken();
        setUser(null);
        setTokenState(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Échec de la connexion");
    }

    const data = await res.json();
    const freshToken = data.session?.access_token || data.token;
    setToken(freshToken);

    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    if (!meRes.ok) throw new Error("Échec de la récupération du profil");
    const meData = await meRes.json();

    const realRole = meData.user?.role || meData.role || "client";
    console.log("[AUTH] login /me full response:", JSON.stringify(meData));
    console.log("[AUTH] role reçu:", realRole, "→ redirect vers:", redirectForRole(realRole));
    setTokenState(freshToken);
    setUser(applyRoleOverride(meData.user));
    setIsAuthenticated(true);
    navigatePostLogin(realRole);
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Échec de l'inscription");
    }

    const data = await res.json();
    const freshToken = data.session?.access_token || data.token;
    setToken(freshToken);

    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    if (!meRes.ok) throw new Error("Échec de la récupération du profil");
    const meData = await meRes.json();

    const realSignupRole = meData.user?.role || meData.role || "client";
    console.log("[AUTH] signup /me response:", JSON.stringify(meData), "→ role:", realSignupRole);
    setTokenState(freshToken);
    setUser(applyRoleOverride(meData.user));
    setIsAuthenticated(true);
    navigatePostLogin(realSignupRole);
  };

  const logout = async () => {
    try {
      const currentToken = getToken();
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    } catch {
      // ignore
    }
    clearToken();
    setTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
