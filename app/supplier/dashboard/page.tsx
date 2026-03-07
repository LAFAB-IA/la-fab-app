"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import { API_URL, C } from "@/lib/constants"
import { formatPrice, formatDate } from "@/lib/format"
import {
    Inbox, Clock, TrendingUp, Shield,
    ArrowRight, Loader2, XCircle,
} from "lucide-react"

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
    sent:      { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
    pending:   { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
    replied:   { label: "Repondue",   bg: "#e8f8ee", color: "#1a7a3c" },
    responded: { label: "Repondue",   bg: "#e8f8ee", color: "#1a7a3c" },
    validated: { label: "Validee",    bg: "#e8f0fe", color: "#1a3c7a" },
    created:   { label: "Creee",      bg: "#f5f5f5", color: "#616161" },
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

function Widget({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean
}) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "20px 22px",
            boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
            borderTop: accent ? "3px solid #F4CF15" : "3px solid transparent",
            flex: 1, minWidth: 180,
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

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon size={16} color={C.dark} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{label}</span>
        </div>
    )
}

// ─── Dashboard Content ──────────────────────────────────────────────────────

function SupplierDashboardContent() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [consultations, setConsultations] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [supplier, setSupplier] = useState<any>(null)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }

        fetch(API_URL + "/api/supplier-portal/dashboard", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(r => {
                if (r.status === 404) { setNotFound(true); setLoading(false); return null }
                return r.json()
            })
            .then(d => {
                if (!d) return
                if (d.error === "SUPPLIER_NOT_FOUND" || d.error?.includes?.("not found")) {
                    setNotFound(true)
                } else if (d.ok || d.supplier || d.consultations) {
                    setSupplier(d.supplier)
                    const raw = d.consultations ?? d.data ?? d
                    setConsultations(Array.isArray(raw) ? raw : [])
                    setStats(d.stats || {})
                } else {
                    setNotFound(true)
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    // ── Computed ─────────────────────────────────────────────────────────────

    const total = stats?.total_consultations || 0
    const pending = stats?.pending || 0
    const replied = stats?.replied || 0
    const responseRate = stats?.response_rate ?? (total > 0 ? Math.round((replied / total) * 100) : 0)
    const caGenerated = stats?.ca_generated || 0
    const trustScore = supplier?.trust_score ?? stats?.trust_score ?? null

    // Pending consultations
    const pendingConsultations = consultations
        .filter(c => c.status === "sent" || c.status === "pending")
        .sort((a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime())

    // Recent 5 (history)
    const recentConsultations = [...consultations]
        .sort((a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime())
        .slice(0, 5)

    // ── Render ──────────────────────────────────────────────────────────────

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif" }}>
            <Loader2 size={20} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )

    if (notFound) return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
            <div style={{
                background: C.white, borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
            }}>
                <Inbox size={40} color={C.muted} style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
                    Aucun profil fournisseur associe a ce compte.
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                    Ce compte n'est pas enregistre en tant que fournisseur sur LA FAB.
                </div>
                <a href="/dashboard" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 24px", borderRadius: 8,
                    background: "#F4CF15", color: "#000000",
                    fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}>
                    Retour au dashboard
                </a>
            </div>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif", padding: 40 }}>
            <p style={{ color: "#c0392b", display: "flex", alignItems: "center", gap: 6 }}><XCircle size={14} /> {error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 1100, margin: "0 auto" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 4px 0" }}>
                    Espace fournisseur
                </h1>
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                    {supplier?.company_name || "Mon espace"}
                </p>
            </div>

            {/* ── Widgets ── */}
            <div className="supplier-kpis" style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                <Widget
                    icon={Inbox}
                    label="Consultations recues"
                    value={String(total)}
                    sub={pending + " en attente de reponse"}
                />
                <Widget
                    icon={TrendingUp}
                    label="Taux de reponse"
                    value={responseRate + "%"}
                    sub={replied + " repondue" + (replied > 1 ? "s" : "") + " / " + total + " recue" + (total > 1 ? "s" : "")}
                />
                <Widget
                    icon={Clock}
                    label="CA genere"
                    value={caGenerated > 0 ? formatPrice(caGenerated) : "N/A"}
                    sub="Somme des prix proposes"
                    accent
                />
                <Widget
                    icon={Shield}
                    label="Score de confiance"
                    value={trustScore != null ? String(trustScore) : "N/A"}
                    sub={trustScore != null
                        ? (trustScore >= 70 ? "Excellent" : trustScore >= 40 ? "Correct" : "A ameliorer")
                        : undefined}
                />
            </div>

            <div className="supplier-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

                {/* ── Consultations en attente ── */}
                <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                    <SectionTitle icon={Clock} label="Consultations en attente" />
                    {pendingConsultations.length === 0 ? (
                        <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune consultation en attente</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {pendingConsultations.map((c, i) => (
                                <div
                                    key={c.consultation_id || c.id || i}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10, padding: "12px 8px",
                                        borderBottom: i < pendingConsultations.length - 1 ? "1px solid " + C.bg : "none",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {c.project_name || c.project_id?.slice(0, 16) || "Consultation"}
                                        </div>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                            {formatDate(c.sent_at || c.created_at)}
                                        </div>
                                    </div>
                                    <a
                                        href="/supplier/consultations"
                                        style={{
                                            padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                            background: "#F4CF15", color: "#000000", textDecoration: "none",
                                            display: "flex", alignItems: "center", gap: 4,
                                        }}
                                    >
                                        Repondre <ArrowRight size={12} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Historique ── */}
                <div style={{ background: C.white, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <SectionTitle icon={Inbox} label="Historique" />
                        <a href="/supplier/consultations" style={{
                            fontSize: 12, fontWeight: 600, color: C.muted, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: 4,
                        }}>
                            Voir tout <ArrowRight size={12} />
                        </a>
                    </div>
                    {recentConsultations.length === 0 ? (
                        <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Aucune consultation</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {recentConsultations.map((c, i) => (
                                <div
                                    key={c.consultation_id || c.id || i}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                                        borderBottom: i < recentConsultations.length - 1 ? "1px solid " + C.bg : "none",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {c.project_name || c.project_id?.slice(0, 16) || "Consultation"}
                                        </div>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                            {formatDate(c.sent_at || c.created_at)}
                                        </div>
                                    </div>
                                    {statusBadge(c.status)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @media (max-width: 768px) {
                    .supplier-kpis { flex-direction: column; }
                    .supplier-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function Page() {
    return (
        <AuthGuard>
            <SupplierDashboardContent />
        </AuthGuard>
    )
}
