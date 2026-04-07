"use client"

import React, { useEffect, useState } from "react"
import {
    ChevronLeft, ChevronRight, Calendar, X, ExternalLink,
    Package, Clock, AlertCircle, Loader, GripVertical, Trash2,
    CheckCircle2, FileText, ClipboardList, Save, XCircle
} from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import ProjectTimeline from "@/components/shared/ProjectTimeline"
import { formatPrice, formatDate } from "@/lib/format"

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
    label?: string
    created_at: string
    validated_at?: string
    production_start?: string
    bat_validated_at?: string
    delivery_estimated?: string
    delivery_deadline?: string
    quote_url?: string
    quote_number?: string
    product?: { label?: string }
    quantity?: number
    pricing?: { unit_net?: number; total_net?: number }
    brief_analysis?: {
        product_type?: string
        quantity_detected?: number
        dimensions?: string
        delivery_deadline?: string
        material?: string
        finish?: string
        raw_extraction?: string
        special_requirements?: string[]
        total_estimated_ht?: number
    }
    briefs?: { brief_analysis?: any }[]
    // Dates souhaitées sauvegardées
    planning_dates?: Record<string, string>
}

interface Milestone {
    key: string
    label: string
    color: string
    dot: string
    date: Date | null
}

interface PotentialDate {
    project_id: string
    milestone_key: string
    date: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MILESTONES_CONFIG = [
    { key: "created_at",         label: "Création",          color: "#e8f0fe", dot: "#4a7ff5" },
    { key: "validated_at",       label: "Validation",        color: "#e8f8ee", dot: "#27ae60" },
    { key: "production_start",   label: "Début production",  color: "#fff3e0", dot: "#e67e22" },
    { key: "bat_validated_at",   label: "BAT validé",        color: "#f3e5f5", dot: "#8e44ad" },
    { key: "delivery_estimated", label: "Livraison estimée", color: "#fef9e0", dot: "#f4cf15" },
]

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:      { label: "En attente de devis", color: "#b89a00", bg: "#fef9e0", border: "#f4cf1588" },
    quoted:       { label: "Devis disponible",    color: "#1a7a3c", bg: "#e8f8ee", border: "#a8dbb8" },
    validated:    { label: "Commande validée",    color: "#1a3c7a", bg: "#e8f0fe", border: "#a8b8db" },
    in_production:{ label: "En production",       color: "#e65100", bg: "#fff3e0", border: "#ffcc80" },
    delivered:    { label: "Livré",               color: "#004d40", bg: "#e0f2f1", border: "#80cbc4" },
    draft:        { label: "Brouillon",           color: "#7a8080", bg: "#f0f0ee", border: "#d0d0d0" },
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
    const d = new Date(s.includes("T") ? s : s + "T12:00:00")
    return isNaN(d.getTime()) ? null : d
}
function toISODate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}
function fmtDate(s?: string) {
    if (!s) return "—"
    const d = new Date(s.includes("T") ? s : s + "T12:00:00")
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Planning() {
    const { token, user } = useAuth()
    const [projects, setProjects] = useState<ProjectDates[]>([])
    const [loading, setLoading] = useState(true)
    const [weekOffset, setWeekOffset] = useState(0)

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerProject, setDrawerProject] = useState<ProjectDetail | null>(null)
    const [drawerLoading, setDrawerLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"detail" | "dates">("detail")

    // Dates souhaitées (édition locale)
    const [desiredDates, setDesiredDates] = useState<Record<string, string>>({})
    const [dateSources, setDateSources] = useState<Record<string, "brief" | "supplier" | "manual">>({})
    const [saveLoading, setSaveLoading] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [suggestLoading, setSuggestLoading] = useState(false)

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
    const LABEL_W = 200
    const DRAWER_W = 440

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDrawerOpen(false) }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    // Fetch liste projets
    useEffect(() => {
        if (!token) { setLoading(false); return }
        const accountId = user?.account_id || ""
        fetchWithAuth(`${API_URL}/api/project?account_id=${accountId}`)
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

                    // ── Pré-charger les dates souhaitées sur la grille ──
                    // On lit les champs planning (retournés par Yannis) sur chaque projet
                    const DESIRED_KEYS = ["validated_at", "production_start", "bat_validated_at", "delivery_estimated"]
                    const initials: PotentialDate[] = []
                    data.projects.forEach((p: any) => {
                        // Les dates souhaitées peuvent être dans p.planning ou directement sur p
                        const planning = p.planning || {}
                        DESIRED_KEYS.forEach(k => {
                            const raw = planning[k] || p[`desired_${k}`]
                            if (!raw) return
                            const isoDate = raw.includes("T") ? raw.split("T")[0] : raw
                            // N'afficher en pointillé que si la date confirmée est différente ou absente
                            const confirmed = p[k]
                            const confirmedISO = confirmed ? (confirmed.includes("T") ? confirmed.split("T")[0] : confirmed) : null
                            if (isoDate !== confirmedISO) {
                                initials.push({ project_id: p.project_id, milestone_key: k, date: isoDate })
                            }
                        })
                    })
                    if (initials.length > 0) setPotentialDates(initials)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    // Fetch détail projet pour le drawer
    function openDrawer(projectId: string) {
        setDrawerOpen(true)
        setDrawerProject(null)
        setDrawerLoading(true)
        setActiveTab("detail")
        setSaveSuccess(false)
        setSaveError(null)
        fetchWithAuth(`${API_URL}/api/project/${projectId}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.project) {
                    setDrawerProject(data.project)
                    // Pré-remplir avec les champs de dates du projet (sauvegardés par Yannis sur le projet)
                    const DESIRED_KEYS = ["validated_at", "production_start", "bat_validated_at", "delivery_estimated"]
                    const prefilled: Record<string, string> = {}
                    DESIRED_KEYS.forEach(k => {
                        const v = data.project[k]
                        if (v) prefilled[k] = typeof v === "string" ? v.split("T")[0] : v
                    })
                    setDesiredDates(prefilled)

                    // Rafraîchir les suggestions intelligentes (brief + fournisseurs)
                    if (token) {
                        setSuggestLoading(true)
                        fetchWithAuth(`${API_URL}/api/project/${projectId}/generate-planning-dates`, {
                            method: "POST",
                        })
                            .then(r => r.json())
                            .then(sugg => {
                                if (sugg.ok && sugg.planning_dates) {
                                    // Ne pas écraser les dates déjà manuellement sauvegardées
                                    const merged: Record<string, string> = { ...sugg.planning_dates }
                                    Object.keys(prefilled).forEach(k => { if (prefilled[k]) merged[k] = prefilled[k] })
                                    setDesiredDates(merged)

                                    // Stocker les sources pour l'affichage des badges
                                    if (sugg.sources) setDateSources(sugg.sources)

                                    // ── Sync sur la grille : ajouter les cercles pointillés ──
                                    const DESIRED_KEYS = ["validated_at", "production_start", "bat_validated_at", "delivery_estimated"]
                                    const newPotentials: PotentialDate[] = Object.entries(merged)
                                        .filter(([k, v]) => !!v && DESIRED_KEYS.includes(k))
                                        .map(([k, v]) => ({ project_id: projectId, milestone_key: k, date: (v as string).includes("T") ? (v as string).split("T")[0] : v as string }))
                                    setPotentialDates(prev => [
                                        ...prev.filter(p => p.project_id !== projectId),
                                        ...newPotentials,
                                    ])
                                }
                                setSuggestLoading(false)
                            })
                            .catch(() => setSuggestLoading(false))
                    }
                }
                setDrawerLoading(false)
            })
            .catch(() => setDrawerLoading(false))
    }

    // Sauvegarder les dates souhaitées
    async function saveDesiredDates() {
        if (!drawerProject || !token) return
        setSaveLoading(true)
        setSaveError(null)
        setSaveSuccess(false)
        try {
            // Seuls les champs gérables par l'endpoint Yannis (à plat)
            const ALLOWED_KEYS = ["validated_at", "production_start", "bat_validated_at", "delivery_estimated"]
            const body: Record<string, string> = {}
            ALLOWED_KEYS.forEach(k => { if (desiredDates[k]) body[k] = desiredDates[k] })

            const res = await fetchWithAuth(`${API_URL}/api/project/${drawerProject.project_id}/planning-dates`, {
                method: "PATCH",
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.ok) {
                setSaveSuccess(true)
                // Mettre à jour les cercles pointillés sur la grille
                const newPotentials: PotentialDate[] = Object.entries(desiredDates)
                    .filter(([, v]) => !!v)
                    .map(([k, v]) => ({ project_id: drawerProject.project_id, milestone_key: k, date: v }))
                setPotentialDates(prev => [
                    ...prev.filter(p => p.project_id !== drawerProject.project_id),
                    ...newPotentials,
                ])
                // Mettre à jour le drawerProject avec les nouvelles dates (réponse planning)
                if (data.planning) {
                    setDrawerProject(prev => prev ? { ...prev, ...data.planning } : prev)
                }
                setTimeout(() => setSaveSuccess(false), 3000)
            } else {
                setSaveError("Erreur lors de la sauvegarde")
            }
        } catch {
            setSaveError("Erreur réseau")
        }
        setSaveLoading(false)
    }

    function getMilestones(p: ProjectDates): Milestone[] {
        return MILESTONES_CONFIG.map(m => ({
            ...m,
            date: parseDate(p[m.key as keyof ProjectDates] as string),
        }))
    }

    // ── Drag ─────────────────────────────────────────────────────────────────
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
    function handleDragLeave() { setDropTarget(null) }
    function handleDrop(e: React.DragEvent, projectId: string, date: Date) {
        e.preventDefault()
        const milestoneKey = e.dataTransfer.getData("milestoneKey") || draggedMilestone
        if (!milestoneKey) return
        const isoDate = toISODate(date)
        setPotentialDates(prev => {
            const existing = prev.findIndex(p => p.project_id === projectId && p.milestone_key === milestoneKey)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { project_id: projectId, milestone_key: milestoneKey, date: isoDate }
                return updated
            }
            return [...prev, { project_id: projectId, milestone_key: milestoneKey, date: isoDate }]
        })
        // Sync dans desiredDates si c'est le projet ouvert
        if (drawerProject?.project_id === projectId) {
            setDesiredDates(prev => ({ ...prev, [milestoneKey]: isoDate }))
        }
        setDraggedMilestone(null)
        setDropTarget(null)
    }
    function handleDragEnd() { setDraggedMilestone(null); setDropTarget(null) }
    function removePotentialDate(projectId: string, milestoneKey: string) {
        setPotentialDates(prev => prev.filter(p => !(p.project_id === projectId && p.milestone_key === milestoneKey)))
        if (drawerProject?.project_id === projectId) {
            setDesiredDates(prev => { const n = { ...prev }; delete n[milestoneKey]; return n })
        }
    }

    const statusInfo = drawerProject
        ? (STATUS_LABELS[drawerProject.status] || { label: drawerProject.status, color: "#000", bg: "#f0f0ee", border: "#d0d0d0" })
        : null
    const brief = drawerProject?.brief_analysis || drawerProject?.briefs?.[0]?.brief_analysis

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

            {/* ── Légende draggable ── */}
            <div style={{ marginBottom: 20, position: "sticky", top: 60, zIndex: 700, backgroundColor: C.bg, paddingBottom: 8, marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    Glisser un jalon sur le planning pour ajouter une date souhaitée
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
                                cursor: "grab", userSelect: "none", transition: "all 0.15s",
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

            {/* ── Grille Gantt ── */}
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
                    ) : projects.map((project, pi) => {
                        const milestones = getMilestones(project)
                        const isActive = drawerProject?.project_id === project.project_id && drawerOpen
                        const projectPotentials = potentialDates.filter(p => p.project_id === project.project_id)

                        return (
                            <div key={project.project_id} style={{ display: "flex", borderBottom: pi < projects.length - 1 ? "1px solid " + C.border : "none", minHeight: 52, backgroundColor: isActive ? "rgba(244,207,21,0.04)" : "transparent" }}>
                                <div onClick={() => openDrawer(project.project_id)} className="gantt-row-label"
                                    style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column" as const, justifyContent: "center", cursor: "pointer" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#000", lineHeight: 1.3 }}>{project.label}</span>
                                    <span style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{project.project_id.slice(0, 8)}…</span>
                                </div>
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
                                            <div key={di}
                                                onDragOver={draggedMilestone ? (e) => handleDragOver(e, project.project_id, d) : undefined}
                                                onDragLeave={draggedMilestone ? handleDragLeave : undefined}
                                                onDrop={draggedMilestone ? (e) => handleDrop(e, project.project_id, d) : undefined}
                                                style={{
                                                    width: DAY_W, minWidth: DAY_W,
                                                    backgroundColor: isDropHere ? (dragMilestoneCfg?.color || "rgba(244,207,21,0.2)") : isToday ? "rgba(244,207,21,0.08)" : isWeekend ? "#fafafa" : "transparent",
                                                    borderRight: (di + 1) % 7 === 0 && di < DAYS - 1 ? "1px solid " + C.border : "1px solid #f5f5f5",
                                                    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 2,
                                                    outline: isDropHere ? `2px dashed ${dragMilestoneCfg?.dot || C.yellow}` : "none",
                                                    outlineOffset: -2, transition: "background-color 0.1s",
                                                    cursor: draggedMilestone ? "copy" : "default",
                                                }}
                                            >
                                                {confirmedOnDay.map((m, mi) => (
                                                    <div key={mi} title={m.label} style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: m.color, border: "2px solid " + m.dot, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.dot }} />
                                                    </div>
                                                ))}
                                                {potentialOnDay.map((p, pi2) => {
                                                    const cfg = MILESTONES_CONFIG.find(m => m.key === p.milestone_key)
                                                    if (!cfg) return null
                                                    return (
                                                        <div key={pi2} title={`${cfg.label} (souhaitée)`}
                                                            onClick={() => removePotentialDate(project.project_id, p.milestone_key)}
                                                            style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "transparent", border: `2px dashed ${cfg.dot}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", opacity: 0.75 }}>
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
                    })}
                </div>
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: C.muted, textAlign: "center" as const }}>
                Cercle plein = date confirmée · Cercle pointillé = date souhaitée (cliquer pour supprimer)
            </p>

            {/* ══ DRAWER ══════════════════════════════════════════════════════ */}
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
                    <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#000", lineHeight: 1.3 }}>
                                    {drawerProject?.brief_analysis?.product_type || drawerProject?.product?.label || drawerProject?.label || "Projet"}
                                </div>
                                {drawerProject && (
                                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4 }}>
                                        {drawerProject.project_id}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Statut + lien projet */}
                        {drawerProject && statusInfo && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: statusInfo.bg, color: statusInfo.color, border: "1px solid " + statusInfo.border }}>
                                    {statusInfo.label}
                                </span>
                                <a href={`/dashboard?project_id=${drawerProject.project_id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.muted, textDecoration: "none", fontWeight: 600 }}>
                                    Voir le projet <ExternalLink size={12} />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
                        {(["detail", "dates"] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                flex: 1, padding: "12px 0", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                                color: activeTab === tab ? "#000" : C.muted,
                                background: "none", border: "none", cursor: "pointer",
                                borderBottom: activeTab === tab ? "2px solid #000" : "2px solid transparent",
                                transition: "all 0.15s",
                            }}>
                                {tab === "detail" ? "Détail projet" : "Dates souhaitées"}
                            </button>
                        ))}
                    </div>

                    {/* Contenu scrollable */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                        {drawerLoading ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: C.muted, gap: 8 }}>
                                <Loader size={16} /> Chargement...
                            </div>
                        ) : !drawerProject ? (
                            <div style={{ textAlign: "center" as const, color: C.muted, fontSize: 13, marginTop: 40 }}>Impossible de charger le projet</div>
                        ) : activeTab === "detail" ? (
                            <DetailTab project={drawerProject} brief={brief} />
                        ) : (
                            <DatesTab
                                project={drawerProject}
                                desiredDates={desiredDates}
                                setDesiredDates={setDesiredDates}
                                setPotentialDates={setPotentialDates}
                                dateSources={dateSources}
                                suggestLoading={suggestLoading}
                                saveLoading={saveLoading}
                                saveSuccess={saveSuccess}
                                saveError={saveError}
                                onSave={saveDesiredDates}
                                potentialDates={potentialDates}
                                removePotentialDate={removePotentialDate}
                            />
                        )}
                    </div>
                </div>
            </>

            <style>{`
                .gantt-row-label:hover { background-color: rgba(0,0,0,0.02); }
            `}</style>
        </div>
    )
}

// ─── Onglet Détail ────────────────────────────────────────────────────────────

function DetailTab({ project, brief }: { project: ProjectDetail; brief: any }) {
    const lbl = { fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }
    const val = { fontSize: 14, color: C.dark, fontWeight: 500 }
    const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }
    const sec = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12, marginTop: 24, paddingBottom: 8, borderBottom: "1px solid " + C.border }

    return (
        <div>
            {/* Timeline */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Suivi de commande
                </div>
                <ProjectTimeline status={project.status} />
            </div>

            {/* Résumé commande */}
            <div style={sec}>Résumé de la commande</div>
            <div style={grid}>
                <div>
                    <div style={lbl}>Produit</div>
                    <div style={val}>{project.product?.label || brief?.product_type || "—"}</div>
                </div>
                <div>
                    <div style={lbl}>Quantité</div>
                    <div style={val}>{brief?.quantity_detected ?? project.quantity ?? "—"} ex.</div>
                </div>
                <div>
                    <div style={lbl}>Dimensions</div>
                    <div style={val}>{brief?.dimensions || "—"}</div>
                </div>
                <div>
                    <div style={lbl}>Délai souhaité</div>
                    <div style={val}>{brief?.delivery_deadline || "Non précisé"}</div>
                </div>
            </div>

            {/* Specs */}
            <div style={sec}>Spécifications</div>
            <div style={grid}>
                <div>
                    <div style={lbl}>Support</div>
                    <div style={val}>{brief?.material || "—"}</div>
                </div>
                <div>
                    <div style={lbl}>Finitions</div>
                    <div style={val}>{brief?.finish || "—"}</div>
                </div>
            </div>

            {/* Extraction brute */}
            {brief?.raw_extraction && (
                <div style={{ marginTop: 16, backgroundColor: C.bg, borderRadius: 10, padding: 14, border: "1px solid " + C.border }}>
                    <div style={lbl}>Extraction brute</div>
                    <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, marginTop: 6 }}>{brief.raw_extraction}</div>
                </div>
            )}

            {/* Tarification */}
            <div style={sec}>Tarification</div>
            <div style={grid}>
                <div>
                    <div style={lbl}>Prix unitaire HT</div>
                    <div style={val}>{project.pricing?.unit_net != null ? formatPrice(project.pricing.unit_net) : "En attente"}</div>
                </div>
                <div>
                    <div style={lbl}>Total HT</div>
                    <div style={{ fontSize: 18, color: C.dark, fontWeight: 700 }}>
                        {project.pricing?.total_net != null ? formatPrice(project.pricing.total_net) : "En attente"}
                    </div>
                </div>
            </div>

            {/* Devis */}
            {project.quote_url && (
                <div style={{ marginTop: 24 }}>
                    {project.quote_number && (
                        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 10 }}>
                            Devis n° <strong>{project.quote_number}</strong>
                        </div>
                    )}
                    <a href={project.quote_url} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.dark, color: C.white, borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                        <FileText size={15} /> Télécharger le devis
                    </a>
                </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                <a href={`/quote-validation?project_id=${project.project_id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: C.dark, textDecoration: "none", fontWeight: 600, padding: "10px 14px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}>
                    <ClipboardList size={14} /> Devis à valider →
                </a>
            </div>
        </div>
    )
}

