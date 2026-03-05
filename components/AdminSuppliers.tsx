"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const { useEffect, useState } = React

const TIER_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    preferred:  { label: "Préféré",    bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    standard:   { label: "Standard",   bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    occasional: { label: "Occasionnel", bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
}

const SUPPLIER_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
    active:   { label: "Actif",     bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    inactive: { label: "Inactif",   bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" },
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
}

function TierBadge({ tier }: { tier: string }) {
    const tc = TIER_CONFIG[tier] || { label: tier || "—", bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return (
        <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: tc.bg, color: tc.color, border: "1px solid " + tc.border, whiteSpace: "nowrap",
        }}>
            {tc.label}
        </span>
    )
}

function SupplierStatusBadge({ status }: { status: string }) {
    const sc = SUPPLIER_STATUS[status] || { label: status, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return (
        <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap",
        }}>
            {sc.label}
        </span>
    )
}

export default function AdminSuppliers() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [stats, setStats] = useState<{ total: number; active: number; inactive: number }>({ total: 0, active: 0, inactive: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterTier, setFilterTier] = useState("all")
    const [filterStatus, setFilterStatus] = useState("all")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [changingId, setChangingId] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }
        fetch(API_URL + "/api/admin/suppliers/stats", { headers: { Authorization: "Bearer " + token } })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setSuppliers(data.suppliers || [])
                    setStats(data.stats || { total: 0, active: 0, inactive: 0 })
                } else {
                    setError("Accès refusé ou erreur serveur")
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

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
                if (data.ok) setSuppliers((prev) => prev.map((s) => s.id === supplierId ? { ...s, partner_tier: newTier } : s))
                setChangingId(null)
            })
            .catch(() => setChangingId(null))
    }

    function handleStatusChange(supplierId: string, newStatus: string) {
        if (!token) return
        setChangingId(supplierId)
        fetch(`${API_URL}/api/supplier/${supplierId}`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setSuppliers((prev) => prev.map((s) => s.id === supplierId ? { ...s, status: newStatus } : s))
                setChangingId(null)
            })
            .catch(() => setChangingId(null))
    }

    const filtered = suppliers.filter((s) => {
        const matchTier = filterTier === "all" || s.partner_tier === filterTier
        const matchStatus = filterStatus === "all" || s.status === filterStatus
        const matchSearch =
            search === "" ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.supplier_id || "").toLowerCase().includes(search.toLowerCase()) ||
            (s.city || "").toLowerCase().includes(search.toLowerCase())
        return matchTier && matchStatus && matchSearch
    })

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement fournisseurs...</p>
        </div>
    )

    if (error) return (
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
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{stats.total} fournisseurs au total</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
                    {[
                        { label: "Total", value: stats.total, color: C.dark },
                        { label: "Actifs", value: stats.active, color: "#1a7a3c" },
                        { label: "Inactifs", value: stats.inactive, color: "#e65100" },
                    ].map((stat) => (
                        <div key={stat.label} style={{ background: C.white, borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid " + C.border }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par nom, ID, ville..."
                        style={{ flex: 1, minWidth: 200, padding: "12px 16px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 14, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                    />
                    <select
                        value={filterTier}
                        onChange={(e) => setFilterTier(e.target.value)}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Tous les tiers</option>
                        {Object.entries(TIER_CONFIG).map(([key, tc]) => (
                            <option key={key} value={key}>{tc.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    >
                        <option value="all">Tous les statuts</option>
                        {Object.entries(SUPPLIER_STATUS).map(([key, sc]) => (
                            <option key={key} value={key}>{sc.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    {filtered.length} fournisseur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                </div>

                {/* Supplier list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.map((supplier) => {
                        const isExpanded = expandedId === supplier.id
                        const isChanging = changingId === supplier.id

                        return (
                            <div key={supplier.id} style={{ background: C.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(58,64,64,0.08)" }}>

                                {/* Row */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{supplier.name}</span>
                                            <TierBadge tier={supplier.partner_tier} />
                                            <SupplierStatusBadge status={supplier.status} />
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            {supplier.supplier_id} · {supplier.city || "—"} · {supplier.price_grid_count} grille{supplier.price_grid_count > 1 ? "s" : ""} tarifaire{supplier.price_grid_count > 1 ? "s" : ""}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right", minWidth: 60 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#b89a00" }}>{supplier.trust_score != null ? Math.round(supplier.trust_score * 100) + "%" : "—"}</div>
                                        <div style={{ fontSize: 11, color: C.muted }}>Confiance</div>
                                    </div>
                                    <div style={{ fontSize: 18, color: C.muted }}>{isExpanded ? "▲" : "▼"}</div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid " + C.border, padding: 20 }}>

                                        {/* Info */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", marginBottom: 20, backgroundColor: C.bg, borderRadius: 10, padding: 16 }}>
                                            {[
                                                { label: "ID Fournisseur", val: supplier.supplier_id },
                                                { label: "Ville", val: supplier.city },
                                                { label: "Grilles tarifaires", val: String(supplier.price_grid_count) },
                                                { label: "Score confiance", val: supplier.trust_score != null ? Math.round(supplier.trust_score * 100) + "%" : "—" },
                                                { label: "Tier", val: TIER_CONFIG[supplier.partner_tier]?.label || supplier.partner_tier || "—" },
                                                { label: "Statut", val: SUPPLIER_STATUS[supplier.status]?.label || supplier.status },
                                            ].map((item, idx) => (
                                                <div key={idx}>
                                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{item.label}</div>
                                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{item.val || "—"}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tier change */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                                                Changer le tier
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {Object.entries(TIER_CONFIG).map(([key, tc]) => {
                                                    const isCurrent = supplier.partner_tier === key
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => !isCurrent && handleTierChange(supplier.id, key)}
                                                            disabled={isCurrent || isChanging}
                                                            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: isCurrent ? "2px solid " + tc.color : "1px solid " + C.border, backgroundColor: isCurrent ? tc.bg : C.white, color: isCurrent ? tc.color : C.muted, cursor: isCurrent ? "default" : "pointer", opacity: isChanging ? 0.5 : 1 }}
                                                        >
                                                            {tc.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Status change */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                                                Changer le statut
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {Object.entries(SUPPLIER_STATUS).map(([key, sc]) => {
                                                    const isCurrent = supplier.status === key
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => !isCurrent && handleStatusChange(supplier.id, key)}
                                                            disabled={isCurrent || isChanging}
                                                            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: isCurrent ? "2px solid " + sc.color : "1px solid " + C.border, backgroundColor: isCurrent ? sc.bg : C.white, color: isCurrent ? sc.color : C.muted, cursor: isCurrent ? "default" : "pointer", opacity: isChanging ? 0.5 : 1 }}
                                                        >
                                                            {sc.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                            <button onClick={() => navigator.clipboard.writeText(supplier.id)} style={{ padding: "9px 18px", background: "none", color: C.muted, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                                                📋 Copier ID
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
