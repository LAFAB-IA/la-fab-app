"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { FolderKanban, FileText, CreditCard, Cog, Pin, Bell } from "lucide-react"
import { timeAgo } from "@/lib/format"

interface Notification {
    id: string
    type: string
    title: string
    message: string
    read: boolean
    entity_type?: string
    entity_id?: string
    created_at: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    projet: <FolderKanban size={24} />,
    project: <FolderKanban size={24} />,
    facture: <FileText size={24} />,
    invoice: <FileText size={24} />,
    paiement: <CreditCard size={24} />,
    payment: <CreditCard size={24} />,
    "système": <Cog size={24} />,
    system: <Cog size={24} />,
}

function getEntityRoute(entityType?: string, entityId?: string): string | null {
    if (!entityType || !entityId) return null
    switch (entityType) {
        case "project": case "projet": return `/projet/${entityId}`
        case "invoice": case "facture": return `/facture/${entityId}`
        default: return null
    }
}

export default function NotificationCenter() {
    const router = useRouter()
    const { token } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [markingAll, setMarkingAll] = useState(false)

    const fetchNotifications = useCallback(async () => {
        if (!token) return
        try {
            const res = await fetchWithAuth(`${API_URL}/api/notifications`)
            const data = await res.json()
            if (data.ok !== false) {
                setNotifications(data.notifications || data || [])
            } else {
                setError("Impossible de charger les notifications.")
            }
        } catch {
            setError("Erreur réseau.")
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => { fetchNotifications() }, [fetchNotifications])

    const handleClick = async (notif: Notification) => {
        // Mark as read
        if (!notif.read) {
            try {
                await fetchWithAuth(`${API_URL}/api/notifications/${notif.id}/read`, {
                    method: "PATCH",
                })
                setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n))
            } catch { /* silent */ }
        }
        // Navigate to entity
        const route = getEntityRoute(notif.entity_type, notif.entity_id)
        if (route) router.push(route)
    }

    const handleMarkAllRead = async () => {
        setMarkingAll(true)
        try {
            await fetchWithAuth(`${API_URL}/api/notifications/read-all`, {
                method: "PATCH",
            })
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        } catch { /* silent */ }
        setMarkingAll(false)
    }

    const unreadCount = notifications.filter((n) => !n.read).length

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Notifications</h1>
                    {unreadCount > 0 && (
                        <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
                            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        style={{
                            padding: "8px 16px", borderRadius: 8, border: "1px solid " + C.border,
                            backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600,
                            cursor: "pointer", opacity: markingAll ? 0.6 : 1,
                        }}
                    >
                        {markingAll ? "..." : "Tout marquer comme lu"}
                    </button>
                )}
            </div>

            {error && <p style={{ color: "#c0392b", fontSize: 14 }}>✗ {error}</p>}

            {/* Empty state */}
            {notifications.length === 0 && !error && (
                <div style={{
                    textAlign: "center", padding: "60px 20px",
                    backgroundColor: C.white, borderRadius: 12,
                    border: "1px solid " + C.border,
                }}>
                    <div style={{ marginBottom: 16 }}><Bell size={48} style={{ color: C.muted, opacity: 0.4 }} /></div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: C.dark, margin: "0 0 8px" }}>
                        Aucune notification
                    </p>
                    <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                        Vous serez notifié des mises à jour de vos projets ici.
                    </p>
                </div>
            )}

            {/* Notification list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {notifications.map((notif) => {
                    const icon = TYPE_ICONS[notif.type] || <Pin size={24} />
                    const route = getEntityRoute(notif.entity_type, notif.entity_id)

                    return (
                        <div
                            key={notif.id}
                            onClick={() => handleClick(notif)}
                            style={{
                                display: "flex", alignItems: "flex-start", gap: 14,
                                padding: "16px 18px", borderRadius: 12,
                                backgroundColor: notif.read ? C.white : "#fef9e0",
                                border: "1px solid " + (notif.read ? C.border : "#f4cf1566"),
                                boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
                                cursor: route ? "pointer" : "default",
                                transition: "background-color 0.2s",
                            }}
                        >
                            <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
                                        {notif.title}
                                    </span>
                                    {!notif.read && (
                                        <span style={{
                                            padding: "2px 8px", borderRadius: 10, fontSize: 10,
                                            fontWeight: 700, backgroundColor: C.yellow, color: C.dark,
                                        }}>
                                            Non lu
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: 13, color: C.muted, margin: "0 0 6px", lineHeight: 1.4 }}>
                                    {notif.message}
                                </p>
                                <span style={{ fontSize: 11, color: C.muted }}>
                                    {timeAgo(notif.created_at)}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
