"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import {
    TrendingUp, TrendingDown, Calendar, ShoppingCart, Euro,
    BarChart3, Users, AlertTriangle, Loader2, XCircle, ArrowRight,
} from "lucide-react"

// ─── Theme (dark + yellow accent) ───────────────────────────────────────────

const T = {
    bg:       "#0a0a0a",
    card:     "#141414",
    cardAlt:  "#1c1c1c",
    border:   "#262626",
    text:     "#fafafa",
    muted:    "#8a8a8a",
    yellow:   C.yellow,
    green:    "#22c55e",
    red:      "#ef4444",
    orange:   "#f59e0b",
}

// ─── Types matching GET /api/admin/stats ────────────────────────────────────

type FinancialKpis = {
    ca_total: number
    ca_current_month: number
    ca_previous_month: number
    growth_mom_percent: number
    panier_moyen: number
    nb_projets_factures: number
    conversion_rate_percent: number
    avg_brief_to_quote_days: number
}
type MonthPoint = { month: string; total_ht: number; total_ttc: number; nb_projets: number }
type TopClient  = { name: string; ca: number; project_count: number }
type PendingProject = { project_id: string; days_pending: number }
type StatsResponse = {
    ok?: boolean
    financial_kpis?: Partial<FinancialKpis>
    monthly_revenue?: MonthPoint[]
    operational_kpis?: {
        top_clients?: TopClient[]
    }
    alerts?: {
        pending_quote_over_7_days?: {
            count?: number
            projects?: PendingProject[]
        }
    }
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]

function labelMonth(raw: string): string {
    // accepts "2026-01", "01", "Jan", or ISO date
    if (!raw) return ""
    const m = /^(\d{4})-(\d{2})/.exec(raw)
    if (m) return MONTH_NAMES[parseInt(m[2], 10) - 1] || raw
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return MONTH_NAMES[d.getMonth()]
    return raw
}

function formatK(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + " K€"
    return Math.round(n) + " €"
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon, label, value, sub, trend, accent,
}: {
    icon: React.ElementType
    label: string
    value: string
    sub?: string
    trend?: "up" | "down" | "flat"
    accent?: boolean
}) {
    const trendColor = trend === "up" ? T.green : trend === "down" ? T.red : T.muted
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null
    return (
        <div style={{
            background: T.card,
            borderRadius: 14,
            padding: "22px 24px",
            border: "1px solid " + T.border,
            borderTop: accent ? "3px solid " + T.yellow : "1px solid " + T.border,
            flex: 1, minWidth: 200,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: accent ? "rgba(244,207,21,0.12)" : T.cardAlt,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon size={17} color={accent ? T.yellow : T.muted} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -0.5 }}>
                {value}
            </div>
            {sub && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: trendColor }}>
                    {TrendIcon && <TrendIcon size={13} />}
                    <span>{sub}</span>
                </div>
            )}
        </div>
    )
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Icon size={16} color={T.yellow} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {label}
            </span>
        </div>
    )
}

// ─── Dashboard Content ──────────────────────────────────────────────────────

