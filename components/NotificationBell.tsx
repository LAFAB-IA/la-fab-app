"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { Bell, Check } from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import { timeAgo } from "@/lib/format"
import { io, Socket } from "socket.io-client"

interface Notification {
    id: string
    type?: string
    title: string
    message: string
    link?: string
    read: boolean
    created_at: string
}

function truncate(text: string, max: number): string {
    if (!text) return ""
    return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…"
}

export default function NotificationBell() {
    const { token } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    // ── Fetch unread count ────────────────────────────────────────────────────
    const fetchCount = useCallback(() => {
        if (!token) return
        fetchWithAuth(`${API_URL}/api/notifications/count`)
            .then((r) => r.json())
            .then((data) => {
                if (typeof data?.unread === "number") setUnreadCount(data.unread)
                else if (typeof data?.count === "number") setUnreadCount(data.count)
            })
            .catch(() => {})
    }, [token])

    // ── Fetch list (10 last) ──────────────────────────────────────────────────
    const fetchList = useCallback(() => {
        if (!token) return
        setLoading(true)
        fetchWithAuth(`${API_URL}/api/notifications?limit=10`)
            .then((r) => r.json())
            .then((data) => {
                const list: Notification[] = Array.isArray(data)
                    ? data
                    : data?.notifications || data?.items || []
                setNotifications(list.slice(0, 10))
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [token])

    // ── Initial + polling 30s ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        fetchCount()
        const id = setInterval(fetchCount, 30_000)
        return () => clearInterval(id)
    }, [token, fetchCount])

    // ── WebSocket push (optional) ─────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        let socket: Socket | null = null
        try {
            socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] })
            socket.on("notification:new", () => {
                setUnreadCount((c) => c + 1)
                if (open) fetchList()
            })
        } catch { /* WebSocket optional */ }
        return () => { socket?.disconnect() }
    }, [token, open, fetchList])

    // ── Outside click ─────────────────────────────────────────────────────────
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    function handleToggle() {
        const next = !open
        setOpen(next)
        if (next) fetchList()
    }

    function markOneRead(id: string) {
        if (!token) return
        fetchWithAuth(`${API_URL}/api/notifications/${id}/read`, { method: "PATCH" })
            .then(() => {
                setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
                setUnreadCount((c) => Math.max(0, c - 1))
            })
            .catch(() => {})
    }

    function markAllRead() {
        if (!token) return
        fetchWithAuth(`${API_URL}/api/notifications/read-all`, { method: "PATCH" })
            .then(() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                setUnreadCount(0)
            })
            .catch(() => {})
    }

    function handleClickNotif(n: Notification) {
        if (!n.read) markOneRead(n.id)
        if (n.link) {
            setOpen(false)
            window.location.assign(n.link)
        }
    }

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>
            <button
                onClick={handleToggle}
                aria-label="Notifications"
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
                        backgroundColor: C.yellow, color: "#000000",
                        fontSize: 10, fontWeight: 800, borderRadius: 10,
                        minWidth: 16, height: 16,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 4px",
                        boxShadow: "0 0 0 2px #000000",
                    }}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: "absolute", right: 0, top: 44,
                    backgroundColor: C.white, borderRadius: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    border: "1px solid " + C.border,
                    width: 360, zIndex: 1001, overflow: "hidden",
                }}>
                    {/* Header */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "14px 16px", borderBottom: "1px solid " + C.border,
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </span>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 360, overflowY: "auto" }}>
                        {loading && notifications.length === 0 ? (
                            <div style={{ padding: "28px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                                Chargement…
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: "28px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                                Aucune notification
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClickNotif(n)}
                                    className="row-hover"
                                    style={{
                                        padding: "12px 16px",
                                        borderBottom: "1px solid " + C.border,
                                        cursor: n.link || !n.read ? "pointer" : "default",
                                        backgroundColor: n.read ? "transparent" : "rgba(244,207,21,0.08)",
                                    }}
                                >
                                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                        {!n.read && (
                                            <div style={{
                                                width: 7, height: 7, borderRadius: "50%",
                                                backgroundColor: C.yellow, flexShrink: 0, marginTop: 6,
                                            }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0, paddingLeft: n.read ? 17 : 0 }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: n.read ? 500 : 700,
                                                color: C.dark, marginBottom: 2,
                                            }}>
                                                {n.title}
                                            </div>
                                            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                                                {truncate(n.message, 60)}
                                            </div>
                                            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                                                {timeAgo(n.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && unreadCount > 0 && (
                        <div style={{
                            padding: "10px 16px", borderTop: "1px solid " + C.border,
                            textAlign: "center",
                        }}>
                            <button
                                onClick={markAllRead}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: 13, color: C.dark, fontWeight: 600,
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}
                            >
                                <Check size={14} /> Tout marquer comme lu
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
