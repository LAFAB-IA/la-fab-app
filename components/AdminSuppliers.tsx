"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { XCircle, Mail, Copy, MapPin, ChevronDown } from "lucide-react"
import { formatPrice } from "@/lib/format"

const { useEffect, useState, useMemo } = React

// ─── Config ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    preferred:  { label: "Préféré",     bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    standard:   { label: "Standard",    bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    occasional: { label: "Occasionnel", bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    active: { label: "Actif",   bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    off:    { label: "Inactif", bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" },
}

interface Supplier {
    id: string
    supplier_id: string
    name: string
    status: string
    partner_tier: string
    trust_score: number | null
    city: string | null
    price_grid_count: number
    // Enriched from dashboard data
    email?: string
    phone?: string
    address?: string
    services?: string[]
    latitude?: number
    longitude?: number
    consultations_received?: number
    consultations_replied?: number
    response_rate?: number
    estimated_revenue?: number
}

interface TopSupplier {
    supplier_id: string
    name: string
    reply_count: number
    avg_price: number
}

interface DashboardStats {
    supplier_stats: {
        total: number
        active: number
        with_catalog: number
        top_suppliers: TopSupplier[]
    }
    consultation_stats: {
        total: number
        by_status: Record<string, number>
        response_rate: number
        avg_response_time_hours: number | null
    }
}

interface Consultation {
    consultation_id: string
    project_id: string
    supplier_id: string
    status: string
    supplier_price: number | null
    sent_at: string | null
    replied_at: string | null
    created_at: string
}

type SortKey = "name" | "city" | "partner_tier" | "trust_score" | "consultations_received" | "consultations_replied" | "response_rate" | "estimated_revenue" | "status"

// ─── Badges ──────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
    const tc = TIER_CONFIG[tier] || { label: tier || "—", bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: tc.bg, color: tc.color, border: "1px solid " + tc.border, whiteSpace: "nowrap" }}>{tc.label}</span>
}

function SupplierStatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>{sc.label}</span>
}

// ─── Bar chart helper ────────────────────────────────────────────────────────

