"use client"

import React from "react"
import { C } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import {
    FilePlus, Upload, Sparkles, FileText, CheckCircle2,
    CreditCard, Factory, Flag, Truck, PartyPopper,
    ClipboardList, Cog, PackageCheck, Clock,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimelineEntry {
    type: string
    label: string
    date?: string | null
    status: "done" | "current" | "pending"
    meta?: Record<string, unknown>   // supplier_name intentionally NEVER displayed
}

// ─── Icon mapping (client-facing labels only) ────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
    project_created:   FilePlus,
    brief_uploaded:    Upload,
    brief_analyzed:    Sparkles,
    quote_generated:   FileText,
    quote_validated:   CheckCircle2,
    payment_deposit:   CreditCard,
    in_production:     Factory,
    milestone_reached: Flag,
    delivered:         Truck,
    payment_balance:   CreditCard,
    completed:         PartyPopper,
}

function getIcon(type: string): React.ElementType {
    return TYPE_ICON[type] ?? ClipboardList
}

// ─── Date formatter — "12 mai 2026" ─────────────────────────────────────────

function fmtShort(dateStr: string): string {
    try { return formatDate(dateStr) } catch { return "" }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[0, 1, 2].map(i => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 28 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.bg, animation: "tl-pulse 1.5s ease-in-out infinite" }} />
                        {i < 2 && <div style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: C.bg, marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 6 }}>
                        <div style={{ height: 13, width: "55%", backgroundColor: C.bg, borderRadius: 6, marginBottom: 6, animation: "tl-pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ height: 11, width: "30%", backgroundColor: C.bg, borderRadius: 6, animation: "tl-pulse 1.5s ease-in-out infinite" }} />
                    </div>
                </div>
            ))}
            <style>{`@keyframes tl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
    )
}

// ─── Static fallback (horizontal, existing behaviour) ────────────────────────

const STATIC_STEPS = [
    { key: "created",       label: "Brief reçu",       icon: <ClipboardList size={16} /> },
    { key: "quoted",        label: "Devis envoyé",      icon: <FileText size={16} /> },
    { key: "validated",     label: "Commande validée",  icon: <CheckCircle2 size={16} /> },
    { key: "in_production", label: "En production",     icon: <Cog size={16} /> },
    { key: "delivered",     label: "Livré",             icon: <PackageCheck size={16} /> },
]
const STATIC_ORDER = STATIC_STEPS.map(s => s.key)

function StaticTimeline({ currentStatus, deliveryEstimate }: { currentStatus: string; deliveryEstimate?: string }) {
    const currentIdx = STATIC_ORDER.indexOf(currentStatus)
    function state(idx: number) {
        if (idx < currentIdx) return "done"
        if (idx === currentIdx) return "active"
        return "pending"
    }
    return (
        <div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
                {STATIC_STEPS.map((step, idx) => {
                    const s = state(idx)
                    const isLast = idx === STATIC_STEPS.length - 1
                    const nextDone = !isLast && state(idx + 1) !== "pending"
                    return (
                        <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {!isLast && (
                                <div style={{ position: "absolute", top: 20, left: "50%", width: "100%", height: 2, backgroundColor: nextDone ? "var(--status-success-bd)" : C.border, zIndex: 0 }} />
                            )}
                            <div style={{
                                width: 40, height: 40, borderRadius: "50%", position: "relative", zIndex: 1, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                backgroundColor: s === "done" ? "var(--status-success-bg)" : s === "active" ? C.yellow : C.white,
                                border: `2px solid ${s === "done" ? "var(--status-success-bd)" : s === "active" ? C.yellow : C.border}`,
                                boxShadow: s === "active" ? "0 0 0 4px rgba(244,207,21,0.2)" : "none",
                            }}>
                                {s === "done"
                                    ? <CheckCircle2 size={16} color="var(--status-success-fg)" />
                                    : <span style={{ color: s === "pending" ? C.muted : C.dark, display: "flex" }}>{step.icon}</span>
                                }
                            </div>
                            <div style={{ marginTop: 8, textAlign: "center", padding: "0 4px" }}>
                                <div style={{ fontSize: 12, fontWeight: s === "active" ? 700 : 500, color: s === "pending" ? C.muted : C.dark, lineHeight: 1.3 }}>
                                    {step.label}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {deliveryEstimate && currentStatus !== "delivered" && (
                <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <Clock size={13} /> Livraison estimée : {deliveryEstimate}
                </div>
            )}
        </div>
    )
}

// ─── API-driven vertical timeline ────────────────────────────────────────────

function ApiTimeline({ entries }: { entries: TimelineEntry[] }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {entries.map((entry, idx) => {
                const Icon = getIcon(entry.type)
                const isDone = entry.status === "done"
                const isCurrent = entry.status === "current"
                const isPending = entry.status === "pending"
                const isLast = idx === entries.length - 1

                const dotBg = isDone
                    ? "var(--status-success-bg)"
                    : isCurrent ? C.yellow
                    : C.bg

                const dotBorder = isDone
                    ? "var(--status-success-bd)"
                    : isCurrent ? C.yellow
                    : C.border

                const iconColor = isDone
                    ? "var(--status-success-fg)"
                    : isCurrent ? C.dark
                    : C.muted

                const lineBg = isDone ? "var(--status-success-bd)" : C.border

                return (
                    <div key={idx} style={{ display: "flex", gap: 16, alignItems: "flex-start", opacity: isPending ? 0.5 : 1 }}>
                        {/* Dot + line */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: "50%",
                                backgroundColor: dotBg,
                                border: `2px solid ${dotBorder}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                                animation: isCurrent ? "tl-ring 2s ease-out infinite" : "none",
                            }}>
                                {isDone
                                    ? <CheckCircle2 size={16} color="var(--status-success-fg)" />
                                    : <Icon size={16} color={iconColor} />
                                }
                            </div>
                            {!isLast && (
                                <div style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: lineBg, marginTop: 2, marginBottom: 2 }} />
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: isCurrent ? 700 : 500, color: isPending ? C.muted : C.dark, lineHeight: 1.4 }}>
                                {entry.label}
                            </div>
                            {entry.date && !isPending && (
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Clock size={11} />
                                    {fmtShort(entry.date)}
                                </div>
                            )}
                            {isCurrent && (
                                <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, backgroundColor: "rgba(244,207,21,0.15)", border: "1px solid rgba(244,207,21,0.4)", fontSize: 11, fontWeight: 600, color: C.dark }}>
                                    En cours
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}

            <style>{`
                @keyframes tl-ring {
                    0%   { box-shadow: 0 0 0 0   rgba(244,207,21,0.5); }
                    70%  { box-shadow: 0 0 0 8px rgba(244,207,21,0);   }
                    100% { box-shadow: 0 0 0 0   rgba(244,207,21,0);   }
                }
            `}</style>
        </div>
    )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface ProjectTimelineProps {
    timeline?: TimelineEntry[] | null
    loading?: boolean
    currentStatus?: string
    deliveryEstimate?: string
}

export default function ProjectTimeline({
    timeline,
    loading = false,
    currentStatus = "created",
    deliveryEstimate,
}: ProjectTimelineProps) {

    if (loading) return <TimelineSkeleton />

    // API data available
    if (timeline && timeline.length > 0) {
        // Strip any supplier info from meta before rendering
        const safe = timeline.map(e => ({ ...e, meta: undefined }))
        return <ApiTimeline entries={safe} />
    }

    // API returned empty → informative empty state if project not yet started
    if (timeline && timeline.length === 0) {
        return (
            <div style={{
                padding: "20px 24px", borderRadius: 12,
                border: "1px solid " + C.border,
                backgroundColor: C.surface,
                display: "flex", alignItems: "center", gap: 12,
                fontSize: 13, color: C.muted,
            }}>
                <Clock size={16} color={C.muted} />
                Le suivi démarrera dès validation du devis.
            </div>
        )
    }

    // No API data yet → static horizontal fallback
    return <StaticTimeline currentStatus={currentStatus} deliveryEstimate={deliveryEstimate} />
}