// ─── Onglet Dates souhaitées ─────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    brief:    { label: "Brief",       color: "#1a3c7a", bg: "#e8f0fe" },
    supplier: { label: "Fournisseur", color: "#1a7a3c", bg: "#e8f8ee" },
    manual:   { label: "Manuel",      color: "#7a8080", bg: "#f0f0ee" },
}

function DatesTab({
    project, desiredDates, setDesiredDates, setPotentialDates,
    dateSources, suggestLoading,
    saveLoading, saveSuccess, saveError, onSave,
    potentialDates, removePotentialDate
}: {
    project: ProjectDetail
    desiredDates: Record<string, string>
    setDesiredDates: React.Dispatch<React.SetStateAction<Record<string, string>>>
    setPotentialDates: React.Dispatch<React.SetStateAction<PotentialDate[]>>
    dateSources: Record<string, "brief" | "supplier" | "manual">
    suggestLoading: boolean
    saveLoading: boolean
    saveSuccess: boolean
    saveError: string | null
    onSave: () => void
    potentialDates: PotentialDate[]
    removePotentialDate: (projectId: string, milestoneKey: string) => void
}) {
    const confirmed = MILESTONES_CONFIG.map(m => ({
        ...m,
        confirmedDate: project[m.key as keyof ProjectDetail] as string | undefined,
    }))

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, flex: 1, marginRight: 12 }}>
                    Dates calculées automatiquement à partir du brief et des fournisseurs. Modifiables manuellement.
                </div>
                {suggestLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted, flexShrink: 0 }}>
                        <Loader size={12} /> Mise à jour...
                    </div>
                )}
            </div>

            {/* Légende sources */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {Object.entries(SOURCE_LABELS).map(([key, s]) => (
                    <span key={key} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, backgroundColor: s.bg, color: s.color }}>
                        {s.label}
                    </span>
                ))}
            </div>

            {confirmed.map(m => {
                const desired = desiredDates[m.key] || ""
                const isConfirmed = !!m.confirmedDate
                const source = dateSources[m.key]
                const sourceCfg = source ? SOURCE_LABELS[source] : null
                // created_at n'est pas modifiable
                if (m.key === "created_at") return null
                return (
                    <div key={m.key} style={{ marginBottom: 14, padding: 14, backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: m.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{m.label}</span>
                            {/* Badge source */}
                            {sourceCfg && !isConfirmed && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, backgroundColor: sourceCfg.bg, color: sourceCfg.color }}>
                                    {sourceCfg.label}
                                </span>
                            )}
                            {isConfirmed && (
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#27ae60", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                    <CheckCircle2 size={11} /> Confirmée
                                </span>
                            )}
                        </div>

                        {/* Date confirmée */}
                        {isConfirmed && (
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                                Confirmée : <strong style={{ color: "#000" }}>{fmtDate(m.confirmedDate)}</strong>
                            </div>
                        )}

                        {/* Champ date souhaitée — verrouillé si confirmée */}
                        {!isConfirmed ? (
                            <div>
                                <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>
                                    Date souhaitée {suggestLoading && <span style={{ color: C.yellow }}>↻</span>}
                                </label>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                        type="date"
                                        value={desired}
                                        onChange={e => {
                                            const newDate = e.target.value
                                            const key = m.key
                                            const pid = project.project_id
                                            // Mise à jour locale
                                            setDesiredDates(prev => ({ ...prev, [key]: newDate }))
                                            // Mise à jour immédiate sur la grille
                                            if (newDate) {
                                                setPotentialDates(prev => {
                                                    const filtered = prev.filter(p => !(p.project_id === pid && p.milestone_key === key))
                                                    return [...filtered, { project_id: pid, milestone_key: key, date: newDate }]
                                                })
                                            } else {
                                                setPotentialDates(prev => prev.filter(p => !(p.project_id === pid && p.milestone_key === key)))
                                            }
                                        }}
                                        style={{
                                            flex: 1, padding: "8px 10px", fontSize: 13, borderRadius: 8,
                                            border: `1.5px solid ${desired ? m.dot : C.border}`,
                                            backgroundColor: desired ? m.color : C.white,
                                            color: "#000", outline: "none", cursor: "pointer",
                                        }}
                                    />
                                    {desired && (
                                        <button
                                            onClick={() => {
                                                setDesiredDates(prev => { const n = { ...prev }; delete n[m.key]; return n })
                                                removePotentialDate(project.project_id, m.key)
                                            }}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex", alignItems: "center" }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
                                Verrouillée — date confirmée par LA FAB
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Bouton sauvegarder */}
            <div style={{ marginTop: 24 }}>
                <button
                    onClick={onSave}
                    disabled={saveLoading}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                        backgroundColor: saveLoading ? C.muted : "#000", color: "#fff",
                        fontWeight: 700, fontSize: 14, cursor: saveLoading ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                    }}
                >
                    {saveLoading
                        ? <><Loader size={15} /> Sauvegarde...</>
                        : <><Save size={15} /> Sauvegarder les dates</>
                    }
                </button>

                {saveSuccess && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", backgroundColor: "#e8f8ee", borderRadius: 8, fontSize: 13, color: "#1a7a3c", fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Dates sauvegardées
                    </div>
                )}
                {saveError && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", backgroundColor: "#fdecea", borderRadius: 8, fontSize: 13, color: "#c0392b", fontWeight: 600 }}>
                        <XCircle size={14} /> {saveError}
                    </div>
                )}
            </div>
        </div>
    )
}
