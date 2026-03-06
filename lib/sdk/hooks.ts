import { useState, useEffect, useCallback, useRef } from "react";
import { io as socketIO, Socket } from "socket.io-client";
import { LaFabApi } from "./api";
import type { User, Project, Invoice, Notification } from "./types";

// ============================================================
// Shared singleton — initialise once with your base URL
// ============================================================

let _api: LaFabApi | null = null;

export function initApi(baseUrl: string): LaFabApi {
  _api = new LaFabApi(baseUrl);
  // Restore token from localStorage if available
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("lafab_token");
    if (saved) _api.token = saved;
  }
  return _api;
}

export function getApi(): LaFabApi {
  if (!_api) throw new Error("Call initApi(baseUrl) before using hooks");
  return _api;
}

// ============================================================
// useAuth
// ============================================================

export function useAuth() {
  const api = getApi();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistToken = (token: string | null) => {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem("lafab_token", token);
    else localStorage.removeItem("lafab_token");
  };

  // Auto-refresh user on mount
  useEffect(() => {
    if (!api.token) {
      setIsLoading(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        api.token = null;
        persistToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    persistToken(res.session.access_token);
    setUser(res.user);
    return res;
  }, []);

  const signup = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    const res = await api.signup(email, password, firstName, lastName);
    persistToken(res.session.access_token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    persistToken(null);
    setUser(null);
  }, []);

  return {
    user,
    login,
    signup,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };
}

// ============================================================
// useProjects
// ============================================================

export function useProjects() {
  const api = getApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setProjects(await api.getProjects());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { projects, isLoading, refresh };
}

// ============================================================
// useProject
// ============================================================

export function useProject(id: string | null) {
  const api = getApi();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);

  const refresh = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      setProject(await api.getProject(id));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  return { project, isLoading, refresh };
}

// ============================================================
// useInvoices
// ============================================================

export function useInvoices() {
  const api = getApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setInvoices(await api.getInvoices());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { invoices, isLoading, refresh };
}

// ============================================================
// useNotifications
// ============================================================

export function useNotifications() {
  const api = getApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        api.getNotifications(),
        api.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count.count);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback(async (id: string) => {
    await api.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await api.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refresh };
}

// ============================================================
// useWebSocket
// ============================================================

type WsEventHandler = (data: any) => void;

export function useWebSocket(token: string | null) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<WsEventHandler>>>(new Map());

  useEffect(() => {
    if (!token || !_api) return;

    const socket = socketIO(_api["baseUrl"], {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Proxy all events to registered handlers
    socket.onAny((event: string, data: any) => {
      handlersRef.current.get(event)?.forEach((fn) => fn(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const on = useCallback((event: string, handler: WsEventHandler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
    handlersRef.current.get(event)!.add(handler);

    // Also register on socket directly for events arriving before `on` call
    socketRef.current?.on(event, handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler: WsEventHandler) => {
    handlersRef.current.get(event)?.delete(handler);
    socketRef.current?.off(event, handler);
  }, []);

  return { connected, on, off, socket: socketRef };
}
