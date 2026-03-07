"use client"

import React, { useEffect, useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar, X, ExternalLink, Package, Clock, AlertCircle, Loader, GripVertical, Trash2 } from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectDates {
    project_id: string
    label: string
    status: string
    created_at: string
    validated_at?: string
    production_start?: string
    bat_validated_at?: string
    delivery_estimated?: string
    delivery_deadline?: string
}

interface ProjectDetail {
    project_id: string
    status: string
    label: string
    created_at: string
    validated_at?: string
    production_start?: string
    bat_validated_at?: string
    delivery_estimated?: string
    delivery_deadline?: string
    briefs?: { brief_analysis?: { delivery_deadline?: string; product_type?: string; quantity?: number; total_estimated_ht?: number } }[]
    product?: { label?: string }
}

interface Milestone {
    key: string
    label: string
    color: string
    dot: string
    date: Date | null
}

// date potentielle ajoutée par drag & drop
interface PotentialDate {
    project_id: string
    milestone_key: string
    date: string // ISO
}

// ─── Config jalons ────────────────────────────────────────────────────────────

const MILESTONES_CONFIG = [
    { key: "created_at",         label: "Création",          color: "#e8f0fe", dot: "#4a7ff5" },
    { key: "validated_at",       label: "Validation",        color: "#e8f8ee", dot: "#27ae60" },
    { key: "production_start",   label: "Début production",  color: "#fff3e0", dot: "#e67e22" },
    { key: "bat_validated_at",   label: "BAT validé",        color: "#f3e5f5", dot: "#8e44ad" },
    { key: "delivery_estimated", label: "Livraison estimée", color: "#fef9e0", dot: "#f4cf15" },
]

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    pending:     { label: "En attente",    color: "#e67e22", bg: "#fff3e0" },
    in_progress: { label: "En production", color: "#2980b9", bg: "#e8f4fd" },
    delivered:   { label: "Livré",         color: "#27ae60", bg: "#e8f8ee" },
    cancelled:   { label: "Annulé",        color: "#c0392b", bg: "#fdecea" },
    draft:       { label: "Brouillon",     color: "#7a8080", bg: "#f0f0ee" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(d: Date) {
    const date = new Date(d)
    const day = date.getDay()
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
    date.setHours(0, 0, 0, 0)
    return date
}
function addDays(d: Date, n: number) {
    const date = new Date(d)
    date.setDate(date.getDate() + n)
    return date
}
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function parseDate(s?: string): Date | null {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}
function fmtDate(s?: string) {
    if (!s) return "—"
    // Forcer le parsing en heure locale (évite le décalage UTC+1)
    const d = new Date(s.includes("T") ? s : s + "T12:00:00")
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}
function fmtPrice(n?: number) {
    if (!n) return "—"
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
}
function toISODate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Planning() {
    const { token, user } = useAuth()
    const [projects, setProjects] = useState<ProjectDates[]>([])
    const [loading, setLoading] = useState(true)
    const [weekOffset, setWeekOffset] = useState(0)

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerProject, setDrawerProject] = useState<ProjectDetail | null>(null)
    const [drawerLoading, setDrawerLoading] = useState(false)

    // Drag & drop
    const [draggedMilestone, setDraggedMilestone] = useState<string | null>(null)
    const [dropTarget, setDropTarget] = useState<{ project_id: string; date: string } | null>(null)
    const [potentialDates, setPotentialDates] = useState<PotentialDate[]>([])

    const baseMonday = startOfWeek(new Date())
    const startDate = addDays(baseMonday, weekOffset * 7)
    const WEEKS = 5
    const DAYS = WEEKS * 7
    const days: Date[] = Array.from({ length: DAYS }, (_, i) => addDays(startDate, i))
    const weeks: Date[][] = Array.from({ length: WEEKS }, (_, w) => days.slice(w * 7, w * 7 + 7))
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const DAY_W = 40
    const ROW_H = 52
    const LABEL_W = 200
    const DRAWER_W = 380

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDrawerOpen(false) }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    useEffect(() => {
        if (!token) { setLoading(false); return }
        const accountId = user?.account_id || ""
        fetch(`${API_URL}/api/project?account_id=${accountId}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.projects) {
                    setProjects(data.projects.map((p: any) => ({
                        project_id:         p.project_id,
                        label:              p.product?.label || p.briefs?.[0]?.brief_analysis?.product_type || "Projet",
                        status:             p.status,
                        created_at:         p.created_at,
                        validated_at:       p.validated_at,
                        production_start:   p.production_start,
                        bat_validated_at:   p.bat_validated_at,
                        delivery_estimated: p.delivery_estimated,
                        delivery_deadline:  p.briefs?.[0]?.brief_analysis?.delivery_deadline,
                    })))
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    function openDrawer(projectId: string) {
        setDrawerOpen(true)
        setDrawerProject(null)
        setDrawerLoading(true)
        fetch(`${API_URL}/api/project/${projectId}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.project) setDrawerProject(data.project)
                setDrawerLoading(false)
            })
            .catch(() => setDrawerLoading(false))
    }

    function getMilestones(p: ProjectDates): Milestone[] {
        return MILESTONES_CONFIG.map(m => ({
            ...m,
            date: parseDate(p[m.key as keyof ProjectDates] as string),
        }))
    }

    // ── Drag handlers ─────────────────────────────────────────────────────────

    function handleDragStart(e: React.DragEvent, milestoneKey: string) {
        setDraggedMilestone(milestoneKey)
        e.dataTransfer.setData("milestoneKey", milestoneKey)
        e.dataTransfer.effectAllowed = "copy"
    }

    function handleDragOver(e: React.DragEvent, projectId: string, date: Date) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        setDropTarget({ project_id: projectId, date: toISODate(date) })
    }

    function handleDragLeave() {
        setDropTarget(null)
    }

    function handleDrop(e: React.DragEvent, projectId: string, date: Date) {
        e.preventDefault()
        const milestoneKey = e.dataTransfer.getData("milestoneKey") || draggedMilestone
        if (!milestoneKey) return
        const isoDate = toISODate(date)

        setPotentialDates(prev => {
            // Si même projet+milestone existe déjà → mettre à jour la date
            const existing = prev.findIndex(p => p.project_id === projectId && p.milestone_key === milestoneKey)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { project_id: projectId, milestone_key: milestoneKey, date: isoDate }
                return updated
            }
            return [...prev, { project_id: projectId, milestone_key: milestoneKey, date: isoDate }]
        })
        setDraggedMilestone(null)
        setDropTarget(null)
    }

    function removePotentialDate(projectId: string, milestoneKey: string) {
        setPotentialDates(prev => prev.filter(p => !(p.project_id === projectId && p.milestone_key === milestoneKey)))
    }

    function handleDragEnd() {
        setDraggedMilestone(null)
        setDropTarget(null)
    }

    const statusInfo = drawerProject ? (STATUS_LABELS[drawerProject.status] || { label: drawerProject.status, color: "#000", bg: "#f0f0ee" }) : null
    const brief = drawerProject?.briefs?.[0]?.brief_analysis

    // Dates potentielles pour le projet du drawer
    const drawerPotentialDates = drawerProject
        ? potentialDates.filter(p => p.project_id === drawerProject.project_id)
        : []

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif", color: C.muted }}>
            Chargement du planning...
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", backgroundColor: C.bg, minHeight: "100vh", padding: "32px 24px", boxSizing: "border-box" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: "#000", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <Calendar size={20} /> Planning
                    </h1>
                    <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
                        {days[0].toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} — {days[DAYS - 1].toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "7px 10px", backgroundColor: C.white, border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setWeekOffset(0)} style={{ padding: "7px 14px", backgroundColor: weekOffset === 0 ? "#000" : C.white, color: weekOffset === 0 ? C.white : "#000", border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        Aujourd'hui
                    </button>
                    <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: "7px 10px", backgroundColor: C.white, border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ── Légende — draggable ── */}
            <div style={{ marginBottom: 20, position: "sticky", top: 60, zIndex: 700, backgroundColor: C.bg, paddingBottom: 8, marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    Glisser un jalon sur le planning pour ajouter une date potentielle
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {MILESTONES_CONFIG.map(m => (
                        <div
                            key={m.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, m.key)}
                            onDragEnd={handleDragEnd}
                            style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "6px 12px", borderRadius: 8,
                                border: `1.5px dashed ${draggedMilestone === m.key ? m.dot : C.border}`,
                                backgroundColor: draggedMilestone === m.key ? m.color : C.white,
                                cursor: "grab", userSelect: "none",
                                transition: "all 0.15s",
                                opacity: draggedMilestone && draggedMilestone !== m.key ? 0.5 : 1,
                            }}
                        >
                            <GripVertical size={12} color={C.muted} />
                            <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: m.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Grille ── */}
            <div style={{
                backgroundColor: C.white, borderRadius: 16, border: "1px solid " + C.border,
                overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "margin-right 0.3s cubic-bezier(0.4,0,0.2,1)",
                marginRight: drawerOpen ? DRAWER_W + 16 : 0,
            }}>
                <div style={{ minWidth: LABEL_W + DAYS * DAY_W }}>

                    {/* Header semaines */}
                    <div style={{ display: "flex", borderBottom: "1px solid " + C.border, position: "sticky", top: 0, zIndex: 10, backgroundColor: C.white }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 1, borderRight: "1px solid " + C.border }}>
                            Projet
                        </div>
                        {weeks.map((week, wi) => {
                            const hasToday = week.some(d => isSameDay(d, today))
                            return (
                                <div key={wi} style={{ width: 7 * DAY_W, minWidth: 7 * DAY_W, textAlign: "center" as const, padding: "8px 0", fontSize: 11, fontWeight: hasToday ? 700 : 600, color: hasToday ? "#000" : C.muted, borderRight: wi < WEEKS - 1 ? "1px solid " + C.border : "none", backgroundColor: hasToday ? "rgba(244,207,21,0.06)" : "transparent" }}>
                                    Sem. {week[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – {week[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </div>
                            )
                        })}
                    </div>

                    {/* Header jours */}
                    <div style={{ display: "flex", borderBottom: "2px solid " + C.border, position: "sticky", top: 37, zIndex: 10, backgroundColor: C.white }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, borderRight: "1px solid " + C.border }} />
                        {days.map((d, i) => {
                            const isToday = isSameDay(d, today)
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                            return (
                                <div key={i} style={{ width: DAY_W, minWidth: DAY_W, textAlign: "center" as const, padding: "6px 0", fontSize: 10, fontWeight: isToday ? 800 : 500, color: isToday ? "#000" : isWeekend ? "#bbb" : C.muted, backgroundColor: isToday ? "rgba(244,207,21,0.15)" : isWeekend ? "#fafafa" : "transparent", borderRight: (i + 1) % 7 === 0 && i < DAYS - 1 ? "1px solid " + C.border : "1px solid #f0f0f0" }}>
                                    {d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                                    <br />
                                    <strong>{d.getDate()}</strong>
                                </div>
                            )
                        })}
                    </div>

                    {/* Lignes projets */}
                    {projects.length === 0 ? (
                        <div style={{ padding: "40px 24px", textAlign: "center" as const, color: C.muted, fontSize: 14 }}>
                            Aucun projet à afficher
                        </div>
                    ) : (
                        projects.map((project, pi) => {
                            const milestones = getMilestones(project)
                            const isActive = drawerProject?.project_id === project.project_id && drawerOpen
                            const projectPotentials = potentialDates.filter(p => p.project_id === project.project_id)

                            return (
                                <div key={project.project_id} style={{ display: "flex", borderBottom: pi < projects.length - 1 ? "1px solid " + C.border : "none", minHeight: ROW_H, backgroundColor: isActive ? "rgba(244,207,21,0.04)" : "transparent" }}>
                                    {/* Label */}
                                    <div
                                        onClick={() => openDrawer(project.project_id)}
                                        className="gantt-row-label"
                                        style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column" as const, justifyContent: "center", cursor: "pointer" }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#000", lineHeight: 1.3 }}>{project.label}</span>
                                        <span style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{project.project_id.slice(0, 8)}…</span>
                                    </div>

                                    {/* Cellules jours */}
                                    <div style={{ flex: 1, display: "flex" }}>
                                        {days.map((d, di) => {
                                            const isToday = isSameDay(d, today)
                                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                                            const isoDate = toISODate(d)
                                            const isDropHere = dropTarget?.project_id === project.project_id && dropTarget?.date === isoDate && !!draggedMilestone

                                            const confirmedOnDay = milestones.filter(m => m.date && isSameDay(m.date, d))
                                            const potentialOnDay = projectPotentials.filter(p => p.date === isoDate)
                                            const dragMilestoneCfg = draggedMilestone ? MILESTONES_CONFIG.find(m => m.key === draggedMilestone) : null

                                            return (
                                                <div
                                                    key={di}
                                                    onDragOver={draggedMilestone ? (e) => handleDragOver(e, project.project_id, d) : undefined}
                                                    onDragLeave={draggedMilestone ? handleDragLeave : undefined}
                                                    onDrop={draggedMilestone ? (e) => handleDrop(e, project.project_id, d) : undefined}
                                                    style={{
                                                        width: DAY_W, minWidth: DAY_W,
                                                        backgroundColor: isDropHere
                                                            ? (dragMilestoneCfg?.color || "rgba(244,207,21,0.2)")
                                                            : isToday ? "rgba(244,207,21,0.08)"
                                                            : isWeekend ? "#fafafa" : "transparent",
                                                        borderRight: (di + 1) % 7 === 0 && di < DAYS - 1 ? "1px solid " + C.border : "1px solid #f5f5f5",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        flexDirection: "column" as const, gap: 2,
                                                        outline: isDropHere ? `2px dashed ${dragMilestoneCfg?.dot || C.yellow}` : "none",
                                                        outlineOffset: -2,
                                                        transition: "background-color 0.1s",
                                                        cursor: draggedMilestone ? "copy" : "default",
                                                    }}
                                                >
                                                    {/* Jalons confirmés */}
                                                    {confirmedOnDay.map((m, mi) => (
                                                        <div key={mi} title={m.label} style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: m.color, border: "2px solid " + m.dot, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.dot }} />
                                                        </div>
                                                    ))}
                                                    {/* Jalons potentiels (dashed) */}
                                                    {potentialOnDay.map((p, pi2) => {
                                                        const cfg = MILESTONES_CONFIG.find(m => m.key === p.milestone_key)
                                                        if (!cfg) return null
                                                        return (
                                                            <div
                                                                key={pi2}
                                                                title={`${cfg.label} (potentiel)`}
                                                                onClick={() => removePotentialDate(project.project_id, p.milestone_key)}
                                                                style={{
                                                                    width: 26, height: 26, borderRadius: "50%",
                                                                    backgroundColor: "transparent",
                                                                    border: `2px dashed ${cfg.dot}`,
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    flexShrink: 0, cursor: "pointer",
                                                                    opacity: 0.75,
                                                                }}
                                                            >
                                                                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: cfg.dot, opacity: 0.6 }} />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: C.muted, textAlign: "center" as const }}>
                Cercle plein = date confirmée · Cercle pointillé = date potentielle (cliquer pour supprimer)
            </p>

            {/* ── Drawer ── */}
            <>
                {drawerOpen && (
                    <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.08)", zIndex: 1100 }} />
                )}
                <div style={{
                    position: "fixed", top: 60, right: drawerOpen ? 0 : -DRAWER_W - 20, bottom: 0,
                    width: DRAWER_W, backgroundColor: C.white, borderLeft: "1px solid " + C.border,
                    boxShadow: drawerOpen ? "-4px 0 24px rgba(0,0,0,0.1)" : "none",
                    zIndex: 1101, transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
                    display: "flex", flexDirection: "column" as const, fontFamily: "Inter, sans-serif",
                }}>
                    {/* Header drawer */}
                    <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#000", lineHeight: 1.3 }}>
                                {drawerProject?.label || drawerProject?.product?.label || "Projet"}
                            </div>
                            {drawerProject && statusInfo && (
                                <span style={{ display: "inline-block", marginTop: 6, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                    {statusInfo.label}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
                        {drawerLoading ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: C.muted, gap: 8 }}>
                                <Loader size={16} /> Chargement...
                            </div>
                        ) : drawerProject ? (
                            <>
                                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginBottom: 20, padding: "6px 10px", backgroundColor: C.bg, borderRadius: 6 }}>
                                    {drawerProject.project_id}
                                </div>

                                {brief && (
                                    <div style={{ marginBottom: 20 }}>
                                        <SectionTitle icon={<Package size={13} />} label="Commande" />
                                        <InfoRow label="Type" value={brief.product_type || "—"} />
                                        <InfoRow label="Quantité" value={brief.quantity ? `${brief.quantity} ex.` : "—"} />
                                        <InfoRow label="Estimation HT" value={fmtPrice(brief.total_estimated_ht)} highlight />
                                    </div>
                                )}

                                {/* Jalons confirmés */}
                                <div style={{ marginBottom: 20 }}>
                                    <SectionTitle icon={<Clock size={13} />} label="Dates confirmées" />
                                    {MILESTONES_CONFIG.map(m => {
                                        const val = drawerProject[m.key as keyof ProjectDetail] as string | undefined
                                        return (
                                            <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: val ? m.dot : "#ddd", flexShrink: 0 }} />
                                                    <span style={{ fontSize: 13, color: val ? "#000" : C.muted }}>{m.label}</span>
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: val ? 600 : 400, color: val ? "#000" : C.muted }}>{fmtDate(val)}</span>
                                            </div>
                                        )
                                    })}
                                    {drawerProject.delivery_deadline && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <AlertCircle size={8} color="#e74c3c" />
                                                <span style={{ fontSize: 13, color: "#000" }}>Délai demandé</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#e74c3c" }}>{fmtDate(drawerProject.delivery_deadline)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Dates potentielles */}
                                {drawerPotentialDates.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <SectionTitle icon={<Calendar size={13} />} label="Dates potentielles" />
                                        {drawerPotentialDates.map(p => {
                                            const cfg = MILESTONES_CONFIG.find(m => m.key === p.milestone_key)
                                            if (!cfg) return null
                                            return (
                                                <div key={p.milestone_key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", border: `2px dashed ${cfg.dot}`, flexShrink: 0 }} />
                                                        <span style={{ fontSize: 13, color: "#000" }}>{cfg.label}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.dot }}>{fmtDate(p.date)}</span>
                                                        <button onClick={() => removePotentialDate(p.project_id, p.milestone_key)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, display: "flex", alignItems: "center" }}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                <a href={`/projet/${drawerProject.project_id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 0", backgroundColor: "#000", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", boxSizing: "border-box" as const }}>
                                    Voir le projet <ExternalLink size={14} />
                                </a>
                            </>
                        ) : (
                            <div style={{ textAlign: "center" as const, color: C.muted, fontSize: 13, marginTop: 40 }}>
                                Impossible de charger le projet
                            </div>
                        )}
                    </div>
                </div>
            </>

            <style>{`
                .gantt-row-label:hover { background-color: rgba(0,0,0,0.02); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#000", textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10 }}>
            {icon} {label}
        </div>
    )
}
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + C.border }}>
            <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 600, color: highlight ? "#000" : "#333" }}>{value}</span>
        </div>
    )
}