function AdminDashboard() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [stats, setStats] = useState<StatsResponse | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) {
            const id = setTimeout(() => { setError("Non authentifie"); setLoading(false) }, 0)
            return () => clearTimeout(id)
        }

        let cancelled = false
        fetchWithAuth(API_URL + "/api/admin/stats")
            .then(r => r.json())
            .then((d: StatsResponse) => {
                if (cancelled) return
                if (d && d.ok === false) setError("Erreur serveur")
                else setStats(d)
            })
            .catch(() => { if (!cancelled) setError("Impossible de charger les statistiques") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [isAuthenticated, authLoading])

    if (loading) return (
        <div style={{
            background: T.bg, minHeight: "100vh",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, sans-serif",
        }}>
            <Loader2 size={22} color={T.yellow} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )

    if (error) return (
        <div style={{ background: T.bg, minHeight: "100vh", padding: 40, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: T.red, display: "flex", alignItems: "center", gap: 8 }}>
                <XCircle size={16} /> {error}
            </p>
        </div>
    )

    const fin = stats?.financial_kpis ?? {}
    const caTotal   = Number(fin.ca_total           ?? 0)
    const caMonth   = Number(fin.ca_current_month   ?? 0)
    const growthMoM = Number(fin.growth_mom_percent ?? 0)
    const avgBasket = Number(fin.panier_moyen       ?? 0)

    const monthly: MonthPoint[] = Array.isArray(stats?.monthly_revenue)
        ? stats!.monthly_revenue!.slice(-6)
        : []
    const maxAmount = Math.max(...monthly.map(m => Number(m.total_ttc) || 0), 1)

    const topClients: TopClient[] = Array.isArray(stats?.operational_kpis?.top_clients)
        ? stats!.operational_kpis!.top_clients!.slice(0, 3)
        : []

    const pending: PendingProject[] = Array.isArray(stats?.alerts?.pending_quote_over_7_days?.projects)
        ? stats!.alerts!.pending_quote_over_7_days!.projects!
        : []

    const growthTrend: "up" | "down" | "flat" = growthMoM > 0 ? "up" : growthMoM < 0 ? "down" : "flat"
    const growthLabel = (growthMoM > 0 ? "+" : "") + growthMoM.toFixed(1) + "% vs mois precedent"

    return (
        <div style={{
            background: T.bg,
            minHeight: "100vh",
            fontFamily: "Inter, sans-serif",
            padding: "32px 24px",
            boxSizing: "border-box",
        }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>

                <h1 style={{
                    fontSize: 24, fontWeight: 700, color: T.text,
                    margin: "0 0 6px 0", letterSpacing: -0.5,
                }}>
                    Tableau de bord
                </h1>
                <p style={{ fontSize: 13, color: T.muted, margin: "0 0 28px 0" }}>
                    Vue d&apos;ensemble de l&apos;activite
                </p>

                {/* ── SECTION 1 — KPIs ─────────────────────────────────────── */}
                <div className="dash-kpis" style={{
                    display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap",
                }}>
                    <KpiCard
                        icon={Euro}
                        label="CA Total"
                        value={formatPrice(caTotal)}
                        sub="Depuis le debut"
                        accent
                    />
                    <KpiCard
                        icon={Calendar}
                        label="CA du mois"
                        value={formatPrice(caMonth)}
                        sub={growthLabel}
                        trend={growthTrend}
                    />
                    <KpiCard
                        icon={growthTrend === "down" ? TrendingDown : TrendingUp}
                        label="Croissance MoM"
                        value={(growthMoM > 0 ? "+" : "") + growthMoM.toFixed(1) + "%"}
                        sub={growthTrend === "up" ? "En progression" : growthTrend === "down" ? "En baisse" : "Stable"}
                        trend={growthTrend}
                    />
                    <KpiCard
                        icon={ShoppingCart}
                        label="Panier moyen"
                        value={formatPrice(avgBasket)}
                        sub="Par projet facture"
                    />
                </div>

                {/* ── SECTION 2 — CA 6 derniers mois ───────────────────────── */}
                <div style={{
                    background: T.card,
                    borderRadius: 14,
                    padding: 28,
                    border: "1px solid " + T.border,
                    marginBottom: 24,
                }}>
                    <SectionTitle icon={BarChart3} label="CA — 6 derniers mois" />
                    {monthly.length === 0 ? (
                        <div style={{ fontSize: 13, color: T.muted, padding: "24px 0" }}>
                            Aucune donnee disponible
                        </div>
                    ) : (
                        <div style={{
                            display: "flex", alignItems: "flex-end",
                            gap: 16, height: 220, paddingTop: 24,
                        }}>
                            {monthly.map((m, i) => {
                                const amount = Number(m.total_ttc) || 0
                                const pct = amount > 0 ? Math.max((amount / maxAmount) * 100, 3) : 0
                                const isLast = i === monthly.length - 1
                                return (
                                    <div key={i} style={{
                                        flex: 1, display: "flex", flexDirection: "column",
                                        alignItems: "center", height: "100%",
                                    }}>
                                        <div style={{
                                            flex: 1, width: "100%",
                                            display: "flex", alignItems: "flex-end", justifyContent: "center",
                                            position: "relative",
                                        }}>
                                            <div
                                                title={formatPrice(amount)}
                                                style={{
                                                    width: "72%",
                                                    height: pct + "%",
                                                    minHeight: amount > 0 ? 4 : 0,
                                                    background: isLast
                                                        ? T.yellow
                                                        : "linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%)",
                                                    borderRadius: "6px 6px 0 0",
                                                    position: "relative",
                                                    transition: "height 0.4s ease",
                                                }}
                                            >
                                                {amount > 0 && (
                                                    <div style={{
                                                        position: "absolute",
                                                        top: -22, left: "50%", transform: "translateX(-50%)",
                                                        fontSize: 10, fontWeight: 600,
                                                        color: isLast ? T.yellow : T.muted,
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        {formatK(amount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: 11, color: T.muted, marginTop: 10,
                                            fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5,
                                        }}>
                                            {labelMonth(m.month)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ── SECTION 3 — Top clients + Alertes ────────────────────── */}
                <div className="dash-grid" style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gap: 20, marginBottom: 32,
                }}>
                    {/* Top 3 clients */}
                    <div style={{
                        background: T.card, borderRadius: 14, padding: 28,
                        border: "1px solid " + T.border,
                    }}>
                        <SectionTitle icon={Users} label="Top 3 clients" />
                        {topClients.length === 0 ? (
                            <div style={{ fontSize: 13, color: T.muted, padding: "20px 0" }}>
                                Aucun client
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {topClients.map((c, i) => (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center", gap: 14,
                                        padding: "14px 16px",
                                        background: T.cardAlt,
                                        borderRadius: 10,
                                        border: "1px solid " + T.border,
                                    }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 8,
                                            background: i === 0 ? T.yellow : T.border,
                                            color: i === 0 ? "#000" : T.text,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 14, fontWeight: 600, color: T.text,
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}>
                                                {c.name || "Client"}
                                            </div>
                                            {c.project_count != null && (
                                                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                                                    {c.project_count} projet{c.project_count > 1 ? "s" : ""}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: 15, fontWeight: 700, color: T.yellow, whiteSpace: "nowrap",
                                        }}>
                                            {formatPrice(Number(c.ca) || 0)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alertes — projets en attente > 7j */}
                    <div style={{
                        background: T.card, borderRadius: 14, padding: 28,
                        border: "1px solid " + T.border,
                    }}>
                        <SectionTitle icon={AlertTriangle} label="Projets en attente > 7 jours" />
                        {pending.length === 0 ? (
                            <div style={{
                                fontSize: 13, color: T.muted, padding: "20px 0",
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                Aucune alerte en cours
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {pending.map((p, i) => (
                                    <a
                                        key={p.project_id || i}
                                        href={"/admin/projets?search=" + (p.project_id || "")}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12,
                                            padding: "14px 16px",
                                            background: "rgba(239,68,68,0.08)",
                                            borderRadius: 10,
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <AlertTriangle size={16} color={T.red} style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: 600, color: T.text,
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}>
                                                Projet {(p.project_id || "").slice(0, 8)}
                                            </div>
                                            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                                                En attente depuis {p.days_pending} jours
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: "4px 10px", borderRadius: 20,
                                            fontSize: 11, fontWeight: 700,
                                            background: T.red, color: "#fff",
                                        }}>
                                            {p.days_pending}j
                                        </span>
                                        <ArrowRight size={14} color={T.muted} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <style>{`
                @media (max-width: 768px) {
                    .dash-grid { grid-template-columns: 1fr !important; }
                    .dash-kpis { flex-direction: column; }
                }
            `}</style>
        </div>
    )
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminDashboard />
        </AuthGuard>
    )
}
