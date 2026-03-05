"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const { useEffect, useState } = React

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    PROJECT_CREATED:             { label: "Projet créé",       bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    PROJECT_STATUS_UPDATED:      { label: "Statut modifié",    bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    PROJECT_DELETED:             { label: "Projet supprimé",   bg: "#fde8e8", color: "#c0392b", border: "#f5c6c6" },
    PROJECT_ADMIN_NOTE_UPDATED:  { label: "Note admin",        bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    ORDER_VALIDATED:             { label: "Commande validée",  bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    QUOTE_UPLOADED:              { label: "Devis uploadé",     bg: "#f3e8fe", color: "#6a1a7a", border: "#c8a8db" },
    USER_ROLE_CHANGED:           { label: "Rôle modifié",      bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    INVOICE_GENERATED:           { label: "Facture générée",   bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
}

const ENTITY_TYPES = ["project", "invoice", "user", "supplier", "webhook", "catalogue"]

interface AuditLog {
    id: string
    action: string
    entity_type: string
    entity_id: string
    user_id: string
    user_email: string
    user_role: string
    metadata: Record<string, unknown> | null
    ip_address: string
    created_at: string
}

function ActionBadge({ action }: { action: string }) {
    const ac = ACTION_CONFIG[action] || { label: action, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return (
        <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: ac.bg, color: ac.color, border: "1px solid " + ac.border, whiteSpace: "nowrap",
        }}>
            {ac.label}
        </span>
    )
}

export default function AdminAudit() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [filterAction, setFilterAction] = useState("all")
    const [filterEntity, setFilterEntity] = useState("all")
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, pages: 1 })
    const perPage = 25

    function fetchLogs(p: number, action?: string, entity?: string) {
        if (!token) return
        setLoading(true)
        const params = new URLSearchParams({ page: String(p), limit: String(perPage) })
        if (action && action !== "all") params.set("action", action)
        if (entity && entity !== "all") params.set("entity_type", entity)

        fetch(`${API_URL}/api/admin/audit-logs?${params}`, { headers: { Authorization: "Bearer " + token } })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setLogs(data.logs || [])
                    setPagination({ total: data.pagination?.total || 0, pages: data.pagination?.pages || 1 })
                } else {
                    setError("Accès refusé ou erreur serveur")
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }
        fetchLogs(1)
    }, [token, isAuthenticated, authLoading])

    function handleFilterChange(newAction: string, newEntity: string, newPage: number) {
        setFilterAction(newAction)
        setFilterEntity(newEntity)
        setPage(newPage)
        fetchLogs(newPage, newAction, newEntity)
    }

    if (error && !logs.length) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>❌ {error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 960, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Journal d'audit · {pagination.total} entrée{pagination.total > 1 ? "s" : ""}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <select
                        value={filterAction}
                        onChange={(e) => handleFilterChange(e.target.value, filterEntity, 1)}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Toutes les actions</option>
                        {Object.entries(ACTION_CONFIG).map(([key, ac]) => (
                            <option key={key} value={key}>{ac.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterEntity}
                        onChange={(e) => handleFilterChange(filterAction, e.target.value, 1)}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Toutes les ressources</option>
                        {ENTITY_TYPES.map((rt) => (
                            <option key={rt} value={rt}>{rt.charAt(0).toUpperCase() + rt.slice(1)}</option>
                        ))}
                    </select>
                </div>

                {/* Logs list */}
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                        <p style={{ color: C.muted }}>Chargement...</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {logs.map((log) => (
                            <div key={log.id} style={{ background: C.white, borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 4px rgba(58,64,64,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                                        <ActionBadge action={log.action} />
                                        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, padding: "2px 8px", backgroundColor: C.bg, borderRadius: 6, border: "1px solid " + C.border }}>
                                            {log.entity_type}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>
                                        {log.user_email || log.user_id?.slice(0, 8) + "..."} · {log.entity_id?.slice(0, 16)}{(log.entity_id?.length || 0) > 16 ? "..." : ""} · {log.ip_address || "—"}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", textAlign: "right" }}>
                                    {new Date(log.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                    <br />
                                    {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                            </div>
                        ))}

                        {logs.length === 0 && (
                            <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                                Aucun log trouvé
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 28 }}>
                        <button
                            onClick={() => handleFilterChange(filterAction, filterEntity, Math.max(1, page - 1))}
                            disabled={page === 1}
                            style={{ padding: "8px 16px", background: C.white, color: page === 1 ? C.muted : C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer" }}
                        >
                            ← Précédent
                        </button>
                        <span style={{ fontSize: 13, color: C.muted }}>
                            Page {page} / {pagination.pages}
                        </span>
                        <button
                            onClick={() => handleFilterChange(filterAction, filterEntity, Math.min(pagination.pages, page + 1))}
                            disabled={page === pagination.pages}
                            style={{ padding: "8px 16px", background: C.white, color: page === pagination.pages ? C.muted : C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: page === pagination.pages ? "not-allowed" : "pointer" }}
                        >
                            Suivant →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
