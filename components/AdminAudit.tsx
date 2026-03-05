"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const { useEffect, useState } = React

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    create:   { label: "Création",     bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    update:   { label: "Modification", bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    delete:   { label: "Suppression",  bg: "#fde8e8", color: "#c0392b", border: "#f5c6c6" },
    login:    { label: "Connexion",    bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    export:   { label: "Export",       bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    status:   { label: "Statut",       bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    upload:   { label: "Upload",       bg: "#f3e8fe", color: "#6a1a7a", border: "#c8a8db" },
}

const RESOURCE_TYPES = ["project", "invoice", "user", "supplier", "webhook", "catalogue"]

interface AuditLog {
    id: string
    action: string
    resource_type: string
    resource_id: string
    user_id: string
    user_email: string
    details: string
    ip_address: string
    created_at: string
}

function ActionBadge({ action }: { action: string }) {
    const ac = ACTION_CONFIG[action] || { label: action, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return (
        <span style={{
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: ac.bg,
            color: ac.color,
            border: "1px solid " + ac.border,
            whiteSpace: "nowrap",
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
    const [search, setSearch] = useState("")
    const [filterAction, setFilterAction] = useState("all")
    const [filterResource, setFilterResource] = useState("all")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const perPage = 25

    function fetchLogs(p: number) {
        if (!token) return
        setLoading(true)
        const params = new URLSearchParams({ page: String(p), per_page: String(perPage) })
        if (filterAction !== "all") params.set("action", filterAction)
        if (filterResource !== "all") params.set("resource_type", filterResource)
        if (search) params.set("search", search)

        fetch(`${API_URL}/api/admin/audit?${params}`, { headers: { Authorization: "Bearer " + token } })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setLogs(data.logs)
                    setTotalPages(data.total_pages || 1)
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

    useEffect(() => {
        if (!token || authLoading || !isAuthenticated) return
        fetchLogs(page)
    }, [page, filterAction, filterResource])

    function handleSearch() {
        setPage(1)
        fetchLogs(1)
    }

    const actionCounts = Object.fromEntries(
        Object.keys(ACTION_CONFIG).map((a) => [a, logs.filter((l) => l.action === a).length])
    )

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
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Journal d'audit</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Rechercher par email, ID ressource..."
                        style={{ flex: 1, minWidth: 200, padding: "12px 16px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 14, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                    />
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Toutes les actions</option>
                        {Object.entries(ACTION_CONFIG).map(([key, ac]) => (
                            <option key={key} value={key}>{ac.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterResource}
                        onChange={(e) => { setFilterResource(e.target.value); setPage(1) }}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Toutes les ressources</option>
                        {RESOURCE_TYPES.map((rt) => (
                            <option key={rt} value={rt}>{rt.charAt(0).toUpperCase() + rt.slice(1)}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSearch}
                        style={{ padding: "10px 18px", background: C.yellow, color: C.dark, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                        Rechercher
                    </button>
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
                                            {log.resource_type}
                                        </span>
                                        <span style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>{log.details || "—"}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>
                                        {log.user_email || log.user_id?.slice(0, 8) + "..."} · {log.resource_id?.slice(0, 12)}... · {log.ip_address || "—"}
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
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 28 }}>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{ padding: "8px 16px", background: C.white, color: page === 1 ? C.muted : C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer" }}
                        >
                            ← Précédent
                        </button>
                        <span style={{ fontSize: 13, color: C.muted }}>
                            Page {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{ padding: "8px 16px", background: C.white, color: page === totalPages ? C.muted : C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: page === totalPages ? "not-allowed" : "pointer" }}
                        >
                            Suivant →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