function HBar({ label, value, max, suffix, color }: { label: string; value: number; max: number; suffix?: string; color?: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 140, fontSize: 13, color: C.dark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: 20, backgroundColor: C.bg, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", backgroundColor: color || C.yellow, borderRadius: 6, transition: "width 0.4s ease", minWidth: value > 0 ? 4 : 0 }} />
            </div>
            <div style={{ width: 70, fontSize: 12, color: C.muted, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{value}{suffix || ""}</div>
        </div>
    )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", backgroundColor: color || C.yellow, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, minWidth: 36, textAlign: "right" }}>{pct}%</span>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminSuppliers() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [backendStats, setBackendStats] = useState<{ total: number; active: number; inactive: number }>({ total: 0, active: 0, inactive: 0 })
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Filters
    const [search, setSearch] = useState("")
    const [filterTier, setFilterTier] = useState("all")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterCity, setFilterCity] = useState("all")

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortAsc, setSortAsc] = useState(true)

    // Expand
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [expandedConsultations, setExpandedConsultations] = useState<Record<string, Consultation[]>>({})
    const [loadingConsultations, setLoadingConsultations] = useState<string | null>(null)
    const [changingId, setChangingId] = useState<string | null>(null)

    // Products
    const [supplierProducts, setSupplierProducts] = useState<Record<string, any[]>>({})
    const [loadingProducts, setLoadingProducts] = useState<string | null>(null)
    const [showAllProducts, setShowAllProducts] = useState<Record<string, boolean>>({})

    // ── Fetch data ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        Promise.all([
            fetch(API_URL + "/api/admin/suppliers/stats", { headers: { Authorization: "Bearer " + token } }).then(r => r.json()),
            fetch(API_URL + "/api/admin/dashboard", { headers: { Authorization: "Bearer " + token } }).then(r => r.json()),
        ])
            .then(([suppData, dashData]) => {
                if (suppData.ok) {
                    setSuppliers(suppData.suppliers || [])
                    setBackendStats(suppData.stats || { total: 0, active: 0, inactive: 0 })
                } else {
                    setError("Erreur chargement fournisseurs")
                }
                if (dashData.ok) {
                    setDashboardData({
                        supplier_stats: dashData.supplier_stats,
                        consultation_stats: dashData.consultation_stats,
                    })
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    // ── Enrich suppliers with consultation data ──────────────────────────────

    const enrichedSuppliers = useMemo(() => {
        if (!dashboardData) return suppliers
        const topMap = new Map<string, TopSupplier>()
        for (const ts of dashboardData.supplier_stats.top_suppliers || []) {
            topMap.set(ts.supplier_id, ts)
        }
        return suppliers.map(s => {
            const top = topMap.get(s.supplier_id)
            const replied = top?.reply_count || 0
            const received = replied > 0 ? Math.round(replied / ((dashboardData.consultation_stats.response_rate || 50) / 100)) : 0
            return {
                ...s,
                consultations_received: received,
                consultations_replied: replied,
                response_rate: received > 0 ? Math.round((replied / received) * 100) : 0,
                estimated_revenue: top ? Math.round(top.avg_price * top.reply_count) : 0,
            }
        })
    }, [suppliers, dashboardData])

    // ── Computed ─────────────────────────────────────────────────────────────

    const cities = useMemo(() => {
        const set = new Set(enrichedSuppliers.map(s => s.city).filter(Boolean) as string[])
        return Array.from(set).sort()
    }, [enrichedSuppliers])

    const services = useMemo(() => {
        const map: Record<string, number> = {}
        for (const s of enrichedSuppliers) {
            for (const svc of s.services || []) {
                map[svc] = (map[svc] || 0) + 1
            }
        }
        return Object.entries(map).sort((a, b) => b[1] - a[1])
    }, [enrichedSuppliers])

    const avgTrust = enrichedSuppliers.length > 0
        ? Math.round(enrichedSuppliers.reduce((sum, s) => sum + (s.trust_score || 0), 0) / enrichedSuppliers.length * 100)
        : 0

    const totalConsReceived = enrichedSuppliers.reduce((sum, s) => sum + (s.consultations_received || 0), 0)
    const totalConsReplied = enrichedSuppliers.reduce((sum, s) => sum + (s.consultations_replied || 0), 0)
    const globalResponseRate = totalConsReceived > 0 ? Math.round((totalConsReplied / totalConsReceived) * 100) : 0
    const totalRevenue = enrichedSuppliers.reduce((sum, s) => sum + (s.estimated_revenue || 0), 0)

    // ── Filter + Sort ───────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = enrichedSuppliers.filter((s) => {
            if (filterTier !== "all" && s.partner_tier !== filterTier) return false
            if (filterStatus !== "all" && s.status !== filterStatus) return false
            if (filterCity !== "all" && s.city !== filterCity) return false
            if (search) {
                const q = search.toLowerCase()
                if (!s.name.toLowerCase().includes(q) && !(s.supplier_id || "").toLowerCase().includes(q) && !(s.city || "").toLowerCase().includes(q)) return false
            }
            return true
        })

        list.sort((a, b) => {
            let av: any, bv: any
            switch (sortKey) {
                case "name": av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break
                case "city": av = (a.city || "").toLowerCase(); bv = (b.city || "").toLowerCase(); break
                case "partner_tier": av = a.partner_tier || ""; bv = b.partner_tier || ""; break
                case "trust_score": av = a.trust_score || 0; bv = b.trust_score || 0; break
                case "consultations_received": av = a.consultations_received || 0; bv = b.consultations_received || 0; break
                case "consultations_replied": av = a.consultations_replied || 0; bv = b.consultations_replied || 0; break
                case "response_rate": av = a.response_rate || 0; bv = b.response_rate || 0; break
                case "estimated_revenue": av = a.estimated_revenue || 0; bv = b.estimated_revenue || 0; break
                case "status": av = a.status; bv = b.status; break
                default: av = a.name; bv = b.name
            }
            if (av < bv) return sortAsc ? -1 : 1
            if (av > bv) return sortAsc ? 1 : -1
            return 0
        })

        return list
    }, [enrichedSuppliers, search, filterTier, filterStatus, filterCity, sortKey, sortAsc])

    // Top 5 for charts
    const top5 = useMemo(() =>
        [...enrichedSuppliers].sort((a, b) => (b.consultations_replied || 0) - (a.consultations_replied || 0)).slice(0, 5),
        [enrichedSuppliers]
    )

    const top10Response = useMemo(() =>
        [...enrichedSuppliers].filter(s => (s.consultations_received || 0) > 0).sort((a, b) => (b.response_rate || 0) - (a.response_rate || 0)).slice(0, 10),
        [enrichedSuppliers]
    )

    // ── Actions ─────────────────────────────────────────────────────────────

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(true) }
    }

    function handleTierChange(supplierId: string, newTier: string) {
        if (!token) return
        setChangingId(supplierId)
        fetch(`${API_URL}/api/supplier/${supplierId}`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ partner_tier: newTier }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, partner_tier: newTier } : s))
                setChangingId(null)
            })
            .catch(() => setChangingId(null))
    }

    function handleStatusToggle(supplierId: string, currentStatus: string) {
        if (!token) return
        const newStatus = currentStatus === "active" ? "off" : "active"
        setChangingId(supplierId)
        fetch(`${API_URL}/api/supplier/${supplierId}`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, status: newStatus } : s))
                setChangingId(null)
            })
            .catch(() => setChangingId(null))
    }

    function loadConsultations(supplierId: string) {
        if (!token || expandedConsultations[supplierId]) return
        setLoadingConsultations(supplierId)
        // No direct endpoint for supplier consultations, use dashboard data
        // We'll show what we know from top_suppliers
        setLoadingConsultations(null)
    }

    function loadProducts(supplierId: string) {
        if (!token || supplierProducts[supplierId]) return
        setLoadingProducts(supplierId)
        fetch(`${API_URL}/api/admin/supplier/${supplierId}/products`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok) setSupplierProducts(prev => ({ ...prev, [supplierId]: data.products || [] }))
                setLoadingProducts(null)
            })
            .catch(() => setLoadingProducts(null))
    }

    // ── Column header helper ────────────────────────────────────────────────

    function ColHeader({ label, colKey, width }: { label: string; colKey: SortKey; width?: number }) {
        const isActive = sortKey === colKey
        return (
            <div
                onClick={() => handleSort(colKey)}
                style={{ width, flex: width ? undefined : 1, fontSize: 11, fontWeight: 600, color: isActive ? C.dark : C.muted, textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
            >
                {label}
                {isActive && <span style={{ fontSize: 10 }}>{sortAsc ? "▲" : "▼"}</span>}
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement fournisseurs...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}><XCircle size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} /> {error}</p>
        </div>
    )

    const maxReplied = Math.max(...top5.map(s => s.consultations_replied || 0), 1)
    const maxService = services.length > 0 ? services[0][1] : 1

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Tableau de bord fournisseurs</p>
                    </div>
                    <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
                </div>

                {/* ── KPI Cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 32 }}>
                    {[
                        { label: "Total fournisseurs", value: String(backendStats.total), color: C.dark },
                        { label: "Actifs", value: String(backendStats.active), color: "#1a7a3c" },
                        { label: "Confiance moy.", value: avgTrust + "%", color: "#b89a00" },
                        { label: "Consultations", value: String(totalConsReceived), color: C.dark },
                        { label: "Réponses", value: totalConsReplied + " (" + globalResponseRate + "%)", color: "#1a3c7a" },
                        { label: "CA estimé", value: formatPrice(totalRevenue), color: "#e65100" },
                    ].map((kpi) => (
                        <div key={kpi.label} style={{ background: C.white, borderRadius: 12, padding: "14px 10px", textAlign: "center", border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                            <div style={{ fontSize: 18, fontWeight: 600, color: kpi.color }}>{kpi.value}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.3 }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Charts ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                    {/* Top 5 most active */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 20, border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Top 5 — Plus actifs
                        </div>
                        {top5.length > 0 ? top5.map(s => (
                            <HBar key={s.supplier_id} label={s.name} value={s.consultations_replied || 0} max={maxReplied} suffix=" rép." />
                        )) : (
                            <div style={{ fontSize: 13, color: C.muted }}>Aucune donnée</div>
                        )}
                    </div>

                    {/* By service */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 20, border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Répartition par métier
                        </div>
                        {services.length > 0 ? services.slice(0, 8).map(([svc, count]) => (
                            <HBar key={svc} label={svc} value={count} max={maxService} color="#a8b8db" />
                        )) : (
                            <div style={{ fontSize: 13, color: C.muted }}>Aucun métier renseigné</div>
                        )}
                    </div>
                </div>

                {/* Response rate chart */}
                {top10Response.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 12, padding: 20, border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginBottom: 32 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Taux de réponse — Top 10
                        </div>
                        {top10Response.map(s => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                                <div style={{ width: 140, fontSize: 13, color: C.dark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{s.name}</div>
                                <div style={{ flex: 1 }}>
                                    <ProgressBar value={s.consultations_replied || 0} max={s.consultations_received || 1} color={
                                        (s.response_rate || 0) >= 75 ? "#1a7a3c" : (s.response_rate || 0) >= 40 ? "#b89a00" : "#c0392b"
                                    } />
                                </div>
                                <div style={{ fontSize: 11, color: C.muted, minWidth: 60, textAlign: "right" }}>
                                    {s.consultations_replied || 0}/{s.consultations_received || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Filters ── */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par nom, ID, ville..."
                        style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                    />
                    <div style={{ position: "relative", display: "inline-block" }}>
                        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} style={{ ...selectStyle, paddingRight: 32, appearance: "none" as const }}>
                            <option value="all">Tous les tiers</option>
                            {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <ChevronDown size={14} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted}} />
                    </div>
                    <div style={{ position: "relative", display: "inline-block" }}>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, paddingRight: 32, appearance: "none" as const }}>
                            <option value="all">Tous statuts</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <ChevronDown size={14} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted}} />
                    </div>
                    {cities.length > 1 && (
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{ ...selectStyle, paddingRight: 32, appearance: "none" as const }}>
                                <option value="all">Toutes villes</option>
                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted}} />
                        </div>
                    )}
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                    {filtered.length} fournisseur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                </div>

                {/* ── Table header ── */}
                <div style={{ display: "flex", gap: 8, padding: "10px 20px", backgroundColor: "#F8F8F6", borderRadius: "10px 10px 0 0", border: "1px solid " + C.border, borderBottom: "1px solid #e8e8e6" }}>
                    <ColHeader label="Nom" colKey="name" width={160} />
                    <ColHeader label="Ville" colKey="city" width={90} />
                    <ColHeader label="Tier" colKey="partner_tier" width={90} />
                    <ColHeader label="Confiance" colKey="trust_score" width={80} />
                    <ColHeader label="Reçues" colKey="consultations_received" width={60} />
                    <ColHeader label="Réponses" colKey="consultations_replied" width={70} />
                    <ColHeader label="Taux" colKey="response_rate" width={60} />
                    <ColHeader label="CA est." colKey="estimated_revenue" width={80} />
                    <ColHeader label="Statut" colKey="status" width={70} />
                </div>

                {/* ── Table rows ── */}
                <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid " + C.border, borderRight: "1px solid " + C.border, borderBottom: "1px solid " + C.border, borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                    {filtered.map((s) => {
                        const isExpanded = expandedId === s.id
                        const isChanging = changingId === s.id

                        return (
                            <div key={s.id}>
                                {/* Row */}
                                <div
                                    onClick={() => { setExpandedId(isExpanded ? null : s.id); if (!isExpanded) { loadConsultations(s.supplier_id); loadProducts(s.supplier_id) } }}
                                    style={{ display: "flex", gap: 8, padding: "12px 20px", alignItems: "center", cursor: "pointer", backgroundColor: isExpanded ? "#fef9e0" : C.white, borderBottom: "1px solid " + C.border, transition: "background-color 0.15s" }}
                                >
                                    <div style={{ width: 160, fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                                    <div style={{ width: 90, fontSize: 12, color: C.muted }}>{s.city || "—"}</div>
                                    <div style={{ width: 90 }}><TierBadge tier={s.partner_tier} /></div>
                                    <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: (s.trust_score || 0) >= 0.7 ? "#1a7a3c" : (s.trust_score || 0) >= 0.4 ? "#b89a00" : "#c0392b" }}>
                                        {s.trust_score != null ? Math.round(s.trust_score * 100) + "%" : "—"}
                                    </div>
                                    <div style={{ width: 60, fontSize: 13, color: C.dark, textAlign: "center" }}>{s.consultations_received || 0}</div>
                                    <div style={{ width: 70, fontSize: 13, color: C.dark, textAlign: "center" }}>{s.consultations_replied || 0}</div>
                                    <div style={{ width: 60, fontSize: 12, fontWeight: 600, color: (s.response_rate || 0) >= 75 ? "#1a7a3c" : (s.response_rate || 0) >= 40 ? "#b89a00" : "#c0392b", textAlign: "center" }}>
                                        {s.consultations_received ? s.response_rate + "%" : "—"}
                                    </div>
                                    <div style={{ width: 80, fontSize: 12, color: C.dark, fontWeight: 500, textAlign: "right" }}>
                                        {s.estimated_revenue ? formatPrice(s.estimated_revenue) : "—"}
                                    </div>
                                    <div style={{ width: 70 }}><SupplierStatusBadge status={s.status} /></div>
                                </div>

                                {/* Expanded panel */}
                                {isExpanded && (
                                    <div style={{ padding: 20, backgroundColor: "#fefdf5", borderBottom: "1px solid " + C.border }}>

                                        {/* Contact + info */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px 24px", marginBottom: 20, backgroundColor: C.white, borderRadius: 12, padding: 16, border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                                            {[
                                                { label: "ID", val: s.supplier_id },
                                                { label: "Ville", val: s.city || "—" },
                                                { label: "Score confiance", val: s.trust_score != null ? Math.round(s.trust_score * 100) + "%" : "—" },
                                                { label: "Grilles tarifaires", val: String(s.price_grid_count) },
                                                { label: "Tier", val: TIER_CONFIG[s.partner_tier]?.label || s.partner_tier || "—" },
                                                { label: "Consultations reçues", val: String(s.consultations_received || 0) },
                                                { label: "Réponses", val: String(s.consultations_replied || 0) },
                                                { label: "CA estimé", val: formatPrice(s.estimated_revenue || 0) },
                                            ].map((item, idx) => (
                                                <div key={idx}>
                                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{item.label}</div>
                                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{item.val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Coordonnées GPS */}
                                        {(s.latitude || s.longitude) && (
                                            <div style={{ marginBottom: 16, padding: "10px 16px", backgroundColor: C.white, borderRadius: 8, border: "1px solid " + C.border, fontSize: 12, color: C.muted }}>
                                                <MapPin size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} /> Coordonnées : {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                                            </div>
                                        )}

                                        {/* Tier change */}
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                                                Modifier le tier
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {Object.entries(TIER_CONFIG).map(([key, tc]) => {
                                                    const isCurrent = s.partner_tier === key
                                                    return (
                                                        <button key={key} onClick={() => !isCurrent && handleTierChange(s.id, key)} disabled={isCurrent || isChanging}
                                                            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: isCurrent ? "2px solid " + tc.color : "1px solid " + C.border, backgroundColor: isCurrent ? tc.bg : C.white, color: isCurrent ? tc.color : C.muted, cursor: isCurrent ? "default" : "pointer", opacity: isChanging ? 0.5 : 1 }}>
                                                            {tc.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Produits & Tarifs */}
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                                                Produits & Tarifs
                                            </div>
                                            {loadingProducts === s.supplier_id ? (
                                                <div style={{ fontSize: 13, color: C.muted, padding: "12px 0" }}>Chargement...</div>
                                            ) : supplierProducts[s.supplier_id] && supplierProducts[s.supplier_id].length > 0 ? (
                                                <div style={{ backgroundColor: C.white, borderRadius: 10, border: "1px solid " + C.border, overflow: "hidden" }}>
                                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 80px 70px", gap: 0, padding: "8px 14px", backgroundColor: "#F8F8F6", borderBottom: "1px solid " + C.border }}>
                                                        {["Produit", "Catégorie", "Dimensions", "Prix unit. HT", "Qté min", "Délai", "Source"].map(h => (
                                                            <div key={h} style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
                                                        ))}
                                                    </div>
                                                    {(showAllProducts[s.supplier_id] ? supplierProducts[s.supplier_id] : supplierProducts[s.supplier_id].slice(0, 5)).map((p: any, idx: number) => (
                                                        <div key={p.id || idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 80px 70px", gap: 0, padding: "8px 14px", borderBottom: "1px solid " + C.bg, fontSize: 12, alignItems: "center" }}>
                                                            <div style={{ color: C.dark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name || p.name || "—"}</div>
                                                            <div style={{ color: C.muted }}>{p.category || "—"}</div>
                                                            <div style={{ color: C.muted }}>{p.dimensions || "—"}</div>
                                                            <div style={{ color: C.dark, fontWeight: 600 }}>{p.unit_price != null ? formatPrice(Number(p.unit_price)) : "—"}</div>
                                                            <div style={{ color: C.muted }}>{p.min_quantity || "1"}</div>
                                                            <div style={{ color: C.muted }}>{p.lead_time_days ? p.lead_time_days + "j" : "—"}</div>
                                                            <div>
                                                                <span style={{
                                                                    padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                                                                    backgroundColor: p.source === "ai_extracted" ? "#fef9e0" : "#f0f0ee",
                                                                    color: p.source === "ai_extracted" ? "#b89a00" : "#7a8080",
                                                                    border: "1px solid " + (p.source === "ai_extracted" ? "#f4cf1588" : "#e0e0de"),
                                                                }}>
                                                                    {p.source === "ai_extracted" ? "IA" : "Manuel"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {supplierProducts[s.supplier_id].length > 5 && (
                                                        <button
                                                            onClick={() => setShowAllProducts(prev => ({ ...prev, [s.supplier_id]: !prev[s.supplier_id] }))}
                                                            style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", borderTop: "1px solid " + C.bg, fontSize: 12, color: C.muted, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
                                                        >
                                                            {showAllProducts[s.supplier_id]
                                                                ? "Réduire"
                                                                : `Voir la grille complète (${supplierProducts[s.supplier_id].length} produits)`}
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 13, color: C.muted, padding: "12px 16px", backgroundColor: C.white, borderRadius: 8, border: "1px solid " + C.border }}>
                                                    Aucune grille tarifaire — en attente d'upload
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                            <button
                                                onClick={() => handleStatusToggle(s.id, s.status)}
                                                disabled={isChanging}
                                                style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isChanging ? "not-allowed" : "pointer", opacity: isChanging ? 0.5 : 1, border: "1px solid " + C.border, backgroundColor: s.status === "active" ? "#fde8e8" : "#e8f8ee", color: s.status === "active" ? "#c0392b" : "#1a7a3c" }}
                                            >
                                                {s.status === "active" ? "Désactiver" : "Activer"}
                                            </button>
                                            {s.email && (
                                                <a href={"mailto:" + s.email} style={{ padding: "9px 18px", background: C.dark, color: C.white, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                                                    <Mail size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:6}} /> Envoyer un email
                                                </a>
                                            )}
                                            <button onClick={() => navigator.clipboard.writeText(s.supplier_id)} style={{ padding: "9px 18px", background: "none", color: C.muted, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                                                <Copy size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:6}} /> Copier ID
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {filtered.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            Aucun fournisseur trouvé
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const selectStyle: React.CSSProperties = {
    padding: "10px 14px", paddingRight: 32, appearance: "none" as const, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13,
    backgroundColor: C.white, color: C.dark, outline: "none",
}
