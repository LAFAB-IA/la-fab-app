"use client"

import React from "react"
import { C } from "@/lib/constants"
import { formatPrice, formatDate } from "@/lib/format"
import {
    Package, Factory, Calendar, Clock, Layers,
    CheckCircle2, ChevronRight, AlertCircle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Milestone {
    title: string
    milestone_date?: string | null
    status: "done" | "current" | "pending"
}

export interface PlanLot {
    lot_id: string
    label: string
    service: string
    qty: number
    status: string
    estimated_total_ht: number
    estimated_lead_time_days: number
    milestones: Milestone[]
    // supplier_name / supplier_id intentionally absent — NEVER rendered
}

export interface ProductionPlanData {
    lots: PlanLot[]
    is_amalgame: boolean
    estimated_total_ht: number
    estimated_lead_time_days: number
}

// ─── Service badge palette ────────────────────────────────────────────────────

const SERVICE_PALETTE: Record<string, { bg: string; color: string; border: string }> = {
    impression:  { bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    menuiserie:  { bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    packaging:   { bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    broderie:    { bg: "#fce8ff", color: "#7a1a7a", border: "#d8a8db" },
    sérigraphie: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    gravure:     { bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    découpe:     { bg: "#fde8e8", color: "#c0392b", border: "#f5c6c6" },
    finition:    { bg: "#f0f0fe", color: "#3c1a7a", border: "#b8a8db" },
}

function serviceBadge(service: string) {
    const key = service.toLowerCase()
    const p = SERVICE_PALETTE[key] ?? { bg: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)", border: "var(--status-neutral-bd)" }
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}`,
            textTransform: "capitalize" as const,
        }}>
            <Factory size={11} />
            {service}
        </span>
    )
}

// ─── Lot status badge ─────────────────────────────────────────────────────────

const LOT_STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending:      { label: "En attente",  bg: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)", border: "var(--status-neutral-bd)" },
    waiting:      { label: "En attente",  bg: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)", border: "var(--status-neutral-bd)" },
    in_progress:  { label: "En cours",    bg: "var(--status-warn-bg)",    color: "var(--status-warn-fg)",    border: "var(--status-warn-bd)" },
    in_production:{ label: "En cours",    bg: "var(--status-warn-bg)",    color: "var(--status-warn-fg)",    border: "var(--status-warn-bd)" },
    done:         { label: "Terminé",     bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
    completed:    { label: "Terminé",     bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
    delivered:    { label: "Livré",       bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
}

function lotStatusBadge(status: string) {
    const s = LOT_STATUS_MAP[status] ?? LOT_STATUS_MAP.pending
    return (
        <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
        }}>
            {s.label}
        </span>
    )
}

// ─── Milestone row ────────────────────────────────────────────────────────────

function MilestoneRow({ m, isLast }: { m: Milestone; isLast: boolean }) {
    const isDone    = m.status === "done"
    const isCurrent = m.status === "current"
    const isPending = m.status === "pending"

    const dotColor = isDone    ? "var(--status-success-fg)"
                   : isCurrent ? C.yellow
                   : C.border

    const dotBg = isDone    ? "var(--status-success-bg)"
                : isCurrent ? "rgba(244,207,21,0.15)"
                : C.bg

    return (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", opacity: isPending ? 0.5 : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 1 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    backgroundColor: dotBg, border: `2px solid ${dotColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    {isDone && <CheckCircle2 size={11} color="var(--status-success-fg)" />}
                    {isCurrent && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.yellow }} />}
                </div>
                {!isLast && <div style={{ width: 1, flex: 1, minHeight: 8, backgroundColor: isDone ? "var(--status-success-bd)" : C.border, marginTop: 2 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: isPending ? C.muted : C.dark, lineHeight: 1.4 }}>
                    {m.title}
                </div>
                {m.milestone_date && !isPending && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={10} /> {formatDate(m.milestone_date)}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Lot card ─────────────────────────────────────────────────────────────────

function LotCard({ lot }: { lot: PlanLot }) {
    const [open, setOpen] = React.useState(false)
    const hasMilestones = lot.milestones && lot.milestones.length > 0

    return (
        <div style={{
            backgroundColor: C.white, borderRadius: 12,
            border: "1px solid " + C.border,
            boxShadow: "0 1px 3px rgba(58,64,64,0.07)",
            overflow: "hidden",
        }}>
            {/* Card header */}
            <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <Package size={14} color={C.muted} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{lot.label}</span>
                            {lotStatusBadge(lot.status)}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            {serviceBadge(lot.service)}
                            <span style={{ fontSize: 12, color: C.muted }}>Qté : <strong style={{ color: C.dark }}>{lot.qty}</strong></span>
                        </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>
                            {formatPrice(lot.estimated_total_ht)}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                            <Clock size={10} /> {lot.estimated_lead_time_days} j
                        </div>
                    </div>
                </div>
            </div>

            {/* Milestones toggle */}
            {hasMilestones && (
                <>
                    <button
                        onClick={() => setOpen(!open)}
                        style={{
                            width: "100%", padding: "8px 18px",
                            borderTop: "1px solid " + C.bg,
                            backgroundColor: "transparent", border: "none",
                            borderTopColor: C.bg, borderTopStyle: "solid", borderTopWidth: 1,
                            display: "flex", alignItems: "center", gap: 6,
                            fontSize: 12, fontWeight: 500, color: C.muted,
                            cursor: "pointer", textAlign: "left" as const,
                        }}
                    >
                        <ChevronRight size={13} style={{ transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }} />
                        {lot.milestones.length} jalon{lot.milestones.length > 1 ? "s" : ""}
                    </button>

                    {open && (
                        <div style={{ padding: "12px 18px 16px", borderTop: "1px solid " + C.bg, backgroundColor: "#fafaf8" }}>
                            {lot.milestones.map((m, i) => (
                                <MilestoneRow key={i} m={m} isLast={i === lot.milestones.length - 1} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Summary bar skeleton */}
            <div style={{ height: 72, borderRadius: 12, backgroundColor: C.bg, animation: "pp-pulse 1.5s ease-in-out infinite" }} />
            {/* Lot card skeletons */}
            {[0, 1].map(i => (
                <div key={i} style={{ height: 88, borderRadius: 12, backgroundColor: C.bg, animation: "pp-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
            ))}
            <style>{`@keyframes pp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
    )
}

// ─── Empty / not-ready state ──────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div style={{
            padding: "20px 24px", borderRadius: 12,
            border: "1px solid " + C.border,
            backgroundColor: C.surface,
            display: "flex", alignItems: "center", gap: 12,
            fontSize: 13, color: C.muted,
        }}>
            <AlertCircle size={16} color={C.muted} />
            {message}
        </div>
    )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface ProductionPlanProps {
    plan?: ProductionPlanData | null
    loading?: boolean
    projectStatus?: string
}

// Statuses where the plan should be shown
const PLAN_VISIBLE_STATUSES = new Set(["in_production", "delivered", "completed", "archived"])

export default function ProductionPlan({ plan, loading = false, projectStatus }: ProductionPlanProps) {

    // Not yet at the right stage — show informative empty state
    if (!loading && !plan && projectStatus && !PLAN_VISIBLE_STATUSES.has(projectStatus)) {
        return <EmptyState message="Le plan de production sera disponible après validation du devis." />
    }

    if (loading) return <PlanSkeleton />

    if (!plan || plan.lots.length === 0) {
        return <EmptyState message="Le plan de production sera disponible après validation du devis." />
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Summary header ── */}
            <div style={{
                backgroundColor: C.white, borderRadius: 12,
                border: "1px solid " + C.border,
                boxShadow: "0 1px 3px rgba(58,64,64,0.07)",
                padding: "16px 20px",
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 20,
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                            Estimation globale
                        </span>
                        {plan.is_amalgame && (
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                backgroundColor: "var(--status-info-bg)", color: "var(--status-info-fg)",
                                border: "1px solid var(--status-info-bd)",
                            }}>
                                <Layers size={11} /> Commande groupée
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                        {plan.lots.length} lot{plan.lots.length > 1 ? "s" : ""}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Total HT estimé</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>
                            {formatPrice(plan.estimated_total_ht)}
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            <Clock size={11} /> Délai estimé
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>
                            {plan.estimated_lead_time_days} <span style={{ fontSize: 13, fontWeight: 500 }}>jours</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Lot cards ── */}
            {plan.lots.map(lot => (
                <LotCard key={lot.lot_id} lot={lot} />
            ))}

        </div>
    )
}
