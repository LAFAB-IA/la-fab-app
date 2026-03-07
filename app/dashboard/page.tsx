"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import { API_URL, C } from "@/lib/constants"
import { formatPrice, formatDate } from "@/lib/format"
import {
    FolderOpen, FileText, CalendarDays, Package,
    ArrowRight, Plus, Loader2, XCircle,
} from "lucide-react"

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
    created:       { label: "En attente",  bg: "#fef9e0", color: "#b89a00" },
    quoted:        { label: "Devise",      bg: "#e8f0fe", color: "#1a3c7a" },
    validated:     { label: "Valide",      bg: "#e8f8ee", color: "#1a7a3c" },
    in_production: { label: "Production",  bg: "#fff3e0", color: "#e65100" },
    delivered:     { label: "Livre",       bg: "#e0f2f1", color: "#004d40" },
    archived:      { label: "Archive",     bg: "#f5f5f5", color: "#616161" },
}

function statusBadge(status: string) {
    const c = STATUS_CFG[status] || { label: status, bg: "#f5f5f5", color: "#616161" }
    return (
        <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: c.bg, color: c.color,
        }}>
            {c.label}
        </span>
    )
}

// ─── Widget Card ────────────────────────────────────────────────────────────

function Widget({ icon: Icon, label, value, sub }: {
    icon: React.ElementType; label: string; value: string; sub?: string
}) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "20px 22px",
            boxShadow: "0 1px 3px rgba(58,64,64,0.08)", flex: 1, minWidth: 180,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 8, backgroundColor: C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon size={16} color={C.muted} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
        </div>
    )
}

// ─── Dashboard Content ──────────────────────────────────────────────────────

function ClientDashboard() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [projects, setProjects] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }

        const headers = { Authorization: "Bearer " + token }
        let done = 0
        const total = 2
        const check = () => { done++; if (done >= total) setLoading(false) }

        fetch(API_URL + "/api/project?account_id=me", { headers })
            .then(r => r.json())
            .then(d => {
                const raw = d.projects ?? d.data ?? d
                setProjects(Array.isArray(raw) ? raw : [])
            })
            .catch(() => {})
            .finally(check)

        fetch(API_URL + "/api/invoice/list", { headers })
            .then(r => r.json())
            .then(d => {
                const raw = d.invoices ?? d.data ?? d
                setInvoices(Array.isArray(raw) ? raw : [])
            })
            .catch(() => {})
            .finally(check)
    }, [token, isAuthenticated, authLoading])

    // ── Computed ─────────────────────────────────────────────────────────────

    const totalProjects = projects.length
    const inProgress = projects.filter(p => p.status !== "archived" && p.status !== "delivered").length
    const deliveredCount = projects.filter(p => p.status === "delivered").length

    // Last invoice
    const sortedInvoices = [...invoices].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastInvoice = sortedInvoices[0]

    // Next milestone: earliest future planning_date from active projects
    let nextMilestone: string | null = null
    const now = Date.now()
    for (const p of projects) {
        if (p.status === "archived" || p.status === "delivered") continue
        const dates = p.planning_dates || []
        for (const d of dates) {
            const t = new Date(d.date || d).getTime()
            if (t > now && (!nextMilestone || t < new Date(nextMilestone).getTime())) {
                nextMilestone = d.date || d
            }
        }
        // Also check delivery_deadline
        if (p.delivery_deadline) {
            const t = new Date(p.delivery_deadline).getTime()
            if (t > now && (!nextMilestone || t < new Date(nextMilestone).getTime())) {
                nextMilestone = p.delivery_deadline
            }
        }
    }

    // Current active project (most recently updated non-archived)
    const activeProject = [...projects]
        .filter(p => p.status !== "archived" && p.status !== "delivered")
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        [0]

    // Recent 5 projects
    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

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
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 1100, margin: "0 auto" }}>

            {/* ── Widgets ── */}
            <div className="client-kpis" style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                <Widget
                    icon={FolderOpen}
                    label="Mes projets"
                    value={String(totalProjects)}
                    sub={inProgress + " en cours, " + deliveredCount + " livre" + (deliveredCount > 1 ? "s" : "")}
                />
                <Widget
                    icon={FileText}
                    label="Derniere facture"
                    value={lastInvoice ? formatPrice(Number(lastInvoice.total || 0)) : "Aucune"}
                    sub={lastInvoice ? (lastInvoice.status === "paid" ? "Payee" : lastInvoice.status === "overdue" ? "En retard" : "En attente") : undefined}
                />
                <Widget
                    icon={CalendarDays}
                    label="Prochain jalon"
                    value={nextMilestone ? formatDate(nextMilestone) : "Aucun"}
                />
                <Widget
                    icon={Package}
                    label="Commande en cours"
                    value={activeProject?.brief_analysis?.product_type || activeProject?.product?.label || "Aucune"}
                    sub={activeProject ? STATUS_CFG[activeProject.status]?.label || activeProject.status : undefined}
                />
            </div>

            {/* ── Activite recente ── */}
            <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <FolderOpen size={16} color={C.dark} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Activite recente</span>
                </div>

                {recentProjects.length === 0 ? (
                    <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucun projet</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {recentProjects.map((p, i) => (
                            <a
                                key={p.project_id || i}
                                href={"/dashboard?project_id=" + p.project_id + "&account_id=" + (p.account_id || "")}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12, padding: "12px 8px",
                                    borderBottom: i < recentProjects.length - 1 ? "1px solid " + C.bg : "none",
                                    textDecoration: "none", color: "inherit", cursor: "pointer",
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {p.brief_analysis?.product_type || p.product?.label || p.project_id?.slice(0, 12)}
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                        {formatDate(p.created_at)}
                                    </div>
                                </div>
                                {statusBadge(p.status)}
                                <ArrowRight size={14} color={C.muted} />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Actions rapides ── */}
            <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 16 }}>Actions rapides</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a href="/projets" style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 8, background: "#F4CF15", color: "#000000",
                        fontSize: 14, fontWeight: 600, textDecoration: "none",
                    }}>
                        <Plus size={16} /> Nouveau projet
                    </a>
                    <a href="/factures" style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 8, border: "1px solid " + C.border, background: C.white, color: C.dark,
                        fontSize: 14, fontWeight: 500, textDecoration: "none",
                    }}>
                        <FileText size={16} /> Voir mes factures
                    </a>
                    <a href="/planning" style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 8, border: "1px solid " + C.border, background: C.white, color: C.dark,
                        fontSize: 14, fontWeight: 500, textDecoration: "none",
                    }}>
                        <CalendarDays size={16} /> Mon planning
                    </a>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .client-kpis { flex-direction: column; }
                }
            `}</style>
        </div>
    )
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function Page() {
    return (
        <AuthGuard>
            <ClientDashboard />
        </AuthGuard>
    )
}
