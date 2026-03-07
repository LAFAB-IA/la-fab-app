"use client"

import React, { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { getToken } from "@/lib/utils"

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

interface Milestone {
    key: string
    label: string
    color: string
    dot: string
    date: Date | null
}

// ─── Constantes couleurs étapes ───────────────────────────────────────────────

const MILESTONES_CONFIG = [
    { key: "created_at",         label: "Création",          color: "#e8f0fe", dot: "#4a7ff5" },
    { key: "validated_at",       label: "Validation",        color: "#e8f8ee", dot: "#27ae60" },
    { key: "production_start",   label: "Début production",  color: "#fff3e0", dot: "#e67e22" },
    { key: "bat_validated_at",   label: "BAT validé",        color: "#f3e5f5", dot: "#8e44ad" },
    { key: "delivery_estimated", label: "Livraison estimée", color: "#fef9e0", dot: "#f4cf15" },
]

// ─── Helpers dates ────────────────────────────────────────────────────────────

function startOfWeek(d: Date) {
    const date = new Date(d)
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
}

function addDays(d: Date, n: number) {
    const date = new Date(d)
    date.setDate(date.getDate() + n)
    return date
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

function formatDay(d: Date) {
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
}

function formatMonth(d: Date) {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

function parseDate(s?: string): Date | null {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export default function Planning() {
    const [projects, setProjects] = useState<ProjectDates[]>([])
    const [loading, setLoading] = useState(true)
    const [weekOffset, setWeekOffset] = useState(0)

    // Semaine de départ = lundi de la semaine courante + offset
    const baseMonday = startOfWeek(new Date())
    const startDate = addDays(baseMonday, weekOffset * 7)

    // 5 semaines = 35 jours
    const WEEKS = 5
    const DAYS = WEEKS * 7
    const days: Date[] = Array.from({ length: DAYS }, (_, i) => addDays(startDate, i))

    // Regroupement par semaine
    const weeks: Date[][] = Array.from({ length: WEEKS }, (_, w) =>
        days.slice(w * 7, w * 7 + 7)
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    useEffect(() => {
        const token = getToken()
        if (!token) { setLoading(false); return }
        const accountId = localStorage.getItem("account_id") || ""

        fetch(`${API_URL}/api/project?account_id=${accountId}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.projects) {
                    const mapped: ProjectDates[] = data.projects.map((p: any) => ({
                        project_id:          p.project_id,
                        label:               p.product?.label || p.brief_analysis?.product_type || "Projet",
                        status:              p.status,
                        created_at:          p.created_at,
                        validated_at:        p.validated_at,
                        production_start:    p.production_start,
                        bat_validated_at:    p.bat_validated_at,
                        delivery_estimated:  p.delivery_estimated,
                        delivery_deadline:   p.brief_analysis?.delivery_deadline,
                    }))
                    setProjects(mapped)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    function getMilestones(p: ProjectDates): Milestone[] {
        return MILESTONES_CONFIG.map(m => ({
            ...m,
            date: parseDate(p[m.key as keyof ProjectDates] as string),
        }))
    }

    const DAY_W = 40 // largeur colonne jour en px
    const ROW_H = 52 // hauteur ligne projet
    const LABEL_W = 200 // largeur colonne label

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
                        {formatMonth(startDate)} — {formatMonth(days[DAYS - 1])}
                    </p>
                </div>

                {/* Navigation semaines */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                        onClick={() => setWeekOffset(w => w - 1)}
                        style={{ padding: "7px 10px", backgroundColor: C.white, border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => setWeekOffset(0)}
                        style={{ padding: "7px 14px", backgroundColor: weekOffset === 0 ? "#000" : C.white, color: weekOffset === 0 ? C.white : "#000", border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                        Aujourd'hui
                    </button>
                    <button
                        onClick={() => setWeekOffset(w => w + 1)}
                        style={{ padding: "7px 10px", backgroundColor: C.white, border: "1px solid " + C.border, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ── Légende ── */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                {MILESTONES_CONFIG.map(m => (
                    <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: m.dot, flexShrink: 0 }} />
                        {m.label}
                    </div>
                ))}
            </div>

            {/* ── Grille Gantt ── */}
            <div style={{ backgroundColor: C.white, borderRadius: 16, border: "1px solid " + C.border, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ minWidth: LABEL_W + DAYS * DAY_W }}>

                    {/* ── Header semaines ── */}
                    <div style={{ display: "flex", borderBottom: "1px solid " + C.border }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, borderRight: "1px solid " + C.border }}>
                            Projet
                        </div>
                        {weeks.map((week, wi) => {
                            const hasToday = week.some(d => isSameDay(d, today))
                            return (
                                <div key={wi} style={{ width: 7 * DAY_W, minWidth: 7 * DAY_W, textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: hasToday ? 700 : 600, color: hasToday ? "#000" : C.muted, borderRight: wi < WEEKS - 1 ? "1px solid " + C.border : "none", backgroundColor: hasToday ? "rgba(244,207,21,0.06)" : "transparent" }}>
                                    Sem. {week[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – {week[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Header jours ── */}
                    <div style={{ display: "flex", borderBottom: "2px solid " + C.border }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, borderRight: "1px solid " + C.border }} />
                        {days.map((d, i) => {
                            const isToday = isSameDay(d, today)
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                            return (
                                <div key={i} style={{
                                    width: DAY_W, minWidth: DAY_W, textAlign: "center",
                                    padding: "6px 0", fontSize: 10, fontWeight: isToday ? 800 : 500,
                                    color: isToday ? "#000" : isWeekend ? "#bbb" : C.muted,
                                    backgroundColor: isToday ? "rgba(244,207,21,0.15)" : isWeekend ? "#fafafa" : "transparent",
                                    borderRight: (i + 1) % 7 === 0 && i < DAYS - 1 ? "1px solid " + C.border : "1px solid #f0f0f0",
                                }}>
                                    {d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                                    <br />
                                    <strong>{d.getDate()}</strong>
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Lignes projets ── */}
                    {projects.length === 0 ? (
                        <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 14 }}>
                            Aucun projet à afficher
                        </div>
                    ) : (
                        projects.map((project, pi) => {
                            const milestones = getMilestones(project)
                            return (
                                <div key={project.project_id} style={{
                                    display: "flex",
                                    borderBottom: pi < projects.length - 1 ? "1px solid " + C.border : "none",
                                    minHeight: ROW_H,
                                }}>
                                    {/* Label projet */}
                                    <div style={{
                                        width: LABEL_W, minWidth: LABEL_W,
                                        padding: "10px 16px",
                                        borderRight: "1px solid " + C.border,
                                        display: "flex", flexDirection: "column", justifyContent: "center",
                                    }}>
                                        <a href={`/dashboard?project_id=${project.project_id}`} style={{ fontSize: 13, fontWeight: 600, color: "#000", textDecoration: "none", lineHeight: 1.3 }}>
                                            {project.label}
                                        </a>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{project.project_id}</div>
                                    </div>

                                    {/* Cellules jours */}
                                    <div style={{ flex: 1, position: "relative", display: "flex" }}>
                                        {days.map((d, di) => {
                                            const isToday = isSameDay(d, today)
                                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                                            const milestonesOnDay = milestones.filter(m => m.date && isSameDay(m.date, d))

                                            return (
                                                <div key={di} style={{
                                                    width: DAY_W, minWidth: DAY_W,
                                                    position: "relative",
                                                    backgroundColor: isToday ? "rgba(244,207,21,0.08)" : isWeekend ? "#fafafa" : "transparent",
                                                    borderRight: (di + 1) % 7 === 0 && di < DAYS - 1 ? "1px solid " + C.border : "1px solid #f5f5f5",
                                                    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3,
                                                }}>
                                                    {milestonesOnDay.map((m, mi) => (
                                                        <div key={mi} title={m.label} style={{
                                                            width: 28, height: 28,
                                                            borderRadius: "50%",
                                                            backgroundColor: m.color,
                                                            border: "2px solid " + m.dot,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            cursor: "default",
                                                            flexShrink: 0,
                                                        }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.dot }} />
                                                        </div>
                                                    ))}
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

            {/* ── Note bas de page ── */}
            <p style={{ marginTop: 16, fontSize: 12, color: C.muted, textAlign: "center" }}>
                Cliquez sur un projet pour accéder au détail • Utilisez les flèches pour naviguer entre les semaines
            </p>
        </div>
    )
}
