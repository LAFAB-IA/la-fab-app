"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { API_URL, C } from "@/lib/constants"
import { io, Socket } from "socket.io-client"
import { Bell, X, Menu, Check } from "lucide-react"

interface Notification {
    id: string
    title: string
    message: string
    read: boolean
    created_at: string
    link?: string
}

export default function Navbar() {
    const { user, token, isAuthenticated, logout } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [notifOpen, setNotifOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const notifRef = useRef<HTMLDivElement>(null)
    const profileRef = useRef<HTMLDivElement>(null)

    // ── Fetch unread count ────────────────────────────────────────────────────
    const fetchUnread = useCallback(() => {
        if (!token) return
        fetch(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => { if (typeof data.count === "number") setUnreadCount(data.count) })
            .catch(() => {})
    }, [token])

    // ── Fetch notifications list ──────────────────────────────────────────────
    const fetchNotifications = useCallback(() => {
        if (!token) return
        fetch(`${API_URL}/api/notifications?limit=8`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => { if (data.ok && data.notifications) setNotifications(data.notifications) })
            .catch(() => {})
    }, [token])

    useEffect(() => {
        fetchUnread()
        const interval = setInterval(fetchUnread, 30000)
        return () => clearInterval(interval)
    }, [fetchUnread])

    // ── WebSocket ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        let socket: Socket | null = null
        try {
            socket = io(API_URL, {
                auth: { token },
                transports: ["websocket", "polling"],
            })
            socket.on("notification:new", () => {
                setUnreadCount((c) => c + 1)
                if (notifOpen) fetchNotifications()
            })
        } catch { /* WebSocket optional */ }
        return () => { socket?.disconnect() }
    }, [token, notifOpen, fetchNotifications])

    // ── Fetch avatar from /me ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => { if (data.ok && data.user?.avatar_url) setAvatarUrl(data.user.avatar_url + "?t=" + Date.now()) })
            .catch(() => {})
    }, [token])

    // ── Listen for avatar updates (same-tab event + cross-tab localStorage) ──
    useEffect(() => {
        function handleAvatarUpdated() {
            if (!token) return
            fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
            })
                .then((r) => r.json())
                .then((data) => { if (data.ok && data.user?.avatar_url) setAvatarUrl(data.user.avatar_url + "?t=" + Date.now()) })
                .catch(() => {})
        }
        function handleStorage(e: StorageEvent) {
            if (e.key === "avatar_updated") handleAvatarUpdated()
        }
        window.addEventListener("avatar-updated", handleAvatarUpdated)
        window.addEventListener("storage", handleStorage)
        return () => {
            window.removeEventListener("avatar-updated", handleAvatarUpdated)
            window.removeEventListener("storage", handleStorage)
        }
    }, [token])

    // ── Close dropdowns on outside click ─────────────────────────────────────
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    // ── Mark all as read ──────────────────────────────────────────────────────
    function markAllRead() {
        if (!token) return
        fetch(`${API_URL}/api/notifications/mark-all-read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(() => {
                setUnreadCount(0)
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            })
            .catch(() => {})
    }

    function handleBellClick() {
        if (!notifOpen) fetchNotifications()
        setNotifOpen(!notifOpen)
        setProfileOpen(false)
    }

    const initials = user
        ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase()
        : ""

    // ── Liens mobile ──────────────────────────────────────────────────────────
    const mobileLinks = isAuthenticated && user?.role === "supplier"
        ? []
        : isAuthenticated
        ? []
        : []

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 60, zIndex: 1000,
            backgroundColor: "#000000", display: "flex", alignItems: "center",
            padding: "0 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            fontFamily: "Inter, sans-serif",
        }}>
            {/* ── Logo → role-based home ── */}
            <div
                onClick={() => {
                    if (isAuthenticated && user?.role) {
                        const dest = user.role === "admin" ? "/admin/dashboard"
                            : user.role === "supplier" ? "/supplier/dashboard"
                            : "/projets"
                        window.location.href = dest
                    } else {
                        window.location.href = "/"
                    }
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: 6, backgroundColor: C.yellow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: "#000000",
                }}>
                    LF
                </div>
                <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>LA FAB</span>
            </div>

            {/* ── Spacer centre ── */}
            <div style={{ flex: 1 }} />

            {/* ── Right side ── */}
            {isAuthenticated ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                    {/* ── Cloche notifications ── */}
                    <div ref={notifRef} style={{ position: "relative" }}>
                        <button
                            onClick={handleBellClick}
                            style={{
                                position: "relative", background: "none", border: "none",
                                color: C.white, cursor: "pointer", padding: 6,
                                borderRadius: 8, display: "flex", alignItems: "center",
                            }}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: "absolute", top: 2, right: 2,
                                    backgroundColor: "#e74c3c", color: "#fff",
                                    fontSize: 10, fontWeight: 700, borderRadius: 10,
                                    minWidth: 16, height: 16,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    padding: "0 4px",
                                }}>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <div style={{
                                position: "absolute", right: 0, top: 44,
                                backgroundColor: C.white, borderRadius: 14,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                                border: "1px solid " + C.border,
                                width: 340, zIndex: 1001, overflow: "hidden",
                            }}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "14px 16px", borderBottom: "1px solid " + C.border,
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                                        Notifications {unreadCount > 0 && `(${unreadCount})`}
                                    </span>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} style={{
                                            background: "none", border: "none", cursor: "pointer",
                                            fontSize: 12, color: C.muted, fontWeight: 600,
                                            display: "flex", alignItems: "center", gap: 4,
                                        }}>
                                            <Check size={12} /> Tout marquer lu
                                        </button>
                                    )}
                                </div>

                                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: "28px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                                            Aucune notification
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => { if (n.link) window.location.href = n.link; setNotifOpen(false) }}
                                                style={{
                                                    padding: "12px 16px",
                                                    borderBottom: "1px solid " + C.border,
                                                    cursor: n.link ? "pointer" : "default",
                                                    backgroundColor: n.read ? "transparent" : "rgba(244,207,21,0.06)",
                                                }}
                                            >
                                                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                                    {!n.read && (
                                                        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.yellow, flexShrink: 0, marginTop: 5 }} />
                                                    )}
                                                    <div style={{ flex: 1, paddingLeft: n.read ? 17 : 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "#000000", marginBottom: 2 }}>
                                                            {n.title}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{n.message}</div>
                                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                                                            {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div style={{ padding: "10px 16px", borderTop: "1px solid " + C.border, textAlign: "center" }}>
                                    <Link href="/notifications" onClick={() => setNotifOpen(false)} style={{
                                        fontSize: 13, color: C.muted, textDecoration: "none", fontWeight: 600,
                                    }}>
                                        Voir toutes les notifications →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Avatar + dropdown profil ── */}
                    <div ref={profileRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                            style={{
                                width: 34, height: 34, borderRadius: "50%",
                                backgroundColor: C.yellow, color: "#000000",
                                fontWeight: 700, fontSize: 12, border: "none",
                                cursor: "pointer", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                overflow: "hidden", padding: 0,
                            }}
                        >
                            {avatarUrl
                                ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
                                : (initials || "?")
                            }
                        </button>

                        {profileOpen && (
                            <div style={{
                                position: "absolute", right: 0, top: 44,
                                backgroundColor: C.white, borderRadius: 12,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                                border: "1px solid " + C.border,
                                minWidth: 180, overflow: "hidden", zIndex: 1001,
                            }}>
                                <div style={{ padding: "12px 16px", borderBottom: "1px solid " + C.border }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#000000" }}>
                                        {user?.firstName} {user?.lastName}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.email}</div>
                                </div>
                                <Link href="/profil" onClick={() => setProfileOpen(false)} style={{
                                    display: "block", padding: "11px 16px", fontSize: 14,
                                    color: "#000000", textDecoration: "none", fontWeight: 500,
                                }}>
                                    Mon profil
                                </Link>
                                <button onClick={() => { setProfileOpen(false); logout() }} style={{
                                    display: "block", width: "100%", textAlign: "left",
                                    padding: "11px 16px", fontSize: 14, color: "#c0392b",
                                    fontWeight: 500, border: "none", background: "none",
                                    cursor: "pointer", borderTop: "1px solid " + C.border,
                                }}>
                                    Se déconnecter
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Mobile burger ── */}
                    <button
                        className="navbar-burger"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{
                            display: "none", background: "none", border: "none",
                            color: C.white, cursor: "pointer", padding: 4,
                        }}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Link href="/supplier/register" style={{
                        color: "rgba(255,255,255,0.7)", textDecoration: "none",
                        fontSize: 14, fontWeight: 500,
                    }}>
                        Devenir fournisseur
                    </Link>
                    <Link href="/login" style={{
                        padding: "8px 20px", backgroundColor: C.yellow, color: "#000000",
                        borderRadius: 8, fontWeight: 700, fontSize: 14,
                        textDecoration: "none",
                    }}>
                        Se connecter
                    </Link>
                </div>
            )}

            {/* ── Mobile menu ── */}
            {mobileOpen && isAuthenticated && (
                <div style={{
                    position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
                    backgroundColor: "#000000", zIndex: 999, padding: "24px 20px",
                    display: "flex", flexDirection: "column", gap: 8,
                }}>
                    {mobileLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{
                            color: C.white, textDecoration: "none", fontSize: 18,
                            fontWeight: 500, padding: "12px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}>
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .navbar-desktop-links { display: none !important; }
                    .navbar-burger { display: flex !important; }
                }
            `}</style>
        </nav>
    )
}
