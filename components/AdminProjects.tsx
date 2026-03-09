"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { formatPrice, formatDate } from "@/lib/format"
import { ArrowLeft, ChevronDown, ChevronUp, Search, ExternalLink, Trash2, Pencil, Brain, Send, Loader2, Archive, RefreshCw, Download, CheckSquare } from "lucide-react"
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

    // Bulk selection
    const [bulkMode, setBulkMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
    const [bulkStatusDropdown, setBulkStatusDropdown] = useState(false)
    const [bulkActioning, setBulkActioning] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

    // AI Assistant panel
    const [aiPanelOpen, setAiPanelOpen] = useState(false)
    const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
    const [aiInput, setAiInput] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const aiChatEndRef = React.useRef<HTMLDivElement>(null)

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
        if (!isAuthenticated) { setError("Non authentifie"); setLoading(false); return }
        fetchWithAuth(`${API_URL}/api/admin/projects`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects(data.projects || [])
                else setError("Acces refuse ou erreur serveur")
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [isAuthenticated, authLoading])

    function handleStatusChange(projectId: string, newStatus: string) {
        setStatusChanging(projectId)
        fetchWithAuth(`${API_URL}/api/project/${projectId}/status`, {
            method: "PATCH",
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
        setDeleting(true)
        try {
            const r = await fetchWithAuth(`${API_URL}/api/project/${projectId}`, {
                method: "DELETE",
            })
            const data = await r.json()
            if (data.ok) {
                setProjects((prev) => prev.filter((p) => p.project_id !== projectId))
            } else {
                console.error("Erreur suppression projet:", data.error || "Erreur inconnue")
            }
        } catch (err) { console.error("Erreur réseau suppression projet:", err) }
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

    async function handleAiSend() {
        if (!aiInput.trim() || aiLoading || !drawerProjectId) return
        const userMsg = aiInput.trim()
        setAiInput("")
        setAiMessages((prev) => [...prev, { role: "user", content: userMsg }])
        setAiLoading(true)
        try {
            const project = projects.find((p) => p.project_id === drawerProjectId)
            const r = await fetchWithAuth(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
                body: JSON.stringify({
                    project_id: drawerProjectId,
                    message: userMsg,
                    messages: aiMessages,
                    context: {
                        briefs: project?.brief_analysis || null,
                        production_plan: project?.brief_analysis?.production_plan || null,
                    },
                }),
            })
            const data = await r.json()
            if (data.ok) {
                setAiMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
            } else {
                setAiMessages((prev) => [...prev, { role: "assistant", content: "Erreur : " + (data.error || "Impossible de contacter l'assistant.") }])
            }
        } catch {
            setAiMessages((prev) => [...prev, { role: "assistant", content: "Erreur reseau. Reessayez." }])
        }
        setAiLoading(false)
        setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(t)
    }, [toast])

    // Bulk helpers
    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }
    function toggleSelectAll() {
        if (selectedIds.size === sorted.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(sorted.map(p => p.project_id)))
        }
    }
    function exitBulkMode() {
        setBulkMode(false)
        setSelectedIds(new Set())
        setBulkStatusDropdown(false)
    }

    async function bulkAction(action: string, extra?: Record<string, string>) {
        if (selectedIds.size === 0) return
        setBulkActioning(true)
        try {
            if (action === "export") {
                const idsParam = Array.from(selectedIds).join(",")
                const r = await fetchWithAuth(`${API_URL}/api/admin/projects/export?ids=${idsParam}`)
                if (r.ok) {
                    const blob = await r.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "projets_export.csv"
                    a.click()
                    URL.revokeObjectURL(url)
                    setToast({ msg: `${selectedIds.size} projet(s) exporte(s)`, type: "ok" })
                } else {
                    setToast({ msg: "Erreur lors de l'export", type: "err" })
                }
            } else if (action === "delete") {
                const r = await fetchWithAuth(`${API_URL}/api/admin/projects/bulk-action`, {
                    method: "POST",
                    body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
                })
                const data = await r.json()
                if (data.success) {
                    setProjects(prev => prev.filter(p => !selectedIds.has(p.project_id)))
                    setToast({ msg: `${data.affected || selectedIds.size} projet(s) supprime(s)`, type: "ok" })
                    exitBulkMode()
                } else {
                    setToast({ msg: data.error || "Erreur lors de la suppression", type: "err" })
                }
            } else {
                const body: Record<string, unknown> = { action, ids: Array.from(selectedIds) }
                if (extra?.status) body.status = extra.status
                const r = await fetchWithAuth(`${API_URL}/api/admin/projects/bulk-action`, {
                    method: "POST",
                    body: JSON.stringify(body),
                })
                const data = await r.json()
                if (data.success) {
                    if (action === "archive") {
                        setProjects(prev => prev.map(p => selectedIds.has(p.project_id) ? { ...p, status: "archived" } : p))
                        setToast({ msg: `${data.affected || selectedIds.size} projet(s) archive(s)`, type: "ok" })
                    } else if (action === "status" && extra?.status) {
                        setProjects(prev => prev.map(p => selectedIds.has(p.project_id) ? { ...p, status: extra.status } : p))
                        setToast({ msg: `Statut mis a jour pour ${data.affected || selectedIds.size} projet(s)`, type: "ok" })
                    }
                    exitBulkMode()
                } else {
                    setToast({ msg: data.error || "Erreur", type: "err" })
                }
            }
        } catch {
            setToast({ msg: "Erreur reseau", type: "err" })
        }
        setBulkActioning(false)
        setBulkDeleteConfirm(false)
        setBulkStatusDropdown(false)
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
        color: "#000000",
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
                    <div style={{ display: "flex", gap: 8 }}>
                        {bulkMode ? (
                            <button
                                onClick={exitBulkMode}
                                style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                                Annuler
                            </button>
                        ) : (
                            <button
                                onClick={() => setBulkMode(true)}
                                style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                                <CheckSquare size={14} /> Selectionner
                            </button>
                        )}
                        <a
                            href="/admin/dashboard"
                            style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                            <ArrowLeft size={14} />
                            Dashboard
                        </a>
                    </div>
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

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{sorted.length} projet{sorted.length > 1 ? "s" : ""} affiche{sorted.length > 1 ? "s" : ""}</span>
                    {bulkMode && (
                        <span style={{ fontWeight: 600, color: selectedIds.size > 0 ? "#000000" : C.muted }}>
                            {selectedIds.size} projet{selectedIds.size > 1 ? "s" : ""} selectionne{selectedIds.size > 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {/* Table */}
                <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border, overflow: "auto" }}>
                    <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", tableLayout: Object.keys(columnWidths).length > 0 ? "fixed" : "auto" }}>
                        <thead>
                            <tr>
                                {bulkMode && (
                                    <th style={{ ...thStyle, width: 40, textAlign: "center", cursor: "default" }}>
                                        <input type="checkbox" checked={sorted.length > 0 && selectedIds.size === sorted.length} onChange={toggleSelectAll} style={{ cursor: "pointer", accentColor: "#F4CF15" }} />
                                    </th>
                                )}
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
                                            <button onClick={() => { setDrawerProjectId(project.project_id); setDrawerOpen(true) }} className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, cursor: "pointer" }} title="Voir">
                                                <ExternalLink size={13} />
                                            </button>
                                            <button onClick={() => { setDrawerProjectId(project.project_id); setDrawerOpen(true) }} className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, cursor: "pointer" }} title="Modifier">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => setDeleteConfirmId(project.project_id)} className="btn-danger" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid #fecaca", backgroundColor: "#fef2f2", color: "#991b1b", cursor: "pointer" }} title="Supprimer">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ),
                                }

                                const isSelected = selectedIds.has(project.project_id)

                                return (
                                    <React.Fragment key={project.project_id}>
                                        <tr
                                            style={{
                                                transition: "background 0.15s", cursor: "pointer",
                                                backgroundColor: isSelected ? "#FAFFFD" : undefined,
                                                outline: isSelected ? "1px solid #F4CF15" : undefined,
                                            }}
                                            onClick={() => {
                                                if (bulkMode) { toggleSelect(project.project_id); return }
                                                setExpandedProject(isExpanded ? null : project.project_id)
                                            }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#fafaf8" }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#FAFFFD" : "" }}
                                        >
                                            {bulkMode && (
                                                <td style={{ ...tdStyle, width: 40, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(project.project_id)} style={{ cursor: "pointer", accentColor: "#F4CF15" }} />
                                                </td>
                                            )}
                                            {columnOrder.map((col) => (
                                                <td key={col} style={{ ...tdStyle, textAlign: col === "actions" ? "center" : "left" }}>
                                                    {cellContent[col]}
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && !bulkMode && (
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
                                Confirmer la suppression du projet <strong style={{ color: C.dark }}>{deleteConfirmId.slice(0, 12)}</strong> ? Cette action est irréversible.
                            </p>
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary" style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                    Annuler
                                </button>
                                <button onClick={() => handleDeleteProject(deleteConfirmId)} disabled={deleting} className="btn-danger" style={{ padding: "8px 20px", borderRadius: 8, border: "none", backgroundColor: "#991b1b", color: C.white, fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                                    {deleting ? "Suppression..." : "Confirmer la suppression"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk action bar */}
            {bulkMode && selectedIds.size > 0 && (
                <div style={{
                    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                    zIndex: 100, backgroundColor: "#000000", color: "#FAFFFD",
                    borderRadius: 12, padding: "12px 24px",
                    boxShadow: "0 8px 32px rgba(58,64,64,0.3)",
                    display: "flex", alignItems: "center", gap: 16,
                    fontFamily: "Inter, sans-serif", fontSize: 13,
                    maxWidth: "90vw", flexWrap: "wrap", justifyContent: "center",
                }}>
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {selectedIds.size} projet{selectedIds.size > 1 ? "s" : ""} selectionne{selectedIds.size > 1 ? "s" : ""}
                    </span>
                    <div style={{ width: 1, height: 20, backgroundColor: "rgba(250,255,253,0.2)" }} />

                    <button disabled={bulkActioning} onClick={() => bulkAction("archive")} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8,
                        border: "1px solid rgba(250,255,253,0.2)", background: "transparent", color: "#FAFFFD",
                        fontSize: 13, fontWeight: 500, cursor: bulkActioning ? "not-allowed" : "pointer",
                    }}>
                        <Archive size={14} /> Archiver
                    </button>

                    <button disabled={bulkActioning} onClick={() => setBulkDeleteConfirm(true)} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8,
                        border: "1px solid rgba(250,255,253,0.2)", background: "transparent", color: "#fca5a5",
                        fontSize: 13, fontWeight: 500, cursor: bulkActioning ? "not-allowed" : "pointer",
                    }}>
                        <Trash2 size={14} /> Supprimer
                    </button>

                    {/* Status dropdown */}
                    <div style={{ position: "relative" }}>
                        <button disabled={bulkActioning} onClick={() => setBulkStatusDropdown(v => !v)} style={{
                            display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8,
                            border: "1px solid rgba(250,255,253,0.2)", background: "transparent", color: "#FAFFFD",
                            fontSize: 13, fontWeight: 500, cursor: bulkActioning ? "not-allowed" : "pointer",
                        }}>
                            <RefreshCw size={14} /> Changer le statut <ChevronDown size={12} />
                        </button>
                        {bulkStatusDropdown && (
                            <div style={{
                                position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                                backgroundColor: "#FAFFFD", borderRadius: 8, border: "1px solid #e0e0de",
                                boxShadow: "0 4px 16px rgba(58,64,64,0.15)", overflow: "hidden", minWidth: 180, zIndex: 101,
                            }}>
                                {STATUS_OPTIONS.filter(s => s !== "archived").map(s => (
                                    <button key={s} onClick={() => bulkAction("status", { status: s })} style={{
                                        display: "block", width: "100%", padding: "9px 14px", border: "none",
                                        background: "transparent", textAlign: "left", fontSize: 13, color: "#000000",
                                        cursor: "pointer", borderBottom: "1px solid #f0f0ee",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0ee"}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        <span style={{
                                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                                            backgroundColor: STATUS_CONFIG[s]?.color || "#999", marginRight: 8,
                                        }} />
                                        {STATUS_CONFIG[s]?.label || s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button disabled={bulkActioning} onClick={() => bulkAction("export")} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8,
                        border: "none", background: "#F4CF15", color: "#000000",
                        fontSize: 13, fontWeight: 600, cursor: bulkActioning ? "not-allowed" : "pointer",
                    }}>
                        <Download size={14} /> Exporter
                    </button>
                </div>
            )}

            {/* Bulk delete confirmation modal */}
            {bulkDeleteConfirm && (
                <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setBulkDeleteConfirm(false)}>
                    <div style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, maxWidth: 420, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: "0 0 8px" }}>Supprimer {selectedIds.size} projet{selectedIds.size > 1 ? "s" : ""} ?</h3>
                        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
                            Cette action est irreversible. Les projets selectionnes seront supprimes.
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setBulkDeleteConfirm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                Annuler
                            </button>
                            <button onClick={() => bulkAction("delete")} disabled={bulkActioning} style={{ padding: "8px 20px", borderRadius: 8, border: "none", backgroundColor: "#991b1b", color: C.white, fontSize: 13, fontWeight: 600, cursor: bulkActioning ? "not-allowed" : "pointer", opacity: bulkActioning ? 0.6 : 1 }}>
                                {bulkActioning ? "Suppression..." : "Confirmer la suppression"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 300,
                    padding: "12px 20px", borderRadius: 10,
                    backgroundColor: toast.type === "ok" ? "#e8f8ee" : "#fef2f2",
                    color: toast.type === "ok" ? "#1a7a3c" : "#991b1b",
                    border: "1px solid " + (toast.type === "ok" ? "#a8dbb8" : "#fecaca"),
                    fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                    boxShadow: "0 4px 16px rgba(58,64,64,0.12)",
                    animation: "toastIn 300ms ease",
                }}>
                    {toast.msg}
                </div>
            )}

            <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>

            {/* Project detail drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerProjectId(null) }}
                title="Detail du projet"
                width="800px"
            >
                {drawerProjectId && (
                    <>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                            <button
                                onClick={() => { setAiPanelOpen((v) => !v); if (!aiPanelOpen) setAiMessages([]) }}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                    border: "1px solid " + (aiPanelOpen ? C.yellow : C.border),
                                    background: aiPanelOpen ? "#fef9e0" : C.white, color: C.dark,
                                    cursor: "pointer",
                                }}
                            >
                                <Brain size={13} /> Assistant IA
                            </button>
                            <a
                                href={`/projet/${drawerProjectId}`}
                                className="btn-secondary"
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

                        {/* AI Assistant Chat Panel */}
                        {aiPanelOpen && (
                            <div style={{ marginBottom: 16, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", background: "#fafaf8" }}>
                                <div style={{ padding: "10px 14px", background: C.dark, color: C.white, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Brain size={14} /> Assistant IA — Projet
                                </div>
                                <div style={{ maxHeight: 350, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {aiMessages.length === 0 && (
                                        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 20 }}>
                                            Posez une question sur ce projet...
                                        </div>
                                    )}
                                    {aiMessages.map((msg, idx) => {
                                        const isUser = msg.role === "user"
                                        return (
                                            <div key={idx} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                                                <div style={{
                                                    maxWidth: "75%",
                                                    padding: "10px 14px",
                                                    borderRadius: 12,
                                                    backgroundColor: isUser ? C.dark : C.white,
                                                    color: isUser ? C.white : C.dark,
                                                    fontSize: 13,
                                                    lineHeight: 1.5,
                                                    border: isUser ? "none" : "1px solid " + C.border,
                                                    whiteSpace: "pre-wrap",
                                                }}>
                                                    {!isUser && (
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4 }}>
                                                            Assistant IA
                                                        </div>
                                                    )}
                                                    {msg.content}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {aiLoading && (
                                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                            <div style={{ padding: "10px 14px", borderRadius: 12, backgroundColor: C.white, border: "1px solid " + C.border, fontSize: 13, color: C.muted }}>
                                                <Loader2 size={14} style={{ animation: "spin 1s linear infinite", verticalAlign: "middle", marginRight: 6 }} />
                                                Reflexion...
                                            </div>
                                        </div>
                                    )}
                                    <div ref={aiChatEndRef} />
                                </div>
                                <div style={{ borderTop: "1px solid " + C.border, padding: 10, display: "flex", gap: 8 }}>
                                    <input
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
                                        placeholder="Poser une question sur ce projet..."
                                        style={{ flex: 1, padding: "9px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, color: C.dark, backgroundColor: C.white, outline: "none", fontFamily: "Inter, sans-serif" }}
                                    />
                                    <button
                                        onClick={handleAiSend}
                                        disabled={aiLoading || !aiInput.trim()}
                                        className="btn-primary"
                                        style={{
                                            padding: "9px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
                                            backgroundColor: aiLoading || !aiInput.trim() ? C.muted : C.yellow, color: C.dark,
                                            cursor: aiLoading || !aiInput.trim() ? "not-allowed" : "pointer",
                                            display: "inline-flex", alignItems: "center", gap: 4,
                                        }}
                                    >
                                        <Send size={13} /> Envoyer
                                    </button>
                                </div>
                            </div>
                        )}

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
