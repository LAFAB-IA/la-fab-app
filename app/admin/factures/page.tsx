"use client"

import React, { useEffect, useState, useMemo } from "react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import StatusBadge from "@/components/shared/StatusBadge"
import { formatPrice, formatDate } from "@/lib/format"
import {
    TrendingUp, TrendingDown, AlertTriangle, Clock, CreditCard, Target,
    Search, ChevronDown, FileText, Download, ExternalLink, BarChart3,
    Users, XCircle, Loader2, Send, Eye, ChevronLeft, ChevronRight,
} from "lucide-react"
import PdfViewerModal from "@/components/ui/PdfViewerModal"

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

const STATUS_LABELS: Record<string, string> = {
    draft: "Brouillon", pending: "À payer", sent: "Envoyée",
    paid: "Payée", overdue: "En retard", cancelled: "Annulée",
}

function formatK(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + " K€"
    return Math.round(n) + " €"
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, badge, badgeColor }: {
    icon: React.ElementType; label: string; value: string; sub?: string
    badge?: number; badgeColor?: string
}) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(58,64,64,0.08)", position: "relative",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={C.muted} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
            {badge != null && badge > 0 && (
                <div style={{
                    position: "absolute", top: 12, right: 12, padding: "2px 8px", borderRadius: 10,
                    fontSize: 11, fontWeight: 700, backgroundColor: badgeColor || "#fde8e8", color: badgeColor === "#fef9e0" ? "#b89a00" : "#c0392b",
                }}>
                    {badge}
                </div>
            )}
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

