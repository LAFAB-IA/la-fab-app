"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { formatPrice, timeAgo } from "@/lib/format"
import {
    TrendingUp, TrendingDown, FolderOpen, Target, Clock,
    UserCheck, FolderPlus, FileText, CreditCard, Bell,
    AlertTriangle, XCircle, BarChart3, Users, Award,
    Activity, ArrowRight, Loader2,
} from "lucide-react"

const { useEffect, useState } = React

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; key: string }> = {
    created:       { label: "En attente",    bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588", key: "created" },
    quoted:        { label: "Devisé",        bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db",   key: "quoted" },
    validated:     { label: "Validé",        bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8",   key: "validated" },
    in_production: { label: "Production",    bg: "#fff3e0", color: "#e65100", border: "#ffcc80",   key: "in_production" },
    delivered:     { label: "Livré",         bg: "#e0f2f1", color: "#004d40", border: "#80cbc4",   key: "delivered" },
    archived:      { label: "Archivé",       bg: "#f5f5f5", color: "#616161", border: "#e0e0e0",   key: "archived" },
}

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatK(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + " K€"
    return n.toFixed(0) + " €"
}

function getAuditIcon(action: string) {
    if (action.includes("login") || action.includes("signup")) return UserCheck
    if (action.includes("project") || action.includes("create")) return FolderPlus
    if (action.includes("invoice")) return FileText
    if (action.includes("payment") || action.includes("paid")) return CreditCard
    return Bell
}

function getAuditLink(entityType: string, entityId: string): string | null {
    if (entityType === "project") return "/admin/projets?search=" + entityId
    if (entityType === "invoice") return "/admin/factures?search=" + entityId
    if (entityType === "user") return "/admin/users"
    return null
}

// ─── Card Component ─────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType; label: string; value: string; sub: string; accent?: boolean
}) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "20px 22px",
            boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
            borderTop: accent ? "3px solid " + C.yellow : "3px solid transparent",
            flex: 1, minWidth: 180,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    backgroundColor: accent ? "#fef9e0" : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon size={16} color={accent ? "#b89a00" : C.muted} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
        </div>
    )
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon size={16} color={C.dark} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{label}</span>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Data
    const [projects, setProjects] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [supplierStats, setSupplierStats] = useState<any[]>([])

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        const headers = { Authorization: "Bearer " + token }
        let done = 0
        const total = 4
        const check = () => { done++; if (done >= total) setLoading(false) }

        fetch(API_URL + "/api/admin/projects", { headers })
            .then(r => r.json())
            .then(d => { if (d.ok) setProjects(d.projects || []) })
            .catch(() => {})
            .finally(check)

        fetch(API_URL + "/api/invoice/list", { headers })
            .then(r => r.json())
            .then(d => { if (d.ok) setInvoices(d.invoices || []) })
            .catch(() => {})
            .finally(check)

        fetch(API_URL + "/api/admin/audit-logs?limit=10", { headers })
            .then(r => r.json())
            .then(d => { if (d.ok) setAuditLogs(d.logs || d.data || []) })
            .catch(() => {})
            .finally(check)

        fetch(API_URL + "/api/admin/suppliers/stats", { headers })
            .then(r => r.json())
            .then(d => { if (d.ok) setSupplierStats(d.suppliers || d.data || []) })
            .catch(() => {})
            .finally(check)
    }, [token, isAuthenticated, authLoading])

    // ── Computed KPIs ───────────────────────────────────────────────────────

    const paidInvoices = invoices.filter(i => i.status === "paid")
    const caTotalTTC = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0)

    // CA comparison: this month vs last month
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const caThisMonth = paidInvoices
        .filter(i => { const d = new Date(i.paid_at || i.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear })
        .reduce((s, i) => s + Number(i.total || 0), 0)
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
    const caLastMonth = paidInvoices
        .filter(i => { const d = new Date(i.paid_at || i.created_at); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear })
        .reduce((s, i) => s + Number(i.total || 0), 0)
    const caGrowth = caLastMonth > 0 ? Math.round(((caThisMonth - caLastMonth) / caLastMonth) * 100) : 0

    // Active projects
    const activeProjects = projects.filter(p => p.status !== "archived" && p.status !== "delivered")
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000
    const newThisWeek = projects.filter(p => new Date(p.created_at).getTime() > oneWeekAgo).length

    // Conversion rate
    const totalProjects = projects.length
    const convertedProjects = projects.filter(p => p.status === "validated" || p.status === "delivered" || p.status === "in_production").length
    const conversionRate = totalProjects > 0 ? Math.round((convertedProjects / totalProjects) * 100) : 0
    const pendingQuotes = projects.filter(p => p.status === "quoted").length

    // Average delivery time
    const deliveredProjects = projects.filter(p => p.status === "delivered" && p.updated_at && p.created_at)
    const avgDeliveryDays = deliveredProjects.length > 0
        ? Math.round(deliveredProjects.reduce((s, p) => s + (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000, 0) / deliveredProjects.length)
        : 0
    const inProductionCount = projects.filter(p => p.status === "in_production").length

    // ── Monthly revenue (last 6 months) ─────────────────────────────────────

    const monthlyRevenue: { month: string; amount: number; isCurrent: boolean }[] = []
    for (let i = 5; i >= 0; i--) {
        const m = new Date(thisYear, thisMonth - i, 1)
        const mo = m.getMonth()
        const yr = m.getFullYear()
        const amount = paidInvoices
            .filter(inv => { const d = new Date(inv.paid_at || inv.created_at); return d.getMonth() === mo && d.getFullYear() === yr })
            .reduce((s, inv) => s + Number(inv.total || 0), 0)
        monthlyRevenue.push({ month: MONTH_NAMES[mo], amount, isCurrent: i === 0 })
    }
    const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1)

    // ── Project distribution by status ──────────────────────────────────────

    const statusCounts = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        key, label: cfg.label, color: cfg.color, bg: cfg.bg, border: cfg.border,
        count: projects.filter(p => p.status === key).length,
    }))
    const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1)

    // ── Alerts ──────────────────────────────────────────────────────────────

    type Alert = { label: string; count: number; color: string; bg: string; link: string }
    const alerts: Alert[] = []

    const noQuote48h = projects.filter(p => p.status === "created" && Date.now() - new Date(p.created_at).getTime() > 48 * 3600 * 1000).length
    if (noQuote48h > 0) alerts.push({ label: "Projets sans devis depuis +48h", count: noQuote48h, color: "#c0392b", bg: "#fee", link: "/admin/projets?status=created" })

    const overdueInvoices = invoices.filter(i => i.status === "overdue").length
    if (overdueInvoices > 0) alerts.push({ label: "Factures impayées échues", count: overdueInvoices, color: "#e65100", bg: "#fff3e0", link: "/admin/factures?status=overdue" })

    const inactiveSuppliers = supplierStats.filter((s: any) => s.response_rate === 0 || s.status === "inactive").length
    if (inactiveSuppliers > 0) alerts.push({ label: "Fournisseurs inactifs", count: inactiveSuppliers, color: "#616161", bg: "#f5f5f5", link: "/admin/fournisseurs" })

    const noResponse72h = projects.filter(p => {
        if (p.status !== "quoted") return false
        return Date.now() - new Date(p.updated_at || p.created_at).getTime() > 72 * 3600 * 1000
    }).length
    if (noResponse72h > 0) alerts.push({ label: "Consultations sans réponse +72h", count: noResponse72h, color: "#b89a00", bg: "#fef9e0", link: "/admin/projets?status=quoted" })

    // ── Top 5 clients ───────────────────────────────────────────────────────

    const clientMap: Record<string, { name: string; projectCount: number; ca: number; lastProject: string }> = {}
    for (const p of projects) {
        const id = p.account_id
        if (!clientMap[id]) clientMap[id] = { name: id.slice(0, 12), projectCount: 0, ca: 0, lastProject: p.created_at }
        clientMap[id].projectCount++
        if (new Date(p.created_at) > new Date(clientMap[id].lastProject)) clientMap[id].lastProject = p.created_at
    }
    for (const inv of paidInvoices) {
        const proj = projects.find(p => p.project_id === inv.project_id)
        if (proj && clientMap[proj.account_id]) {
            clientMap[proj.account_id].ca += Number(inv.total || 0)
            if (inv.client_name) clientMap[proj.account_id].name = inv.client_name
        }
    }
    const topClients = Object.values(clientMap).sort((a, b) => b.ca - a.ca).slice(0, 5)

    // ── Top 5 suppliers ─────────────────────────────────────────────────────

    const topSuppliers = [...supplierStats]
        .sort((a: any, b: any) => (b.response_rate || 0) - (a.response_rate || 0))
        .slice(0, 5)

    // ── Render ───────────────────────────────────────────────────────────────

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
                    SECTION 1 — KPIs
                ══════════════════════════════════════════════════════════════ */}
                <div className="dash-kpis" style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                    <KpiCard
                        icon={TrendingUp}
                        label="CA Total TTC"
                        value={formatPrice(caTotalTTC)}
                        sub={caGrowth !== 0
                            ? (caGrowth > 0 ? "+" : "") + caGrowth + "% vs mois précédent"
                            : "Pas de comparaison disponible"}
                        accent
                    />
                    <KpiCard
                        icon={FolderOpen}
                        label="Projets actifs"
                        value={String(activeProjects.length)}
                        sub={newThisWeek + " nouveau" + (newThisWeek > 1 ? "x" : "") + " cette semaine"}
                    />
                    <KpiCard
                        icon={Target}
                        label="Taux de conversion"
                        value={conversionRate + "%"}
                        sub={pendingQuotes + " devis en attente de validation"}
                    />
                    <KpiCard
                        icon={Clock}
                        label="Délai moyen"
                        value={avgDeliveryDays > 0 ? avgDeliveryDays + "j" : "N/A"}
                        sub={inProductionCount + " projet" + (inProductionCount > 1 ? "s" : "") + " en production"}
                    />
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 2 — Graphiques
                ══════════════════════════════════════════════════════════════ */}
                <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

                    {/* ── CA mensuel (barres verticales) ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={BarChart3} label="Chiffre d'affaires mensuel" />
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, paddingTop: 16 }}>
                            {monthlyRevenue.map((m, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                                        <div
                                            style={{
                                                width: "70%",
                                                height: m.amount > 0 ? Math.max((m.amount / maxRevenue) * 100, 4) + "%" : "2px",
                                                backgroundColor: m.isCurrent ? C.yellow : C.dark,
                                                borderRadius: "4px 4px 0 0",
                                                position: "relative",
                                                minHeight: 4,
                                            }}
                                            title={formatPrice(m.amount)}
                                        >
                                            {m.amount > 0 && (
                                                <div style={{
                                                    position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
                                                    fontSize: 10, fontWeight: 600, color: C.muted, whiteSpace: "nowrap",
                                                }}>
                                                    {formatK(m.amount)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontWeight: 500 }}>{m.month}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Répartition des projets (barres horizontales) ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={FolderOpen} label="Répartition des projets" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                            {statusCounts.map(s => (
                                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 80, fontSize: 12, color: C.muted, fontWeight: 500, textAlign: "right", flexShrink: 0 }}>
                                        {s.label}
                                    </div>
                                    <div style={{ flex: 1, height: 22, backgroundColor: C.bg, borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{
                                            width: s.count > 0 ? Math.max((s.count / maxStatusCount) * 100, 6) + "%" : "0%",
                                            height: "100%",
                                            backgroundColor: s.color,
                                            borderRadius: 4,
                                            opacity: 0.8,
                                            transition: "width 0.3s ease",
                                        }} />
                                    </div>
                                    <div style={{ width: 28, fontSize: 13, fontWeight: 600, color: C.dark, textAlign: "right", flexShrink: 0 }}>
                                        {s.count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 3 — Activité récente + Alertes
                ══════════════════════════════════════════════════════════════ */}
                <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

                    {/* ── Dernières actions ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={Activity} label="Dernières actions" />
                        {auditLogs.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune activité récente</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                {auditLogs.slice(0, 10).map((log, i) => {
                                    const Icon = getAuditIcon(log.action)
                                    const link = getAuditLink(log.entity_type, log.entity_id)
                                    const content = (
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                                            borderBottom: i < auditLogs.length - 1 ? "1px solid " + C.bg : "none",
                                            cursor: link ? "pointer" : "default",
                                        }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: 8, backgroundColor: C.bg,
                                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}>
                                                <Icon size={14} color={C.muted} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {log.action}
                                                </div>
                                                <div style={{ fontSize: 11, color: C.muted }}>
                                                    {log.user_email ? log.user_email.split("@")[0] : "Système"} · {timeAgo(log.created_at)}
                                                </div>
                                            </div>
                                            {link && <ArrowRight size={14} color={C.muted} />}
                                        </div>
                                    )
                                    return link
                                        ? <a key={log.id || i} href={link} style={{ textDecoration: "none", color: "inherit" }}>{content}</a>
                                        : <div key={log.id || i}>{content}</div>
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Alertes ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={AlertTriangle} label="Alertes" />
                        {alerts.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "20px 0", display: "flex", alignItems: "center", gap: 8 }}>
                                <Target size={14} /> Aucune alerte en cours
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {alerts.map((a, i) => (
                                    <a
                                        key={i}
                                        href={a.link}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                            backgroundColor: a.bg, borderRadius: 8, textDecoration: "none",
                                            border: "1px solid " + a.color + "33",
                                        }}
                                    >
                                        <AlertTriangle size={14} color={a.color} style={{ flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 13, color: a.color, fontWeight: 500 }}>{a.label}</span>
                                        <span style={{
                                            padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                                            backgroundColor: a.color, color: C.white,
                                        }}>
                                            {a.count}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SECTION 4 — Mini-tableaux
                ══════════════════════════════════════════════════════════════ */}
                <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

                    {/* ── Top 5 clients ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={Users} label="Top 5 clients" />
                        {topClients.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune donnée</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid " + C.border }}>
                                        <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Client</th>
                                        <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Projets</th>
                                        <th style={{ textAlign: "right", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>CA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClients.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid " + C.bg }}>
                                            <td style={{ padding: "10px 4px", color: C.dark, fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</td>
                                            <td style={{ padding: "10px 4px", color: C.muted, textAlign: "center" }}>{c.projectCount}</td>
                                            <td style={{ padding: "10px 4px", color: C.dark, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{formatPrice(c.ca)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── Top 5 fournisseurs ── */}
                    <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                        <SectionTitle icon={Award} label="Top 5 fournisseurs" />
                        {topSuppliers.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune donnée</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid " + C.border }}>
                                        <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Fournisseur</th>
                                        <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Réponse</th>
                                        <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Score</th>
                                        <th style={{ textAlign: "right", padding: "8px 4px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Consult.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topSuppliers.map((s: any, i: number) => (
                                        <tr key={i} style={{ borderBottom: "1px solid " + C.bg }}>
                                            <td style={{ padding: "10px 4px", color: C.dark, fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || s.company_name || "Fournisseur"}</td>
                                            <td style={{ padding: "10px 4px", color: C.muted, textAlign: "center" }}>{s.response_rate != null ? Math.round(s.response_rate) + "%" : "N/A"}</td>
                                            <td style={{ padding: "10px 4px", textAlign: "center" }}>
                                                <span style={{
                                                    padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                    backgroundColor: (s.trust_score || 0) >= 70 ? "#e8f8ee" : (s.trust_score || 0) >= 40 ? "#fef9e0" : "#fee",
                                                    color: (s.trust_score || 0) >= 70 ? "#1a7a3c" : (s.trust_score || 0) >= 40 ? "#b89a00" : "#c0392b",
                                                }}>
                                                    {s.trust_score != null ? s.trust_score : "N/A"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 4px", color: C.muted, textAlign: "right" }}>{s.consultations_answered ?? s.total_consultations ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* ── Responsive ── */}
            <style>{`
                @media (max-width: 768px) {
                    .dash-grid { grid-template-columns: 1fr !important; }
                    .dash-kpis { flex-direction: column; }
                }
            `}</style>
        </div>
    )
}
