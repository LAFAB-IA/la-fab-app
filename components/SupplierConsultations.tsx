"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import { formatPrice, formatDate } from "@/lib/format"
import { StatsCards, StatItem } from "@/components/admin/StatsCards"
import {
    Send, Loader2, CheckCircle2, Clock, FileText, Inbox,
    SearchX, ChevronDown, Upload, X, MessageSquare,
    TrendingUp, Star,
} from "lucide-react"
import useListView from "@/hooks/useListView"
import ListToolbar from "@/components/ListToolbar"

const { useState, useEffect, useMemo, useRef, useCallback } = React

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplierProfile {
    id: string
    name: string
    partner_tier?: string
}

interface Consultation {
    consultation_id?: string
    id?: string
    status: string
    service?: string
    sent_at?: string
    created_at: string
    specifications?: string
    brief_description?: string
    proposed_price?: number | null
    lead_time_days?: number | null
    responded_at?: string
    project_id?: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    sent:      { label: "En attente",   bg: "var(--status-warn-bg)",    color: "var(--status-warn-fg)",    border: "var(--status-warn-bd)" },
    pending:   { label: "En attente",   bg: "var(--status-warn-bg)",    color: "var(--status-warn-fg)",    border: "var(--status-warn-bd)" },
    accepted:  { label: "Acceptée",     bg: "var(--status-info-bg)",    color: "var(--status-info-fg)",    border: "var(--status-info-bd)" },
    quoted:    { label: "Devis envoyé", bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
    replied:   { label: "Répondue",     bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
    responded: { label: "Répondue",     bg: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "var(--status-success-bd)" },
    validated: { label: "Validée",      bg: "var(--status-info-bg)",    color: "var(--status-info-fg)",    border: "var(--status-info-bd)" },
    refused:   { label: "Refusée",      bg: "var(--status-danger-bg)",  color: "var(--status-danger-fg)",  border: "var(--status-danger-bd)" },
    rejected:  { label: "Refusée",      bg: "var(--status-danger-bg)",  color: "var(--status-danger-fg)",  border: "var(--status-danger-bd)" },
    declined:  { label: "Refusée",      bg: "var(--status-danger-bg)",  color: "var(--status-danger-fg)",  border: "var(--status-danger-bd)" },
}
const STATUS_ORDER = ["sent", "pending", "accepted", "quoted", "replied", "responded", "validated", "refused", "rejected", "declined"]

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    gold:     { label: "Gold",     bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    silver:   { label: "Silver",   bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
    bronze:   { label: "Bronze",   bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    premium:  { label: "Premium",  bg: "#fce8ff", color: "#7a1a7a", border: "#d8a8db" },
    standard: { label: "Standard", bg: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)", border: "var(--status-neutral-bd)" },
}

function TierBadge({ tier }: { tier?: string }) {
    if (!tier) return null
    const t = TIER_CFG[tier.toLowerCase()] ?? TIER_CFG.standard
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}`,
            textTransform: "capitalize" as const,
        }}>
            <Star size={10} />
            {t.label}
        </span>
    )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] ?? { label: status, bg: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)", border: "var(--status-neutral-bd)" }
    const isRefused = ["refused", "rejected", "declined"].includes(status)
    const isDone    = ["quoted", "replied", "responded", "validated", "accepted"].includes(status)
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
            {!isRefused && isDone  ? <CheckCircle2 size={12} /> : null}
            {!isRefused && !isDone ? <Clock size={12} /> : null}
            {cfg.label}
        </span>
    )
}

// ─── Quote upload modal ───────────────────────────────────────────────────────

interface QuoteModalProps {
    consultationId: string
    onClose: () => void
    onSuccess: (id: string) => void
}

function QuoteModal({ consultationId, onClose, onSuccess }: QuoteModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [price, setPrice] = useState("")
    const [days, setDays] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const fileRef = useRef<HTMLInputElement>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) { setError("Le fichier PDF est obligatoire"); return }
        setSubmitting(true)
        setError("")
        try {
            const fd = new FormData()
            fd.append("file", file)
            if (price) fd.append("proposed_price", price)
            if (days)  fd.append("lead_time_days", days)

            const r = await fetchWithAuth(`${API_URL}/api/consultation/${consultationId}/quote-upload`, {
                method: "POST",
                body: fd,
            })
            const data = await r.json()
            if (data.ok) {
                onSuccess(consultationId)
            } else {
                setError(data.error || "Erreur lors de l'envoi")
            }
        } catch {
            setError("Erreur réseau")
        }
        setSubmitting(false)
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 2000,
                backgroundColor: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{
                backgroundColor: C.white, borderRadius: 16, width: "100%", maxWidth: 480,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    padding: "18px 24px", borderBottom: "1px solid " + C.border,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Upload size={16} color={C.muted} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Envoyer un devis</span>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    {/* File drop zone */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                            Fichier PDF *
                        </label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${file ? C.yellow : C.border}`,
                                borderRadius: 10, padding: "20px 16px", textAlign: "center" as const,
                                cursor: "pointer",
                                backgroundColor: file ? "rgba(244,207,21,0.06)" : C.surface,
                                transition: "border-color 0.15s",
                            }}
                        >
                            <Upload size={20} color={file ? C.dark : C.muted} style={{ marginBottom: 6 }} />
                            <div style={{ fontSize: 13, color: file ? C.dark : C.muted, fontWeight: file ? 600 : 400 }}>
                                {file ? file.name : "Cliquer pour sélectionner un PDF"}
                            </div>
                            {file && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB</div>}
                        </div>
                        <input
                            ref={fileRef} type="file" accept=".pdf,application/pdf"
                            style={{ display: "none" }}
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    {/* Price + days */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                                Prix HT (€)
                            </label>
                            <input
                                type="number" min={0} step={0.01} value={price}
                                onChange={e => setPrice(e.target.value)} placeholder="0.00"
                                style={{ width: "100%", padding: "9px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, color: C.dark, outline: "none", boxSizing: "border-box" as const }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                                Délai (jours)
                            </label>
                            <input
                                type="number" min={1} value={days}
                                onChange={e => setDays(e.target.value)} placeholder="15"
                                style={{ width: "100%", padding: "9px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, color: C.dark, outline: "none", boxSizing: "border-box" as const }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, backgroundColor: "var(--status-danger-bg)", color: "var(--status-danger-fg)", border: "1px solid var(--status-danger-bd)" }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" onClick={onClose}
                            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={submitting}
                            style={{ padding: "9px 20px", borderRadius: 8, border: "none", backgroundColor: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {submitting ? <Loader2 size={14} style={{ animation: "sc-spin 1s linear infinite" }} /> : <Send size={14} />}
                            Envoyer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SupplierConsultations() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [consultations, setConsultations] = useState<Consultation[]>([])
    const [supplier, setSupplier] = useState<SupplierProfile | null>(null)

    const [responding, setResponding] = useState<Record<string, boolean>>({})
    const [quoteModal, setQuoteModal] = useState<string | null>(null)
    const [actionMsgs, setActionMsgs] = useState<Record<string, { type: "ok" | "err"; text: string }>>({})

    const lv = useListView(consultations, {
        storageKey: "consultations_view_mode",
        defaultViewMode: "list",
        searchFields: (c) => [c.project_id, c.specifications, c.brief_description, c.service],
        statusOptions: STATUS_ORDER.map((s, i) => ({ value: s, label: STATUS_CFG[s]?.label || s, order: i })),
        getItemStatus: (c) => c.status || "pending",
        getItemDate: (c) => c.sent_at || c.created_at,
        sortOptions: [
            { key: "date", label: "Date" },
            { key: "status", label: "Statut" },
        ],
        getSortValue: (c, key) => {
            if (key === "date") return new Date(c.sent_at || c.created_at).getTime()
            if (key === "status") { const i = STATUS_ORDER.indexOf(c.status); return i === -1 ? 99 : i }
            return 0
        },
        defaultSortKey: "date",
        defaultSortDir: "desc",
    })

    // Derived stats
    const stats = useMemo(() => {
        const pending  = consultations.filter(c => ["sent", "pending"].includes(c.status)).length
        const quoted   = consultations.filter(c => ["quoted", "replied", "responded"].includes(c.status)).length
        const accepted = consultations.filter(c => ["validated", "accepted"].includes(c.status)).length
        const total    = consultations.length
        const responseRate = total ? Math.round(((quoted + accepted) / total) * 100) : 0
        return { total, pending, quoted, accepted, responseRate }
    }, [consultations])

    const statItems: StatItem[] = [
        { icon: MessageSquare, label: "Total",          value: String(stats.total) },
        { icon: Clock,         label: "En attente",     value: String(stats.pending) },
        { icon: FileText,      label: "Devis envoyés",  value: String(stats.quoted) },
        { icon: TrendingUp,    label: "Taux de réponse", value: `${stats.responseRate} %` },
    ]

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifié"); setLoading(false); return }
        Promise.all([
            fetchWithAuth(`${API_URL}/api/supplier/me`).then(r => r.json()).catch(() => null),
            fetchWithAuth(`${API_URL}/api/supplier-portal/consultations`).then(r => r.json()),
        ]).then(([meData, consultData]) => {
            if (meData?.ok && meData.supplier) setSupplier(meData.supplier)
            if (consultData.ok) {
                setConsultations(consultData.consultations || [])
            } else if (!["SUPPLIER_NOT_FOUND"].includes(consultData.code)) {
                setError(consultData.error || "Erreur serveur")
            }
        }).catch(() => setError("Erreur réseau"))
        .finally(() => setLoading(false))
    }, [isAuthenticated, authLoading])

    async function handleRespond(consultationId: string, action: "accept" | "refuse") {
        setResponding(p => ({ ...p, [consultationId]: true }))
        try {
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${consultationId}/respond`, {
                method: "POST",
                body: JSON.stringify({ action }),
            })
            const data = await r.json()
            if (data.ok) {
                const newStatus = action === "accept" ? "accepted" : "refused"
                setConsultations(prev => prev.map(c =>
                    (c.consultation_id || c.id) === consultationId ? { ...c, status: newStatus } : c
                ))
                setActionMsgs(p => ({
                    ...p,
                    [consultationId]: { type: "ok", text: action === "accept" ? "Consultation acceptée" : "Consultation refusée" },
                }))
            } else {
                setActionMsgs(p => ({ ...p, [consultationId]: { type: "err", text: data.error || "Erreur" } }))
            }
        } catch {
            setActionMsgs(p => ({ ...p, [consultationId]: { type: "err", text: "Erreur réseau" } }))
        }
        setResponding(p => ({ ...p, [consultationId]: false }))
    }

    function handleQuoteSuccess(consultationId: string) {
        setConsultations(prev => prev.map(c =>
            (c.consultation_id || c.id) === consultationId ? { ...c, status: "quoted" } : c
        ))
        setQuoteModal(null)
        setActionMsgs(p => ({ ...p, [consultationId]: { type: "ok", text: "Devis envoyé avec succès" } }))
    }

    const renderCard = useCallback((c: Consultation) => {
        const cId       = c.consultation_id || c.id
        const isPending = ["sent", "pending"].includes(c.status)
        const isAccepted = c.status === "accepted"
        const isQuoted  = ["quoted", "replied", "responded", "validated"].includes(c.status)
        const isResponding = responding[cId!]
        const msg       = actionMsgs[cId!]

        return (
            <div key={cId} style={{
                backgroundColor: C.white, borderRadius: 12,
                border: "1px solid " + C.border,
                boxShadow: "0 1px 3px rgba(58,64,64,0.06)",
                overflow: "hidden",
            }}>
                {/* Card header */}
                <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                <FileText size={15} color={C.muted} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                                    Consultation #{(cId || "").slice(-8)}
                                </span>
                                {c.service && (
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, backgroundColor: C.surface, color: C.muted, border: "1px solid " + C.border, fontWeight: 500 }}>
                                        {c.service}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                                Reçue le {formatDate(c.sent_at || c.created_at)}
                            </div>
                        </div>
                        <StatusBadge status={c.status} />
                    </div>

                    {/* Specs / brief */}
                    {(c.specifications || c.brief_description) && (
                        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, backgroundColor: C.surface, border: "1px solid " + C.border }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                                {c.specifications ? "Spécifications" : "Description"}
                            </div>
                            <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.55 }}>
                                {c.specifications || c.brief_description}
                            </div>
                        </div>
                    )}

                    {/* Quote summary (quoted/validated) */}
                    {isQuoted && (c.proposed_price != null || c.lead_time_days || c.responded_at) && (
                        <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
                            {c.proposed_price != null && (
                                <div>
                                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>Prix proposé HT</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{formatPrice(Number(c.proposed_price))}</div>
                                </div>
                            )}
                            {c.lead_time_days && (
                                <div>
                                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>Délai</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{c.lead_time_days} j</div>
                                </div>
                            )}
                            {c.responded_at && (
                                <div>
                                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>Répondu le</div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{formatDate(c.responded_at)}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action zone — pending or accepted */}
                {(isPending || isAccepted) && (
                    <div style={{
                        padding: "12px 20px", borderTop: "1px solid " + C.bg,
                        backgroundColor: C.surface,
                        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                    }}>
                        {isPending && (
                            <>
                                <button
                                    onClick={() => setQuoteModal(cId!)}
                                    disabled={isResponding}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                >
                                    <Upload size={14} /> Envoyer un devis
                                </button>
                                <button
                                    onClick={() => handleRespond(cId!, "refuse")}
                                    disabled={isResponding}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--status-danger-bd)", backgroundColor: "var(--status-danger-bg)", color: "var(--status-danger-fg)", fontSize: 13, fontWeight: 600, cursor: isResponding ? "not-allowed" : "pointer", opacity: isResponding ? 0.6 : 1 }}
                                >
                                    {isResponding ? <Loader2 size={13} style={{ animation: "sc-spin 1s linear infinite" }} /> : null}
                                    Décliner
                                </button>
                            </>
                        )}
                        {isAccepted && (
                            <button
                                onClick={() => setQuoteModal(cId!)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                            >
                                <Upload size={14} /> Uploader le devis PDF
                            </button>
                        )}
                        {msg && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: msg.type === "ok" ? "var(--status-success-fg)" : "var(--status-danger-fg)", display: "flex", alignItems: "center", gap: 4 }}>
                                {msg.type === "ok" ? <CheckCircle2 size={13} /> : null}
                                {msg.text}
                            </div>
                        )}
                    </div>
                )}

                {/* Inline feedback for quoted/refused states */}
                {!isPending && !isAccepted && msg && (
                    <div style={{ padding: "10px 20px", borderTop: "1px solid " + C.bg, fontSize: 12, fontWeight: 500, color: msg.type === "ok" ? "var(--status-success-fg)" : "var(--status-danger-fg)", display: "flex", alignItems: "center", gap: 4 }}>
                        {msg.type === "ok" ? <CheckCircle2 size={13} /> : null}
                        {msg.text}
                    </div>
                )}
            </div>
        )
    }, [responding, actionMsgs, handleRespond, setQuoteModal])

    if (loading || authLoading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <Loader2 size={24} color={C.muted} style={{ animation: "sc-spin 1s linear infinite" }} />
            <style>{`@keyframes sc-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
    if (error) return (
        <div style={{ padding: 40, color: "var(--status-danger-fg)", fontFamily: "Inter, sans-serif" }}>{error}</div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 900, margin: "0 auto" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Consultations</h1>
                    {supplier && <TierBadge tier={supplier.partner_tier} />}
                </div>
                {supplier && (
                    <div style={{ fontSize: 14, color: C.muted }}>{supplier.name}</div>
                )}
            </div>

            {/* ── Stats cards ── */}
            <StatsCards items={statItems} loading={false} />

            {/* ── Toolbar ── */}
            <ListToolbar
                search={lv.search}
                onSearchChange={lv.setSearch}
                placeholder="Rechercher une consultation..."
                viewModes={[]}
                viewMode={lv.viewMode}
                onViewModeChange={lv.setViewMode}
                filters={lv.filters}
                onFiltersChange={lv.setFilters}
                onFiltersReset={lv.resetFilters}
                activeFilterCount={lv.activeFilterCount}
                statusOptions={STATUS_ORDER.map((s, i) => ({ value: s, label: STATUS_CFG[s]?.label || s, order: i }))}
                showDateFilter
                sortOptions={[{ key: "date", label: "Date" }, { key: "status", label: "Statut" }]}
                sortKey={lv.sortKey}
                sortDir={lv.sortDir}
                onSortKeyChange={lv.setSortKey}
                onSortDirToggle={() => lv.setSortDir(lv.sortDir === "asc" ? "desc" : "asc")}
            />

            {/* ── Empty states ── */}
            {consultations.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                    <Inbox size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Aucune consultation</div>
                    <div style={{ fontSize: 14 }}>Vous n'avez pas encore reçu de demandes.</div>
                </div>
            )}
            {consultations.length > 0 && lv.filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                    <SearchX size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.dark }}>Aucune consultation ne correspond</div>
                </div>
            )}

            {/* ── Grouped list ── */}
            {lv.filtered.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 16 }}>
                    {lv.sortedGroupKeys.map(status => {
                        const sc = STATUS_CFG[status] || { label: status, bg: C.surface, color: C.muted }
                        const items = lv.grouped[status]
                        const isCollapsed = !!lv.collapsed[status]
                        return (
                            <div key={status}>
                                <div
                                    onClick={() => lv.toggleCollapsed(status)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        padding: "10px 16px", borderRadius: 10,
                                        backgroundColor: sc.bg, cursor: "pointer",
                                        userSelect: "none" as const,
                                        marginBottom: isCollapsed ? 0 : 10,
                                    }}
                                >
                                    <ChevronDown size={16} style={{ color: sc.color, transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, backgroundColor: sc.color, color: "#fff" }}>{items.length}</span>
                                </div>
                                {!isCollapsed && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {items.map(renderCard)}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Quote upload modal ── */}
            {quoteModal && (
                <QuoteModal
                    consultationId={quoteModal}
                    onClose={() => setQuoteModal(null)}
                    onSuccess={handleQuoteSuccess}
                />
            )}

            <style>{`@keyframes sc-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
