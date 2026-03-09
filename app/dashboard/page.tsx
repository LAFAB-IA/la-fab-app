"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { formatPrice, formatDate } from "@/lib/format"
import {
    FolderOpen, FileText, CalendarDays, Package,
    ArrowRight, Plus, Loader2, XCircle, X, GripHorizontal,
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
    const { user, realRole, isAuthenticated, isLoading: authLoading } = useAuth()
    const isAdminOverride = realRole === "admin" && user?.role !== realRole
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [projects, setProjects] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [drawerProject, setDrawerProject] = useState<any | null>(null)
    const [modalSize, setModalSize] = useState<{ w: number; h: number } | null>(null)
    const resizing = useRef(false)
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifie"); setLoading(false); return }

        let done = 0
        const total = 2
        const check = () => { done++; if (done >= total) setLoading(false) }

        const projectUrl = isAdminOverride
            ? API_URL + "/api/admin/projects?limit=10"
            : API_URL + "/api/project?account_id=me"

        fetchWithAuth(projectUrl)
            .then(r => r.json())
            .then(d => {
                const raw = d.projects ?? d.data ?? d
                setProjects(Array.isArray(raw) ? raw : [])
            })
            .catch(() => {})
            .finally(check)

        fetchWithAuth(API_URL + "/api/invoice/list")
            .then(r => r.json())
            .then(d => {
                const raw = d.invoices ?? d.data ?? d
                setInvoices(Array.isArray(raw) ? raw : [])
            })
            .catch(() => {})
            .finally(check)
    }, [isAuthenticated, authLoading, isAdminOverride])

    // Modal resize
    const onResizeDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        resizing.current = true
        const el = modalRef.current
        resizeStart.current = { x: e.clientX, y: e.clientY, w: el?.offsetWidth || 520, h: el?.offsetHeight || 400 }
        document.body.style.cursor = "nwse-resize"
        document.body.style.userSelect = "none"
    }, [])

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!resizing.current) return
            const { x, y, w, h } = resizeStart.current
            const newW = Math.min(Math.max(w + (e.clientX - x), 320), window.innerWidth * 0.9)
            const newH = Math.min(Math.max(h + (e.clientY - y), 200), window.innerHeight * 0.9)
            setModalSize({ w: newW, h: newH })
        }
        function onMouseUp() {
            if (!resizing.current) return
            resizing.current = false
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        return () => {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }
    }, [])

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
        const dates = Array.isArray(p.planning_dates) ? p.planning_dates : []
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

            {isAdminOverride && (
                <div style={{
                    background: "#F4CF15", color: "#000000", padding: "10px 20px",
                    borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 20,
                    textAlign: "center",
                }}>
                    Mode apercu admin — Donnees agregees de tous les clients
                </div>
            )}

            {/* ── Widgets ── */}
            <div className="client-kpis" style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                <Widget
                    icon={FolderOpen}
                    label={isAdminOverride ? "Total projets clients" : "Mes projets"}
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
                            <div
                                key={p.project_id || i}
                                onClick={() => setDrawerProject(p)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12, padding: "12px 8px",
                                    borderBottom: i < recentProjects.length - 1 ? "1px solid " + C.bg : "none",
                                    cursor: "pointer",
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
                            </div>
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

            {/* ── Project Drawer ── */}
            {drawerProject && (
                <>
                    <div
                        onClick={() => { setDrawerProject(null); setModalSize(null) }}
                        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 1000 }}
                    />
                    <div
                        ref={modalRef}
                        style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                        zIndex: 1001, background: C.white, borderRadius: 16,
                        width: modalSize ? modalSize.w : "90%", maxWidth: modalSize ? undefined : 520,
                        height: modalSize ? modalSize.h : undefined, maxHeight: modalSize ? undefined : "80vh",
                        minWidth: 320, minHeight: 200,
                        overflow: "auto",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.18)", padding: 28,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.dark, margin: 0 }}>
                                {drawerProject.brief_analysis?.product_type || drawerProject.product?.label || "Projet"}
                            </h2>
                            <button onClick={() => { setDrawerProject(null); setModalSize(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                            {statusBadge(drawerProject.status)}
                            <span style={{ fontSize: 12, color: C.muted }}>
                                Cree le {formatDate(drawerProject.created_at)}
                            </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg }}>
                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>ID Projet</div>
                                <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{drawerProject.project_id?.slice(0, 12)}...</div>
                            </div>
                            {drawerProject.pricing?.total_net != null && (
                                <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg }}>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Montant HT</div>
                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 600 }}>{formatPrice(Number(drawerProject.pricing.total_net))}</div>
                                </div>
                            )}
                            {drawerProject.delivery_deadline && (
                                <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg }}>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Livraison</div>
                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{formatDate(drawerProject.delivery_deadline)}</div>
                                </div>
                            )}
                            {drawerProject.brief_analysis?.quantity && (
                                <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg }}>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Quantite</div>
                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{drawerProject.brief_analysis.quantity}</div>
                                </div>
                            )}
                        </div>

                        {drawerProject.brief_analysis?.description && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Description</div>
                                <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6 }}>{drawerProject.brief_analysis.description}</div>
                            </div>
                        )}

                        <a
                            href={"/projet/" + drawerProject.project_id}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "10px 20px", borderRadius: 8, background: C.dark, color: C.white,
                                fontSize: 13, fontWeight: 600, textDecoration: "none",
                            }}
                        >
                            Voir le projet complet <ArrowRight size={14} />
                        </a>

                        {/* Resize handle */}
                        <div
                            onMouseDown={onResizeDown}
                            style={{
                                position: "absolute", bottom: 4, right: 4,
                                width: 20, height: 20, cursor: "nwse-resize",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: 0.4, color: C.muted,
                            }}
                        >
                            <GripHorizontal size={14} />
                        </div>
                    </div>
                </>
            )}

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
