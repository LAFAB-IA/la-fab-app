"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

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
        setUser(data.user);
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
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    router.push(data.user.role === "admin" ? "/admin/dashboard" : "/projets");
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
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    router.push(data.user.role === "admin" ? "/admin/dashboard" : "/projets");
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
    router.push("/login");
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
