"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Bell, Check, FileText, Inbox, CreditCard, FilePlus, MessageSquare,
} from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import { timeAgo } from "@/lib/format"
import { io, Socket } from "socket.io-client"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
    id: string
    type?: string
    title: string
    message: string
    link?: string
    read_at: string | null   // null = unread
    created_at: string
}

// ─── Icon by notification type ────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
    quote_received:      FileText,
    quote_validated:     FileText,
    consultation_routed: Inbox,
    payment_received:    CreditCard,
    project_created:     FilePlus,
    message_received:    MessageSquare,
}

function NotifIcon({ type }: { type?: string }) {
    const Icon = (type && TYPE_ICON[type]) ?? Bell
    return <Icon size={14} color={C.muted} />
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
    if (!text) return ""
    return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
    const { token } = useAuth()
    const router = useRouter()
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    // ── Unified fetch: list + derive unread count ─────────────────────────────
    const fetchNotifs = useCallback((showLoading = false) => {
        if (!token) return
        if (showLoading) setLoading(true)
        fetchWithAuth(`${API_URL}/api/notifications?limit=20`)
            .then(r => r.json())
            .then(data => {
                const list: Notification[] = data?.items || data?.notifications || (Array.isArray(data) ? data : [])
                setNotifications(list.slice(0, 20))
                setUnreadCount(list.filter(n => n.read_at === null).length)
            })
            .catch(() => {})
            .finally(() => { if (showLoading) setLoading(false) })
    }, [token])

    // ── Initial load + polling 30s ────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        fetchNotifs()
        const id = setInterval(() => fetchNotifs(), 30_000)
        return () => clearInterval(id)
    }, [token, fetchNotifs])

    // ── WebSocket push (optional — try/catch guards missing server) ───────────
    useEffect(() => {
        if (!token) return
        let socket: Socket | null = null
        try {
            socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] })
            socket.on("notification:new", () => fetchNotifs())
        } catch { /* WebSocket is optional */ }
        return () => { socket?.disconnect() }
    }, [token, fetchNotifs])

    // ── Outside click closes dropdown ─────────────────────────────────────────
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
        if (next) fetchNotifs(true)
    }

    // ── Mark one read + deep-link navigation ──────────────────────────────────
    function handleClickNotif(n: Notification) {
        if (n.read_at === null) {
            // Optimistic update
            setNotifications(prev =>
                prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)
            )
            setUnreadCount(c => Math.max(0, c - 1))
            fetchWithAuth(`${API_URL}/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {})
        }
        if (n.link) {
            setOpen(false)
            router.push(n.link)
        }
    }

    // ── Mark all read ─────────────────────────────────────────────────────────
    function markAllRead() {
        if (!token) return
        const now = new Date().toISOString()
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
        setUnreadCount(0)
        fetchWithAuth(`${API_URL}/api/notifications/read-all`, { method: "PATCH" }).catch(() => {})
    }

    const hasUnread = unreadCount > 0

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>

            {/* ── Bell button ── */}
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

            {/* ── Dropdown ── */}
            {open && (
                <div style={{
                    position: "absolute", right: 0, top: 44,
                    backgroundColor: C.white, borderRadius: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    border: "1px solid " + C.border,
                    width: 360, zIndex: 1001, overflow: "hidden",
                }}>

                    {/* Header — title + "Tout lire" */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 16px", borderBottom: "1px solid " + C.border,
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
                            Notifications {hasUnread && `(${unreadCount})`}
                        </span>
                        {hasUnread && (
                            <button
                                onClick={markAllRead}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: 12, color: C.muted, fontWeight: 600,
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    padding: "4px 8px", borderRadius: 6,
                                }}
                            >
                                <Check size={13} /> Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 380, overflowY: "auto" }}>
                        {loading && notifications.length === 0 ? (
                            <div style={{ padding: "28px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                                Chargement…
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: "40px 16px", textAlign: "center" }}>
                                <Bell size={28} color={C.muted} style={{ marginBottom: 8, opacity: 0.4 }} />
                                <div style={{ fontSize: 13, color: C.muted }}>Aucune notification</div>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const isUnread = n.read_at === null
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => handleClickNotif(n)}
                                        className="nb-row"
                                        style={{
                                            padding: "12px 16px",
                                            borderBottom: "1px solid " + C.border,
                                            cursor: n.link ? "pointer" : "default",
                                            backgroundColor: isUnread ? "rgba(244,207,21,0.08)" : "transparent",
                                        }}
                                    >
                                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                            {/* Type icon */}
                                            <div style={{
                                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                backgroundColor: C.bg,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                marginTop: 1,
                                            }}>
                                                <NotifIcon type={n.type} />
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Title row */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                                    {isUnread && (
                                                        <div style={{
                                                            width: 6, height: 6, borderRadius: "50%",
                                                            backgroundColor: C.yellow, flexShrink: 0,
                                                        }} />
                                                    )}
                                                    <span style={{
                                                        fontSize: 13,
                                                        fontWeight: isUnread ? 700 : 500,
                                                        color: C.dark,
                                                        lineHeight: 1.35,
                                                    }}>
                                                        {n.title}
                                                    </span>
                                                </div>
                                                {/* Message */}
                                                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>
                                                    {truncate(n.message, 72)}
                                                </div>
                                                {/* Relative time */}
                                                <div style={{ fontSize: 11, color: C.muted }}>
                                                    {timeAgo(n.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            <style>{`.nb-row:hover { background-color: ${C.surface} !important; }`}</style>
        </div>
    )
}