function AdminInvoices() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterPayment, setFilterPayment] = useState("all")
    const [sortKey, setSortKey] = useState<"date" | "amount" | "due">("date")
    const [sortAsc, setSortAsc] = useState(false)
    const [page, setPage] = useState(0)
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [pdfModal, setPdfModal] = useState<{ url: string; title: string } | null>(null)
    const PAGE_SIZE = 20

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifié"); setLoading(false); return }
        fetchWithAuth(`${API_URL}/api/invoice/list`)
            .then(r => r.json())
            .then(data => { if (data.ok) setInvoices(data.invoices || []); else setError("Erreur chargement"); setLoading(false) })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [isAuthenticated, authLoading])

    // ── Computed KPIs ───────────────────────────────────────────────────────

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    const paid = invoices.filter(i => i.status === "paid")
    const caTotalTTC = paid.reduce((s, i) => s + Number(i.total || 0), 0)

    const caThisMonth = paid
        .filter(i => { const d = new Date(i.paid_at || i.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear })
        .reduce((s, i) => s + Number(i.total || 0), 0)
    const lastM = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMY = thisMonth === 0 ? thisYear - 1 : thisYear
    const caLastMonth = paid
        .filter(i => { const d = new Date(i.paid_at || i.created_at); return d.getMonth() === lastM && d.getFullYear() === lastMY })
        .reduce((s, i) => s + Number(i.total || 0), 0)
    const caUp = caThisMonth >= caLastMonth

    const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "draft" && i.status !== "cancelled")
    const unpaidAmount = unpaid.reduce((s, i) => s + Number(i.total || 0), 0)

    const overdue = invoices.filter(i => i.due_at && new Date(i.due_at) < now && i.status !== "paid" && i.status !== "draft" && i.status !== "cancelled")
    const overdueAmount = overdue.reduce((s, i) => s + Number(i.total || 0), 0)

    const depositPending = invoices.filter(i => i.payment_step === "deposit_paid")
    const balanceAmount = depositPending.reduce((s, i) => s + Number(i.balance_amount || 0), 0)

    const emitted = invoices.filter(i => i.status !== "draft")
    const encaissement = emitted.length > 0 ? Math.round((paid.length / emitted.length) * 100) : 0

    // ── Monthly revenue (12 months) ─────────────────────────────────────────

    const monthlyRevenue = useMemo(() => {
        const months: { month: string; amount: number; isCurrent: boolean }[] = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1)
            const mo = d.getMonth()
            const yr = d.getFullYear()
            const amount = paid
                .filter(inv => { const dt = new Date(inv.paid_at || inv.created_at); return dt.getMonth() === mo && dt.getFullYear() === yr })
                .reduce((s, inv) => s + Number(inv.total || 0), 0)
            months.push({ month: MONTH_NAMES[mo], amount, isCurrent: i === 0 })
        }
        return months
    }, [invoices])

    const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1)
    const avgMonthly = monthlyRevenue.reduce((s, m) => s + m.amount, 0) / 12

    // ── Status breakdown ────────────────────────────────────────────────────

    const statusBreakdown = useMemo(() => {
        const configs: { key: string; label: string; color: string; bg: string }[] = [
            { key: "draft", label: "Brouillon", color: "#7a8080", bg: "#e0e0de" },
            { key: "sent", label: "Envoyée", color: "#3b82f6", bg: "#dbeafe" },
            { key: "paid", label: "Payée", color: "#16a34a", bg: "#dcfce7" },
            { key: "overdue", label: "En retard", color: "#dc2626", bg: "#fde8e8" },
        ]
        return configs.map(c => {
            const items = invoices.filter(i => c.key === "overdue"
                ? (i.due_at && new Date(i.due_at) < now && i.status !== "paid" && i.status !== "draft" && i.status !== "cancelled")
                : i.status === c.key)
            return { ...c, count: items.length, amount: items.reduce((s, i) => s + Number(i.total || 0), 0) }
        })
    }, [invoices])

    const maxStatusCount = Math.max(...statusBreakdown.map(s => s.count), 1)

    // ── Top 5 clients ───────────────────────────────────────────────────────

    const topClients = useMemo(() => {
        const map: Record<string, { name: string; count: number; ca: number }> = {}
        for (const inv of paid) {
            const key = inv.client_email || inv.client_name || "inconnu"
            if (!map[key]) map[key] = { name: inv.client_name || inv.client_email || "—", count: 0, ca: 0 }
            map[key].count++
            map[key].ca += Number(inv.total || 0)
        }
        return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 5)
    }, [invoices])

    const maxClientCA = topClients.length > 0 ? topClients[0].ca : 1

    // ── Filtered + sorted table ─────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = invoices.filter(inv => {
            if (filterStatus !== "all" && inv.status !== filterStatus) return false
            if (filterPayment !== "all") {
                if (filterPayment === "split" && inv.payment_type !== "split") return false
                if (filterPayment === "full" && inv.payment_type === "split") return false
            }
            if (search) {
                const q = search.toLowerCase()
                return (inv.invoice_number || "").toLowerCase().includes(q)
                    || (inv.client_name || "").toLowerCase().includes(q)
                    || (inv.client_email || "").toLowerCase().includes(q)
                    || (inv.project_id || "").toLowerCase().includes(q)
            }
            return true
        })
        list.sort((a, b) => {
            let av: number, bv: number
            if (sortKey === "amount") { av = Number(a.total || 0); bv = Number(b.total || 0) }
            else if (sortKey === "due") { av = new Date(a.due_at || 0).getTime(); bv = new Date(b.due_at || 0).getTime() }
            else { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime() }
            return sortAsc ? av - bv : bv - av
        })
        return list
    }, [invoices, search, filterStatus, filterPayment, sortKey, sortAsc])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    // Reset page when filters change
    useEffect(() => { setPage(0) }, [search, filterStatus, filterPayment])

    function toggleSort(key: typeof sortKey) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(false) }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif" }}>
            <Loader2 size={20} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif", padding: 40 }}>
            <p style={{ color: "#c0392b", display: "flex", alignItems: "center", gap: 6 }}><XCircle size={14} /> {error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 1 — KPIs financiers (3×2)
                ══════════════════════════════════════════════════════════════ */}
                <div className="fin-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 32 }}>
                    <KpiCard icon={TrendingUp} label="CA Total TTC" value={formatPrice(caTotalTTC)}
                        sub={paid.length + " facture" + (paid.length > 1 ? "s" : "") + " encaissée" + (paid.length > 1 ? "s" : "")} />
                    <KpiCard icon={caUp ? TrendingUp : TrendingDown} label="CA Ce mois" value={formatPrice(caThisMonth)}
                        sub={"vs " + formatPrice(caLastMonth) + " mois dernier"} />
                    <KpiCard icon={AlertTriangle} label="Impayées" value={unpaid.length + " — " + formatPrice(unpaidAmount)}
                        badge={unpaid.length} badgeColor="#fde8e8" />
                    <KpiCard icon={Clock} label="En retard" value={overdue.length > 0 ? overdue.length + " — " + formatPrice(overdueAmount) : "Aucune"}
                        badge={overdue.length} badgeColor="#fde8e8" />
                    <KpiCard icon={CreditCard} label="Acomptes en attente" value={depositPending.length > 0 ? depositPending.length + " — " + formatPrice(balanceAmount) : "Aucun"}
                        sub={depositPending.length > 0 ? "Solde restant à encaisser" : undefined}
                        badge={depositPending.length} badgeColor="#fef9e0" />
                    <KpiCard icon={Target} label="Taux d'encaissement" value={encaissement + "%"}
                        sub={emitted.length + " facture" + (emitted.length > 1 ? "s" : "") + " émise" + (emitted.length > 1 ? "s" : "")} />
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 2 — Graphique CA mensuel (12 mois)
                ══════════════════════════════════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <BarChart3 size={16} color={C.dark} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Chiffre d'affaires mensuel</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, paddingTop: 20 }}>
                        {monthlyRevenue.map((m, i) => (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                                    <div
                                        style={{
                                            width: "65%", borderRadius: "4px 4px 0 0", minHeight: 4,
                                            height: m.amount > 0 ? Math.max((m.amount / maxRevenue) * 100, 4) + "%" : "2px",
                                            backgroundColor: m.isCurrent ? C.yellow : C.dark,
                                            position: "relative",
                                        }}
                                        title={formatPrice(m.amount)}
                                    >
                                        {m.amount > 0 && (
                                            <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>
                                                {formatK(m.amount)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 8, fontWeight: 500 }}>{m.month}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 32, marginTop: 20, paddingTop: 16, borderTop: "1px solid " + C.bg }}>
                        <div style={{ fontSize: 13, color: C.muted }}>
                            Moyenne mensuelle : <strong style={{ color: C.dark }}>{formatPrice(avgMonthly)}</strong>
                        </div>
                        <div style={{ fontSize: 13, color: C.muted }}>
                            Projection annuelle : <strong style={{ color: C.dark }}>{formatPrice(avgMonthly * 12)}</strong>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 3 — Analyse par statut + Top clients
                ══════════════════════════════════════════════════════════════ */}
                <div className="fin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

                    {/* Répartition par statut */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <BarChart3 size={16} color={C.dark} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Répartition par statut</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {statusBreakdown.map(s => (
                                <div key={s.key}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{s.label}</span>
                                        <span style={{ fontSize: 12, color: C.muted }}>
                                            {s.count} — {formatPrice(s.amount)}
                                        </span>
                                    </div>
                                    <div style={{ height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{
                                            width: s.count > 0 ? Math.max((s.count / maxStatusCount) * 100, 4) + "%" : "0%",
                                            height: "100%", backgroundColor: s.color, borderRadius: 4,
                                            transition: "width 0.3s ease",
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top 5 clients */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <Users size={16} color={C.dark} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Top 5 clients par CA</span>
                        </div>
                        {topClients.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune donnée</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {topClients.map((c, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ width: 120, fontSize: 13, fontWeight: 500, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                                            {c.name}
                                        </div>
                                        <div style={{ flex: 1, height: 24, backgroundColor: C.bg, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                                            <div style={{
                                                width: Math.max((c.ca / maxClientCA) * 100, 6) + "%",
                                                height: "100%", backgroundColor: C.yellow, borderRadius: 4,
                                                opacity: 0.7,
                                            }} />
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, minWidth: 80, textAlign: "right", whiteSpace: "nowrap" }}>
                                            {formatPrice(c.ca)}
                                        </div>
                                        <div style={{ fontSize: 11, color: C.muted, minWidth: 20, textAlign: "right" }}>{c.count}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 4 — Tableau des factures
                ══════════════════════════════════════════════════════════════ */}

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher par n° facture, client, projet..."
                            style={{ width: "100%", padding: "10px 16px 10px 40px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ padding: "10px 14px", paddingRight: 32, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", appearance: "none" as const, cursor: "pointer" }}>
                            <option value="all">Tous les statuts</option>
                            {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                    </div>
                    <div style={{ position: "relative" }}>
                        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                            style={{ padding: "10px 14px", paddingRight: 32, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", appearance: "none" as const, cursor: "pointer" }}>
                            <option value="all">Tous paiements</option>
                            <option value="full">Comptant</option>
                            <option value="split">Scindé</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                    </div>
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                    {filtered.length} facture{filtered.length > 1 ? "s" : ""}{totalPages > 1 ? ` — page ${page + 1}/${totalPages}` : ""}
                </div>

                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1.5fr 1fr 100px 90px 90px 100px 80px", gap: 8, padding: "10px 16px", backgroundColor: "#F8F8F6", borderRadius: "10px 10px 0 0", border: "1px solid " + C.border, borderBottom: "none" }}>
                    {[
                        { label: "N°", key: "date" as const },
                        { label: "Client", key: null },
                        { label: "Projet", key: null },
                        { label: "Montant", key: "amount" as const },
                        { label: "Paiement", key: null },
                        { label: "Statut", key: null },
                        { label: "Échéance", key: "due" as const },
                        { label: "Actions", key: null },
                    ].map((col, i) => (
                        <div key={i}
                            onClick={col.key ? () => toggleSort(col.key!) : undefined}
                            style={{ fontSize: 11, fontWeight: 600, color: col.key && sortKey === col.key ? C.dark : C.muted, textTransform: "uppercase", letterSpacing: 0.5, cursor: col.key ? "pointer" : "default", userSelect: "none", display: "flex", alignItems: "center", gap: 3 }}>
                            {col.label}
                            {col.key && sortKey === col.key && <span style={{ fontSize: 9 }}>{sortAsc ? "▲" : "▼"}</span>}
                        </div>
                    ))}
                </div>

                {/* Table rows */}
                <div style={{ borderLeft: "1px solid " + C.border, borderRight: "1px solid " + C.border, borderBottom: "1px solid " + C.border, borderRadius: "0 0 10px 10px", overflow: "hidden", marginBottom: 32 }}>
                    {paginated.map(inv => {
                        const isSplit = inv.payment_type === "split"
                        const depositPaid = inv.payment_step === "deposit_paid" || inv.payment_step === "fully_paid"
                        const balancePaid = inv.payment_step === "fully_paid"

                        return (
                            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "100px 1.5fr 1fr 100px 90px 90px 100px 80px", gap: 8, padding: "12px 16px", alignItems: "center", borderBottom: "1px solid " + C.bg, backgroundColor: C.white, fontSize: 13 }}>
                                <div style={{ fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {inv.invoice_number || "—"}
                                </div>
                                <div style={{ color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {inv.client_name || inv.client_email || "—"}
                                </div>
                                <div style={{ color: C.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {inv.project_id ? inv.project_id.slice(0, 12) : "—"}
                                </div>
                                <div style={{ fontWeight: 600, color: C.dark }}>
                                    {formatPrice(Number(inv.total || 0))}
                                </div>
                                <div>
                                    {isSplit ? (
                                        <div>
                                            <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, backgroundColor: "#fef9e0", color: "#b89a00", border: "1px solid #f4cf1588" }}>
                                                Scindé
                                            </span>
                                            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                                                {formatPrice(Number(inv.deposit_amount || 0))} {depositPaid ? "✓" : "..."}{" / "}
                                                {formatPrice(Number(inv.balance_amount || 0))} {balancePaid ? "✓" : "..."}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, backgroundColor: C.bg, color: C.muted, border: "1px solid " + C.border }}>
                                            Comptant
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <StatusBadge status={inv.status} type="invoice" />
                                </div>
                                <div style={{ fontSize: 12, color: inv.status === "overdue" || (inv.due_at && new Date(inv.due_at) < now && inv.status !== "paid") ? "#c0392b" : C.muted, fontWeight: 500 }}>
                                    {inv.due_at ? formatDate(inv.due_at) : "—"}
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={() => setSelectedInvoice(inv)} title="Voir" className="btn-icon" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                                        <Eye size={12} color={C.muted} />
                                    </button>
                                    {inv.pdf_url && (
                                        <button onClick={() => setPdfModal({ url: inv.pdf_url, title: `Facture ${inv.invoice_number || ""}` })} title="Voir PDF" className="btn-icon" style={{ width: 26, height: 26, borderRadius: 6, border: "none", backgroundColor: C.dark, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                                            <FileText size={12} color={C.white} />
                                        </button>
                                    )}
                                    {inv.status !== "paid" && inv.status !== "draft" && inv.status !== "cancelled" && (
                                        <button title="Relancer" className="btn-danger" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #f5c6c6", backgroundColor: "#fde8e8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                                            <Send size={12} color="#c0392b" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {paginated.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            Aucune facture trouvée
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 32 }}>
                        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                            className="btn-icon" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, cursor: page === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 0 ? 0.4 : 1 }}>
                            <ChevronLeft size={14} color={C.dark} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setPage(i)}
                                style={{ width: 32, height: 32, borderRadius: 6, border: i === page ? "none" : "1px solid " + C.border, backgroundColor: i === page ? C.yellow : C.white, color: C.dark, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {i + 1}
                            </button>
                        )).slice(Math.max(0, page - 2), page + 3)}
                        <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                            className="btn-icon" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                            <ChevronRight size={14} color={C.dark} />
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                DRAWER — Détail facture
            ══════════════════════════════════════════════════════════════ */}
            {selectedInvoice && (() => {
                const inv = selectedInvoice
                const isSplit = inv.payment_type === "split"
                const depositPaid = inv.payment_step === "deposit_paid" || inv.payment_step === "fully_paid"
                const balancePaid = inv.payment_step === "fully_paid"
                const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }
                const val: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: C.dark }

                return (
                    <div onClick={() => setSelectedInvoice(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
                        <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: "90vw", height: "100%", backgroundColor: C.white, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", padding: 32 }}>

                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <FileText size={18} color={C.dark} />
                                    <span style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>Détail facture</span>
                                </div>
                                <button onClick={() => setSelectedInvoice(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                                    <XCircle size={20} color={C.muted} />
                                </button>
                            </div>

                            {/* Infos grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", marginBottom: 28 }}>
                                <div>
                                    <div style={lbl}>N° Facture</div>
                                    <div style={{ ...val, fontWeight: 700 }}>{inv.invoice_number || "—"}</div>
                                </div>
                                <div>
                                    <div style={lbl}>Statut</div>
                                    <StatusBadge status={inv.status} type="invoice" />
                                </div>
                                <div>
                                    <div style={lbl}>Client</div>
                                    <div style={val}>{inv.client_name || inv.client_email || "—"}</div>
                                </div>
                                <div>
                                    <div style={lbl}>Projet</div>
                                    <div style={{ ...val, fontSize: 12 }}>{inv.project_id || "—"}</div>
                                </div>
                                <div>
                                    <div style={lbl}>Montant TTC</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{formatPrice(Number(inv.total || 0))}</div>
                                </div>
                                <div>
                                    <div style={lbl}>Échéance</div>
                                    <div style={{ ...val, color: inv.due_at && new Date(inv.due_at) < now && inv.status !== "paid" ? "#c0392b" : C.dark }}>
                                        {inv.due_at ? formatDate(inv.due_at) : "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Paiement */}
                            <div style={{ background: C.bg, borderRadius: 10, padding: 20, marginBottom: 28 }}>
                                <div style={{ ...lbl, marginBottom: 12 }}>Type de paiement</div>
                                {isSplit ? (
                                    <div>
                                        <span style={{ padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: "#fef9e0", color: "#b89a00", border: "1px solid #f4cf1588" }}>
                                            Scindé
                                        </span>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                                            <div style={{ background: C.white, borderRadius: 8, padding: 14 }}>
                                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Acompte</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{formatPrice(Number(inv.deposit_amount || 0))}</div>
                                                <div style={{ fontSize: 11, marginTop: 4, color: depositPaid ? "#16a34a" : "#b89a00", fontWeight: 600 }}>
                                                    {depositPaid ? "Payé ✓" : "En attente"}
                                                </div>
                                            </div>
                                            <div style={{ background: C.white, borderRadius: 8, padding: 14 }}>
                                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Solde</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{formatPrice(Number(inv.balance_amount || 0))}</div>
                                                <div style={{ fontSize: 11, marginTop: 4, color: balancePaid ? "#16a34a" : "#b89a00", fontWeight: 600 }}>
                                                    {balancePaid ? "Payé ✓" : "En attente"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: C.bg, color: C.muted, border: "1px solid " + C.border }}>
                                        Comptant
                                    </span>
                                )}
                            </div>

                            {/* PDF button */}
                            {inv.pdf_url && (
                                <button onClick={() => { setSelectedInvoice(null); setPdfModal({ url: inv.pdf_url, title: `Facture ${inv.invoice_number || ""}` }); }} style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    width: "100%", padding: "12px 0", borderRadius: 8,
                                    backgroundColor: C.dark, color: C.white, fontSize: 14, fontWeight: 600,
                                    textDecoration: "none", border: "none", cursor: "pointer",
                                }}>
                                    <Eye size={16} /> Voir le PDF
                                </button>
                            )}
                        </div>
                    </div>
                )
            })()}

            {pdfModal && (
                <PdfViewerModal
                    url={pdfModal.url}
                    isOpen={true}
                    onClose={() => setPdfModal(null)}
                    title={pdfModal.title}
                />
            )}

            {/* Responsive */}
            <style>{`
                @media (max-width: 768px) {
                    .fin-grid-3 { grid-template-columns: 1fr 1fr !important; }
                    .fin-grid-2 { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminInvoices />
        </AuthGuard>
    )
}
