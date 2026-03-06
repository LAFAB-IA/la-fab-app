"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { formatPrice, formatDate } from "@/lib/format"
import { ArrowLeft, ChevronDown, ChevronUp, Search, ExternalLink, Trash2, Pencil } from "lucide-react"
import StatusBadge from "@/components/shared/StatusBadge"
import AdminProjectFlow from "@/components/AdminProjectFlow"
import Drawer from "@/components/shared/Drawer"
import ProjectDetail from "@/components/ProjectDetail"

const { useEffect, useState } = React

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    created:       { label: "En attente de devis", bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:        { label: "Devis envoye",        bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    validated:     { label: "Commande validee",    bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    in_production: { label: "En production",       bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:     { label: "Livre",               bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    archived:      { label: "Archive",             bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
}

const STATUS_OPTIONS = ["created", "quoted", "validated", "in_production", "delivered", "archived"]

type SortKey = "product" | "client" | "status" | "date" | "total"
type SortDir = "asc" | "desc"

export default function AdminProjects() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [sortKey, setSortKey] = useState<SortKey>("date")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [statusChanging, setStatusChanging] = useState<string | null>(null)
    const [expandedProject, setExpandedProject] = useState<string | null>(null)
    const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Column management
    const DEFAULT_COLUMNS = ["project", "client", "product", "status", "date", "actions"]
    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("admin_projects_column_order")
            if (saved) try { return JSON.parse(saved) } catch {}
        }
        return DEFAULT_COLUMNS
    })
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
    const [resizing, setResizing] = useState<{ col: string; startX: number; startW: number } | null>(null)
    const [dragCol, setDragCol] = useState<string | null>(null)
    const [dragOverCol, setDragOverCol] = useState<string | null>(null)
    const tableRef = React.useRef<HTMLTableElement>(null)

    // Column resize handler
    React.useEffect(() => {
        if (!resizing) return
        function onMouseMove(e: MouseEvent) {
            if (!resizing) return
            const diff = e.clientX - resizing.startX
            const newW = Math.max(80, resizing.startW + diff)
            setColumnWidths((prev) => ({ ...prev, [resizing.col]: newW }))
        }
        function onMouseUp() { setResizing(null) }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp) }
    }, [resizing])

    // Save column order to localStorage
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("admin_projects_column_order", JSON.stringify(columnOrder))
        }
    }, [columnOrder])

    function handleColumnDrop(targetCol: string) {
        if (!dragCol || dragCol === targetCol) { setDragCol(null); setDragOverCol(null); return }
        setColumnOrder((prev) => {
            const newOrder = prev.filter((c) => c !== dragCol)
            const targetIdx = newOrder.indexOf(targetCol)
            newOrder.splice(targetIdx, 0, dragCol)
            return newOrder
        })
        setDragCol(null)
        setDragOverCol(null)
    }

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }
        fetch(`${API_URL}/api/admin/projects`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects(data.projects || [])
                else setError("Acces refuse ou erreur serveur")
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    function handleStatusChange(projectId: string, newStatus: string) {
        if (!token) return
        setStatusChanging(projectId)
        fetch(`${API_URL}/api/project/${projectId}/status`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects((prev) => prev.map((p) => p.project_id === projectId ? { ...p, status: newStatus } : p))
                setStatusChanging(null)
            })
            .catch(() => setStatusChanging(null))
    }

    async function handleDeleteProject(projectId: string) {
        if (!token) return
        setDeleting(true)
        try {
            const r = await fetch(`${API_URL}/api/admin/projects/${projectId}`, {
                method: "PATCH",
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify({ status: "deleted" }),
            })
            const data = await r.json()
            if (data.ok) {
                setProjects((prev) => prev.filter((p) => p.project_id !== projectId))
            }
        } catch { /* silent */ }
        setDeleting(false)
        setDeleteConfirmId(null)
    }

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    function sortIndicator(key: SortKey) {
        if (sortKey !== key) return ""
        return sortDir === "asc" ? " \u25B2" : " \u25BC"
    }

    const filtered = projects.filter((p) => {
        const matchStatus = filterStatus === "all" || p.status === filterStatus
        const matchSearch =
            search === "" ||
            (p.project_id || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.account_id || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.brief_analysis?.product_type || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.product?.label || "").toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0
        switch (sortKey) {
            case "product":
                cmp = (a.brief_analysis?.product_type || a.product?.label || "").localeCompare(b.brief_analysis?.product_type || b.product?.label || "")
                break
            case "client":
                cmp = (a.account_id || "").localeCompare(b.account_id || "")
                break
            case "status":
                cmp = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status)
                break
            case "date":
                cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                break
            case "total":
                cmp = (Number(a.pricing?.total_net) || 0) - (Number(b.pricing?.total_net) || 0)
                break
        }
        return sortDir === "asc" ? cmp : -cmp
    })

    const counts = Object.fromEntries(
        STATUS_OPTIONS.map((s) => [s, projects.filter((p) => p.status === s).length])
    )

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement des projets...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>{error}</p>
        </div>
    )

    const thStyle: React.CSSProperties = {
        backgroundColor: "#F8F8F6",
        color: "#3A4040",
        borderBottom: "1px solid #e8e8e6",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
    }

    const tdStyle: React.CSSProperties = {
        padding: "14px 14px",
        fontSize: 13,
        color: C.dark,
        borderBottom: "1px solid #f0f0ee",
        verticalAlign: "middle",
    }

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 4px 0" }}>Gestion des projets</h1>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{projects.length} projet{projects.length > 1 ? "s" : ""} au total</p>
                    </div>
                    <a
                        href="/admin/dashboard"
                        style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                        <ArrowLeft size={14} />
                        Dashboard
                    </a>
                </div>

                {/* KPI row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
                    {STATUS_OPTIONS.map((key) => {
                        const sc = STATUS_CONFIG[key]
                        const isActive = filterStatus === key
                        return (
                            <div
                                key={key}
                                onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                                style={{
                                    background: isActive ? sc.bg : C.white,
                                    borderRadius: 12,
                                    padding: "12px 10px",
                                    textAlign: "center",
                                    border: "1px solid " + (isActive ? sc.border : C.border),
                                    cursor: "pointer",
                                    boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
                                }}
                            >
                                <div style={{ fontSize: 22, fontWeight: 700, color: sc.color }}>{counts[key] || 0}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{sc.label}</div>
                            </div>
                        )
                    })}
                </div>

                {/* Search + Filter */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher par ID, client, produit..."
                            style={{ width: "100%", padding: "12px 16px 12px 40px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: "10px 14px", paddingRight: 32, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", appearance: "none" as const, cursor: "pointer" }}
                        >
                            <option value="all">Tous les statuts</option>
                            {STATUS_OPTIONS.map((key) => (
                                <option key={key} value={key}>{STATUS_CONFIG[key].label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                    </div>
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    {sorted.length} projet{sorted.length > 1 ? "s" : ""} affiche{sorted.length > 1 ? "s" : ""}
                </div>

                {/* Table */}
                <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border, overflow: "auto" }}>
                    <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", tableLayout: Object.keys(columnWidths).length > 0 ? "fixed" : "auto" }}>
                        <thead>
                            <tr>
                                {columnOrder.map((col) => {
                                    const colConfig: Record<string, { label: string; sortKey?: SortKey; center?: boolean }> = {
                                        project: { label: "Projet", sortKey: "product" },
                                        client: { label: "Client", sortKey: "client" },
                                        product: { label: "Produit" },
                                        status: { label: "Statut", sortKey: "status" },
                                        date: { label: "Date", sortKey: "date" },
                                        actions: { label: "Actions", center: true },
                                    }
                                    const cfg = colConfig[col]
                                    if (!cfg) return null
                                    return (
                                        <th
                                            key={col}
                                            draggable={col !== "actions"}
                                            onDragStart={() => setDragCol(col)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col) }}
                                            onDragLeave={() => setDragOverCol(null)}
                                            onDrop={() => handleColumnDrop(col)}
                                            onClick={() => cfg.sortKey && handleSort(cfg.sortKey)}
                                            style={{
                                                ...thStyle,
                                                position: "relative",
                                                width: columnWidths[col] || "auto",
                                                textAlign: cfg.center ? "center" : "left",
                                                borderLeft: dragOverCol === col ? "2px solid " + C.yellow : "none",
                                                cursor: cfg.sortKey ? "pointer" : "default",
                                            }}
                                        >
                                            {cfg.label}{cfg.sortKey ? sortIndicator(cfg.sortKey) : ""}
                                            {/* Resize handle */}
                                            {col !== "actions" && (
                                                <div
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation()
                                                        const th = e.currentTarget.parentElement
                                                        if (!th) return
                                                        setResizing({ col, startX: e.clientX, startW: th.offsetWidth })
                                                    }}
                                                    style={{
                                                        position: "absolute", right: 0, top: 0, bottom: 0, width: 4,
                                                        cursor: "col-resize", backgroundColor: "transparent",
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.border)}
                                                    onMouseLeave={(e) => { if (!resizing) e.currentTarget.style.backgroundColor = "transparent" }}
                                                />
                                            )}
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((project) => {
                                const isChanging = statusChanging === project.project_id
                                const productLabel = project.product?.label || project.brief_analysis?.product_type || "—"
                                const quantity = project.quantity || project.brief_analysis?.quantity_detected || ""
                                const total = project.pricing?.total_net ? formatPrice(Number(project.pricing.total_net)) : "—"
                                const isExpanded = expandedProject === project.project_id

                                const cellContent: Record<string, React.ReactNode> = {
                                    project: (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            {isExpanded ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />}
                                            <div>
                                                <div style={{ fontWeight: 600, color: C.dark, marginBottom: 2 }}>{project.brief_analysis?.product_type || "Brief uploade"}</div>
                                                <div style={{ fontSize: 11, color: C.muted }}>{project.project_id.slice(0, 12)}...</div>
                                                {total !== "—" && <div style={{ fontSize: 12, color: C.dark, fontWeight: 600, marginTop: 2 }}>{total}</div>}
                                            </div>
                                        </div>
                                    ),
                                    client: <div style={{ fontSize: 12, color: C.muted }}>{project.account_id.slice(0, 10)}...</div>,
                                    product: (
                                        <>
                                            <div style={{ fontSize: 13, color: C.dark }}>{productLabel}</div>
                                            {quantity && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{quantity} ex.</div>}
                                        </>
                                    ),
                                    status: <StatusBadge status={project.status} type="project" />,
                                    date: <div style={{ fontSize: 13, color: C.dark }}>{formatDate(project.created_at)}</div>,
                                    actions: (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ position: "relative" }}>
                                                <select value={project.status} onChange={(e) => handleStatusChange(project.project_id, e.target.value)} disabled={isChanging} style={{ padding: "6px 10px", paddingRight: 28, border: "1px solid " + C.border, borderRadius: 6, fontSize: 11, backgroundColor: C.white, color: C.dark, outline: "none", appearance: "none" as const, cursor: isChanging ? "not-allowed" : "pointer", opacity: isChanging ? 0.5 : 1 }}>
                                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                                                </select>
                                                <ChevronDown size={12} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                                            </div>
                                            <button onClick={() => { setDrawerProjectId(project.project_id); setDrawerOpen(true) }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, cursor: "pointer" }} title="Voir">
                                                <ExternalLink size={13} />
                                            </button>
                                            <button onClick={() => { setDrawerProjectId(project.project_id); setDrawerOpen(true) }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, cursor: "pointer" }} title="Modifier">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => setDeleteConfirmId(project.project_id)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid #fecaca", backgroundColor: "#fef2f2", color: "#991b1b", cursor: "pointer" }} title="Supprimer">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ),
                                }

                                return (
                                    <React.Fragment key={project.project_id}>
                                        <tr style={{ transition: "background 0.15s", cursor: "pointer" }} onClick={() => setExpandedProject(isExpanded ? null : project.project_id)} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafaf8")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isExpanded ? "#fafaf8" : "transparent")}>
                                            {columnOrder.map((col) => (
                                                <td key={col} style={{ ...tdStyle, textAlign: col === "actions" ? "center" : "left" }}>
                                                    {cellContent[col]}
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={columnOrder.length} style={{ padding: "20px 24px", background: "#fafaf8", borderBottom: "2px solid " + C.yellow }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 12 }}>
                                                        Flux projet — {project.brief_analysis?.product_type || "Brief uploade"}
                                                    </div>
                                                    <AdminProjectFlow projectId={project.project_id} projectStatus={project.status} token={token!} briefAnalysis={project.brief_analysis} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>

                    {sorted.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            Aucun projet trouve
                        </div>
                    )}
                </div>

                {/* Delete confirmation modal */}
                {deleteConfirmId && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirmId(null)}>
                        <div style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: "0 0 8px" }}>Supprimer ce projet ?</h3>
                            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
                                Cette action est irréversible. Le projet sera marqué comme supprimé.
                            </p>
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => setDeleteConfirmId(null)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                    Annuler
                                </button>
                                <button onClick={() => handleDeleteProject(deleteConfirmId)} disabled={deleting} style={{ padding: "8px 20px", borderRadius: 8, border: "none", backgroundColor: "#991b1b", color: C.white, fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                                    {deleting ? "Suppression..." : "Supprimer"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Project detail drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerProjectId(null) }}
                title="Detail du projet"
                width="800px"
            >
                {drawerProjectId && (
                    <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                            <a
                                href={`/projet/${drawerProjectId}`}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                    border: "1px solid " + C.border, background: C.white, color: C.dark,
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink size={13} /> Ouvrir en pleine page
                            </a>
                        </div>
                        <ProjectDetail projectId={drawerProjectId} onClose={() => { setDrawerOpen(false); setDrawerProjectId(null) }} />
                        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "2px solid " + C.yellow }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 14 }}>Flux de gestion</div>
                            <AdminProjectFlow
                                projectId={drawerProjectId}
                                projectStatus={projects.find((p) => p.project_id === drawerProjectId)?.status || "created"}
                                token={token!}
                                briefAnalysis={projects.find((p) => p.project_id === drawerProjectId)?.brief_analysis}
                            />
                        </div>
                    </>
                )}
            </Drawer>
        </div>
    )
}
