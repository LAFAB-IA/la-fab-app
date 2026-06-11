"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { formatPrice, formatDate } from "@/lib/format"
import { XCircle, Search, ChevronDown, ChevronLeft, ChevronRight, Users, UserCheck, UserPlus, TrendingUp, Mail, Phone, MapPin, Calendar, Briefcase, Loader2, AlertCircle } from "lucide-react"
import { ExportButton } from "@/components/admin/ExportButton"
import { StatsCards, StatItem } from "@/components/admin/StatsCards"

const { useEffect, useState, useMemo } = React

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    city: string | null
    active: boolean
    created_at: string
    projects_count: number
    total_spent: number
}

interface ClientStats {
    total: number
    active: number
    new_this_month: number
    top_clients: { name: string; total_spent: number }[]
}

// ─── ActiveSwitch ─────────────────────────────────────────────────────────────

function ActiveSwitch({ active, disabled, onChange }: { active: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!active) }}
            disabled={disabled}
            aria-pressed={active}
            title={active ? "Désactiver" : "Activer"}
            style={{
                width: 36, height: 20, borderRadius: 10,
                backgroundColor: active ? "var(--status-success-fg)" : C.border,
                border: "none", padding: 0, position: "relative",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "background-color 0.15s ease",
                flexShrink: 0,
            }}
        >
            <span style={{
                position: "absolute", top: 2, left: active ? 18 : 2,
                width: 16, height: 16, borderRadius: "50%",
                backgroundColor: "#FAFFFD",
                boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                transition: "left 0.15s ease",
            }} />
        </button>
    )
}

// ─── Column sort header ───────────────────────────────────────────────────────

type SortKey = "name" | "email" | "city" | "projects_count" | "total_spent" | "created_at"

function ColHeader({ label, colKey, sortKey, sortAsc, onSort, width }: {
    label: string; colKey: SortKey; sortKey: SortKey; sortAsc: boolean;
    onSort: (k: SortKey) => void; width?: number
}) {
    const active = sortKey === colKey
    return (
        <div
            onClick={() => onSort(colKey)}
            style={{
                width, flex: width ? undefined : 1,
                fontSize: 11, fontWeight: 600,
                color: active ? C.dark : C.muted,
                textTransform: "uppercase" as const, letterSpacing: 0.8,
                cursor: "pointer", userSelect: "none" as const,
                display: "flex", alignItems: "center", gap: 4,
            }}
        >
            {label}
            {active && <span style={{ fontSize: 9 }}>{sortAsc ? "▲" : "▼"}</span>}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function AdminClients() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()

    const [clients, setClients] = useState<Client[]>([])
    const [stats, setStats] = useState<ClientStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Filters
    const [search, setSearch] = useState("")
    const [filterActive, setFilterActive] = useState("all")

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>("created_at")
    const [sortAsc, setSortAsc] = useState(false)

    // Pagination
    const [page, setPage] = useState(0)

    // Status toggle
    const [changingId, setChangingId] = useState<string | null>(null)
    const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; next: boolean } | null>(null)

    // ── Fetch ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifié"); setLoading(false); return }

        // Load all clients (large per_page for client-side filtering)
        fetchWithAuth(`${API_URL}/api/admin/clients?page=1&per_page=500`)
            .then(r => r.json())
            .then(data => {
                if (data.ok) setClients(data.items || [])
                else setError("Erreur chargement clients")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })

        fetchWithAuth(`${API_URL}/api/admin/clients/stats`)
            .then(r => r.json())
            .then(data => { setStats(data); setStatsLoading(false) })
            .catch(() => setStatsLoading(false))
    }, [isAuthenticated, authLoading])

    // ── Status toggle ────────────────────────────────────────────────────────

    function requestToggle(client: Client) {
        const name = [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email
        setConfirmToggle({ id: client.id, name, next: !client.active })
    }

    function confirmStatusToggle() {
        if (!confirmToggle) return
        const { id, next } = confirmToggle
        setChangingId(id)
        setConfirmToggle(null)
        fetchWithAuth(`${API_URL}/api/admin/clients/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ active: next }),
        })
            .then(async r => {
                const data = await r.json().catch(() => ({}))
                if (r.ok && data?.ok !== false) {
                    setClients(prev => prev.map(c => c.id === id ? { ...c, active: next } : c))
                }
            })
            .finally(() => setChangingId(null))
    }

    // ── Sort helper ──────────────────────────────────────────────────────────

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(true) }
    }

    // ── Filter + sort + paginate ─────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = clients.filter(c => {
            if (filterActive === "active" && !c.active) return false
            if (filterActive === "inactive" && c.active) return false
            if (search) {
                const q = search.toLowerCase()
                const full = `${c.first_name} ${c.last_name}`.toLowerCase()
                return full.includes(q) || c.email.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q)
            }
            return true
        })

        list = [...list].sort((a, b) => {
            let av: string | number, bv: string | number
            switch (sortKey) {
                case "name": av = `${a.first_name} ${a.last_name}`.toLowerCase(); bv = `${b.first_name} ${b.last_name}`.toLowerCase(); break
                case "email": av = a.email.toLowerCase(); bv = b.email.toLowerCase(); break
                case "city": av = (a.city || "").toLowerCase(); bv = (b.city || "").toLowerCase(); break
                case "projects_count": av = a.projects_count; bv = b.projects_count; break
                case "total_spent": av = a.total_spent; bv = b.total_spent; break
                case "created_at": av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); break
                default: av = 0; bv = 0
            }
            if (av < bv) return sortAsc ? -1 : 1
            if (av > bv) return sortAsc ? 1 : -1
            return 0
        })

        return list
    }, [clients, search, filterActive, sortKey, sortAsc])

    // Reset page on filter/sort change
    useEffect(() => { setPage(0) }, [search, filterActive, sortKey])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    // ── Stats cards ──────────────────────────────────────────────────────────

    const statsItems: StatItem[] = stats ? [
        { icon: Users, label: "Total clients", value: String(stats.total), sub: `${stats.active} actif${stats.active > 1 ? "s" : ""}` },
        { icon: UserCheck, label: "Clients actifs", value: String(stats.active), sub: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% du total` : undefined },
        { icon: UserPlus, label: "Nouveaux ce mois", value: String(stats.new_this_month) },
        {
            icon: TrendingUp,
            label: "Top client",
            value: stats.top_clients?.[0] ? formatPrice(stats.top_clients[0].total_spent) : "—",
            sub: stats.top_clients?.[0]?.name,
        },
    ] : [
        { icon: Users, label: "Total clients", value: "—" },
        { icon: UserCheck, label: "Clients actifs", value: "—" },
        { icon: UserPlus, label: "Nouveaux ce mois", value: "—" },
        { icon: TrendingUp, label: "Top client", value: "—" },
    ]

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif", gap: 10, color: C.muted }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Chargement clients...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } } .ac-row:hover { background-color: #f0f0ee !important; }`}</style>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif", padding: 40 }}>
            <p style={{ color: "#c0392b", display: "flex", alignItems: "center", gap: 6 }}>
                <XCircle size={14} /> {error}
            </p>
        </div>
    )

    const selectStyle: React.CSSProperties = {
        padding: "9px 14px",
        border: "1px solid " + C.border,
        borderRadius: 8,
        fontSize: 13,
        backgroundColor: C.white,
        color: C.dark,
        outline: "none",
        cursor: "pointer",
    }

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 4px 0" }}>Clients</h1>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                            {filtered.length} client{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <ExportButton endpoint="/api/admin/clients/export" filename="clients" label="Exporter CSV" />
                        <a href="/admin/dashboard" style={{ padding: "9px 16px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            ← Dashboard
                        </a>
                    </div>
                </div>

                {/* ── Stats KPI ── */}
                <StatsCards items={statsItems} loading={statsLoading} />

                {/* ── Top clients bar chart ── */}
                {stats?.top_clients && stats.top_clients.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 12, padding: 20, border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginBottom: 28 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                            Top clients par CA
                        </div>
                        {(() => {
                            const maxVal = stats.top_clients[0]?.total_spent || 1
                            return stats.top_clients.slice(0, 5).map((tc, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                                    <div style={{ width: 150, fontSize: 13, color: C.dark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{tc.name}</div>
                                    <div style={{ flex: 1, height: 20, backgroundColor: C.bg, borderRadius: 6, overflow: "hidden" }}>
                                        <div style={{ width: Math.max((tc.total_spent / maxVal) * 100, 4) + "%", height: "100%", backgroundColor: C.yellow, borderRadius: 6, opacity: 0.8 }} />
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, minWidth: 90, textAlign: "right", flexShrink: 0 }}>{formatPrice(tc.total_spent)}</div>
                                </div>
                            ))
                        })()}
                    </div>
                )}

                {/* ── Filters ── */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Nom, email, ville..."
                            style={{ ...selectStyle, width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} style={{ ...selectStyle, paddingRight: 32, appearance: "none" as const }}>
                            <option value="all">Tous les statuts</option>
                            <option value="active">Actifs</option>
                            <option value="inactive">Inactifs</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                    </div>
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                    {filtered.length} client{filtered.length > 1 ? "s" : ""}
                    {totalPages > 1 && ` — page ${page + 1}/${totalPages}`}
                </div>

                {/* ── Table header ── */}
                <div style={{ display: "flex", gap: 8, padding: "10px 16px", backgroundColor: C.bg, borderRadius: "10px 10px 0 0", border: "1px solid " + C.border, borderBottom: "1px solid " + C.border }}>
                    <ColHeader label="Nom" colKey="name" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={170} />
                    <ColHeader label="Email" colKey="email" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={200} />
                    <div style={{ width: 110, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Téléphone</div>
                    <ColHeader label="Ville" colKey="city" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={100} />
                    <ColHeader label="Projets" colKey="projects_count" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={65} />
                    <ColHeader label="Total dépensé" colKey="total_spent" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={120} />
                    <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Statut</div>
                    <ColHeader label="Inscription" colKey="created_at" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} width={100} />
                    <div style={{ width: 55, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>Actif</div>
                </div>

                {/* ── Table rows ── */}
                <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid " + C.border, borderRight: "1px solid " + C.border, borderBottom: "1px solid " + C.border, borderRadius: "0 0 10px 10px", overflow: "hidden", marginBottom: 20 }}>
                    {paginated.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            <AlertCircle size={20} style={{ display: "block", margin: "0 auto 8px", color: C.muted }} />
                            Aucun client ne correspond aux critères.
                        </div>
                    ) : paginated.map(client => {
                        const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ") || "—"
                        const isChanging = changingId === client.id

                        return (
                            <div key={client.id} className="ac-row" style={{ display: "flex", gap: 8, padding: "12px 16px", alignItems: "center", backgroundColor: C.white, borderBottom: "1px solid " + C.bg, transition: "background-color 0.12s" }}
                            >
                                {/* Nom */}
                                <div style={{ width: 170, fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    title={fullName}>
                                    {fullName}
                                </div>

                                {/* Email */}
                                <div style={{ width: 200, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                                    <Mail size={12} color={C.muted} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={client.email}>
                                        {client.email}
                                    </span>
                                </div>

                                {/* Téléphone */}
                                <div style={{ width: 110, display: "flex", alignItems: "center", gap: 5 }}>
                                    {client.phone ? (
                                        <>
                                            <Phone size={12} color={C.muted} style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{client.phone}</span>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 12, color: C.muted }}>—</span>
                                    )}
                                </div>

                                {/* Ville */}
                                <div style={{ width: 100, display: "flex", alignItems: "center", gap: 5 }}>
                                    {client.city ? (
                                        <>
                                            <MapPin size={12} color={C.muted} style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.city}</span>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 12, color: C.muted }}>—</span>
                                    )}
                                </div>

                                {/* Nb projets */}
                                <div style={{ width: 65, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Briefcase size={12} color={C.muted} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: client.projects_count > 0 ? C.dark : C.muted }}>
                                        {client.projects_count}
                                    </span>
                                </div>

                                {/* Total dépensé */}
                                <div style={{ width: 120, fontSize: 13, fontWeight: 700, color: client.total_spent > 0 ? C.dark : C.muted }}>
                                    {client.total_spent > 0 ? formatPrice(client.total_spent) : "—"}
                                </div>

                                {/* Statut badge */}
                                <div style={{ width: 80 }}>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center",
                                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        backgroundColor: client.active ? "var(--status-success-bg)" : "var(--status-neutral-bg)",
                                        color: client.active ? "var(--status-success-fg)" : "var(--status-neutral-fg)",
                                        border: `1px solid ${client.active ? "var(--status-success-bd)" : "var(--status-neutral-bd)"}`,
                                    }}>
                                        {client.active ? "Actif" : "Inactif"}
                                    </span>
                                </div>

                                {/* Date inscription */}
                                <div style={{ width: 100, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Calendar size={11} color={C.muted} />
                                    <span style={{ fontSize: 11, color: C.muted }}>{formatDate(client.created_at)}</span>
                                </div>

                                {/* Toggle actif */}
                                <div style={{ width: 55, display: "flex", justifyContent: "center" }}>
                                    <ActiveSwitch
                                        active={client.active}
                                        disabled={isChanging}
                                        onChange={() => requestToggle(client)}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 32 }}>
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, fontSize: 13, fontWeight: 600, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                            <ChevronLeft size={14} /> Précédent
                        </button>
                        <span style={{ fontSize: 13, color: C.muted, padding: "0 12px" }}>
                            Page {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, fontSize: 13, fontWeight: 600, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                            Suivant <ChevronRight size={14} />
                        </button>
                    </div>
                )}

            </div>

            {/* ── Confirmation modal ── */}
            {confirmToggle && (
                <div
                    onClick={() => setConfirmToggle(null)}
                    style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
                    >
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: "0 0 8px" }}>
                            {confirmToggle.next ? "Activer" : "Désactiver"} ce client ?
                        </h3>
                        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
                            Confirmer {confirmToggle.next ? "l'activation" : "la désactivation"} de{" "}
                            <strong style={{ color: C.dark }}>{confirmToggle.name}</strong> ?
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setConfirmToggle(null)}
                                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmStatusToggle}
                                style={{ padding: "8px 20px", borderRadius: 8, border: "none", backgroundColor: confirmToggle.next ? "var(--status-success-fg)" : "#000000", color: "#FAFFFD", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
