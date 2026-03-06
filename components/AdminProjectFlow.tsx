"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { formatPrice, formatDate } from "@/lib/format"
import {
    Route, MessageSquare, FileText, CheckSquare, CreditCard,
    Send, RefreshCw, ChevronDown, ChevronUp, Bell, Download,
    Check, X, Clock, Loader2, Plus, Trash2, Layers, AlertTriangle, Brain
} from "lucide-react"

const { useState, useEffect, useCallback } = React

/* ─────── types ─────── */
interface Props {
    projectId: string
    projectStatus: string
    token: string
    briefAnalysis?: any
}

interface Consultation {
    consultation_id: string
    supplier_id: string
    supplier_name?: string
    supplier_email?: string
    status: string
    response_price?: number
    response_delay?: string
    sent_at?: string
    responded_at?: string
    email_subject?: string
    email_body?: string
    matched_products?: any[]
    reply_message?: string
    reminders_count?: number
}

interface Validation {
    id: string
    consultation_id: string
    supplier_id: string
    supplier_price: number
    client_decision: string
    admin_decision: string
    final_status: string
    supplier?: { name: string; email: string }
}

interface LineItem {
    description: string
    quantity: number
    unit_price: number
}

/* ─────── step config ─────── */
const STEPS = [
    { key: "routing", label: "Routage fournisseurs", icon: Route },
    { key: "responses", label: "Reponses fournisseurs", icon: MessageSquare },
    { key: "quote", label: "Devis client", icon: FileText },
    { key: "validation", label: "Validation client", icon: CheckSquare },
    { key: "invoicing", label: "Facturation & Paiement", icon: CreditCard },
] as const

type StepKey = (typeof STEPS)[number]["key"]

const STATUS_STEP_MAP: Record<string, number> = {
    created: 0,
    quoted: 2,
    validated: 3,
    in_production: 4,
    delivered: 4,
    archived: 4,
}

/* ─────── component ─────── */
export default function AdminProjectFlow({ projectId, projectStatus, token, briefAnalysis }: Props) {
    const [expandedStep, setExpandedStep] = useState<StepKey | null>(null)
    const [consultations, setConsultations] = useState<Consultation[]>([])
    const [validations, setValidations] = useState<Validation[]>([])
    const [quoteUrl, setQuoteUrl] = useState<string | null>(null)
    const [quoteNumber, setQuoteNumber] = useState<string | null>(null)

    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [messages, setMessages] = useState<Record<string, { type: "ok" | "err"; text: string }>>({})
    const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null)
    const [confirmSendConsultation, setConfirmSendConsultation] = useState<Consultation | null>(null)
    const [confirmSendAll, setConfirmSendAll] = useState(false)
    const [aiReplyDraft, setAiReplyDraft] = useState<string>("")
    const [aiReplyGenerating, setAiReplyGenerating] = useState(false)
    const [aiReplySending, setAiReplySending] = useState(false)
    const [inlineAiInput, setInlineAiInput] = useState("")
    const [inlineAiReply, setInlineAiReply] = useState("")
    const [inlineAiLoading, setInlineAiLoading] = useState(false)
    const stepRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

    /* routing table columns — resizable & reorderable */
    const ROUTING_COLS = ["expand", "supplier", "status", "sent", "actions"] as const
    type RoutingCol = (typeof ROUTING_COLS)[number]
    const ROUTING_COL_LABELS: Record<RoutingCol, string> = { expand: "", supplier: "Fournisseur", status: "Statut", sent: "Envoye le", actions: "Actions" }
    const [rtColOrder, setRtColOrder] = useState<RoutingCol[]>([...ROUTING_COLS])
    const [rtColWidths, setRtColWidths] = useState<Record<string, number>>({})
    const [rtResizing, setRtResizing] = useState<{ col: string; startX: number; startW: number } | null>(null)
    const [rtDragCol, setRtDragCol] = useState<string | null>(null)
    const [rtDragOverCol, setRtDragOverCol] = useState<string | null>(null)

    useEffect(() => {
        if (!rtResizing) return
        function onMouseMove(e: MouseEvent) {
            if (!rtResizing) return
            const newW = Math.max(60, rtResizing.startW + (e.clientX - rtResizing.startX))
            setRtColWidths((prev) => ({ ...prev, [rtResizing.col]: newW }))
        }
        function onMouseUp() { setRtResizing(null) }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp) }
    }, [rtResizing])

    function handleRtColumnDrop(targetCol: string) {
        if (!rtDragCol || rtDragCol === targetCol) { setRtDragCol(null); setRtDragOverCol(null); return }
        setRtColOrder((prev) => {
            const newOrder = prev.filter((c) => c !== rtDragCol)
            const targetIdx = newOrder.indexOf(targetCol as RoutingCol)
            newOrder.splice(targetIdx, 0, rtDragCol as RoutingCol)
            return newOrder
        })
        setRtDragCol(null)
        setRtDragOverCol(null)
    }

    /* invoice step state */
    const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }])
    const [dueDays, setDueDays] = useState(30)
    const [invoiceResult, setInvoiceResult] = useState<any>(null)
    const [aiGeneratingLines, setAiGeneratingLines] = useState(false)

    const activeStepIndex = STATUS_STEP_MAP[projectStatus] ?? 0

    /* ─────── helpers ─────── */
    const authHeaders = useCallback(
        (json = false): HeadersInit => {
            const h: Record<string, string> = { Authorization: "Bearer " + token }
            if (json) h["Content-Type"] = "application/json"
            return h
        },
        [token]
    )

    function setMsg(key: string, type: "ok" | "err", text: string) {
        setMessages((p) => ({ ...p, [key]: { type, text } }))
        if (type === "ok") setTimeout(() => setMessages((p) => { const n = { ...p }; delete n[key]; return n }), 4000)
    }

    function setLoad(key: string, v: boolean) {
        setLoading((p) => ({ ...p, [key]: v }))
    }

    /* ─────── data fetching ─────── */
    const fetchConsultations = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/api/consultation/${projectId}`, { headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                const list = data.consultations || []
                const drafts = list.filter((c: any) => c.status === "draft")
                console.log("[CONSULTATIONS]", { total: list.length, drafts: drafts.length, statuses: list.map((c: any) => c.status) })
                setConsultations(list)
            } else {
                console.error("[FETCH_CONSULTATIONS_ERROR]", data.error, data)
            }
        } catch (e) { console.error("[FETCH_CONSULTATIONS_NETWORK]", e) }
    }, [projectId, authHeaders])

    const fetchValidations = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/api/quote-validation/project/${projectId}`, { headers: authHeaders() })
            const data = await r.json()
            if (data.ok) setValidations(data.validations || [])
        } catch { /* silent */ }
    }, [projectId, authHeaders])

    useEffect(() => {
        fetchConsultations()
        fetchValidations()
    }, [fetchConsultations, fetchValidations])

    /* ─────── actions ─────── */
    async function routeSuppliers() {
        setLoad("route", true)
        try {
            const r = await fetch(`${API_URL}/api/consultation/${projectId}/route`, { method: "POST", headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                setMsg("route", "ok", `${data.suppliers_matched} fournisseur(s) trouve(s)`)
                fetchConsultations()
            } else {
                setMsg("route", "err", data.error || "Erreur routage")
            }
        } catch { setMsg("route", "err", "Erreur reseau") }
        setLoad("route", false)
    }

    async function sendAll() {
        setLoad("sendAll", true)
        try {
            const r = await fetch(`${API_URL}/api/consultation/${projectId}/send-all`, { method: "POST", headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                setMsg("sendAll", "ok", `${data.sent} consultation(s) envoyee(s)`)
                fetchConsultations()
            } else {
                console.error("[SEND_ALL_ERROR]", data.error, data)
                setMsg("sendAll", "err", data.error || "Erreur envoi")
            }
        } catch (e) { console.error("[SEND_ALL_NETWORK]", e); setMsg("sendAll", "err", "Erreur reseau") }
        setLoad("sendAll", false)
    }

    async function sendOne(consultationId: string) {
        setLoad("send_" + consultationId, true)
        try {
            const r = await fetch(`${API_URL}/api/consultation/${consultationId}/send`, { method: "POST", headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                setMsg("send_" + consultationId, "ok", "Consultation envoyee")
                fetchConsultations()
            } else {
                console.error("[SEND_ONE_ERROR]", consultationId, data.error, data)
                setMsg("send_" + consultationId, "err", data.error || "Erreur envoi")
            }
        } catch (e) { console.error("[SEND_ONE_NETWORK]", consultationId, e); setMsg("send_" + consultationId, "err", "Erreur reseau") }
        setLoad("send_" + consultationId, false)
    }

    async function sendReminder(consultationId: string) {
        setLoad("reminder_" + consultationId, true)
        try {
            const r = await fetch(`${API_URL}/api/reminders/send-one/${consultationId}`, { method: "POST", headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                setMsg("reminder", "ok", "Relance envoyee")
            } else {
                setMsg("reminder", "err", data.error || "Erreur relance")
            }
        } catch { setMsg("reminder", "err", "Erreur reseau") }
        setLoad("reminder_" + consultationId, false)
    }

    async function generateQuote() {
        setLoad("quote", true)
        try {
            const r = await fetch(`${API_URL}/api/quote/${projectId}/generate-quote`, { method: "POST", headers: authHeaders() })
            const data = await r.json()
            if (data.ok) {
                setQuoteUrl(data.quote_url || null)
                setQuoteNumber(data.quote_number || null)
                setMsg("quote", "ok", `Devis ${data.quote_number} genere`)
            } else {
                setMsg("quote", "err", data.error || "Erreur generation devis")
            }
        } catch { setMsg("quote", "err", "Erreur reseau") }
        setLoad("quote", false)
    }

    async function generateInvoice() {
        const validItems = lineItems.filter((li) => li.description.trim() && li.quantity > 0 && li.unit_price > 0)
        if (validItems.length === 0) {
            setMsg("invoice", "err", "Ajoutez au moins une ligne valide")
            return
        }
        setLoad("invoice", true)
        try {
            const r = await fetch(`${API_URL}/api/invoice/generate`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify({
                    project_id: projectId,
                    line_items: validItems,
                    due_days: dueDays,
                }),
            })
            const data = await r.json()
            if (data.ok) {
                setInvoiceResult(data)
                setMsg("invoice", "ok", `Facture ${data.invoice?.invoice_number} generee`)
            } else {
                setMsg("invoice", "err", data.error || "Erreur facturation")
            }
        } catch { setMsg("invoice", "err", "Erreur reseau") }
        setLoad("invoice", false)
    }

    async function generateLinesViaAI() {
        if (aiGeneratingLines) return
        setAiGeneratingLines(true)
        setMsg("invoice", "ok", "")
        try {
            const r = await fetch(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify({
                    project_id: projectId,
                    message: "Genere les lignes de facturation a partir du plan de production et des briefs. Reponds UNIQUEMENT avec un JSON array (sans markdown, sans texte avant/apres) au format: [{\"description\": \"...\", \"quantity\": N, \"unit_price\": N}]. Chaque ligne doit avoir une description claire du produit/prestation, la quantite et un prix unitaire HT estime en euros.",
                    context: {
                        briefs: briefAnalysis || null,
                        production_plan: briefAnalysis?.production_plan || null,
                    },
                }),
            })
            const data = await r.json()
            if (data.ok && data.reply) {
                // Extract JSON array from AI response
                const text = data.reply.trim()
                const start = text.indexOf("[")
                const end = text.lastIndexOf("]")
                if (start !== -1 && end !== -1) {
                    const parsed = JSON.parse(text.slice(start, end + 1))
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const items: LineItem[] = parsed.map((item: any) => ({
                            description: String(item.description || ""),
                            quantity: Number(item.quantity) || 1,
                            unit_price: Number(item.unit_price) || 0,
                        }))
                        setLineItems(items)
                        setMsg("invoice", "ok", `${items.length} ligne(s) generee(s) par l'IA`)
                    } else {
                        setMsg("invoice", "err", "L'IA n'a pas retourne de lignes valides")
                    }
                } else {
                    setMsg("invoice", "err", "Format de reponse IA invalide")
                }
            } else {
                setMsg("invoice", "err", data.error || "Erreur IA")
            }
        } catch { setMsg("invoice", "err", "Erreur reseau") }
        setAiGeneratingLines(false)
    }

    /* ─────── AI reply for supplier ─────── */
    async function generateAIReply(consultation: Consultation) {
        setAiReplyGenerating(true)
        setAiReplyDraft("")
        try {
            const r = await fetch(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify({
                    project_id: projectId,
                    message: `Génère une réponse professionnelle à ce fournisseur suite à sa réponse : "${consultation.reply_message}". Contexte projet : ${JSON.stringify(briefAnalysis?.production_plan || {})}. Réponds uniquement avec le texte du mail, sans objet, sans signature.`,
                    context: { consultation, production_plan: briefAnalysis?.production_plan || null },
                }),
            })
            const data = await r.json()
            if (data.ok && data.reply) {
                setAiReplyDraft(data.reply)
            } else {
                setMsg("reply_" + consultation.consultation_id, "err", data.error || "Erreur IA")
            }
        } catch { setMsg("reply_" + consultation.consultation_id, "err", "Erreur réseau") }
        setAiReplyGenerating(false)
    }

    async function sendAdminReply(consultationId: string) {
        if (!aiReplyDraft.trim() || aiReplySending) return
        setAiReplySending(true)
        try {
            const r = await fetch(`${API_URL}/api/consultation/${consultationId}/admin-reply`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify({ reply_message: aiReplyDraft.trim() }),
            })
            const data = await r.json()
            if (data.ok) {
                setMsg("reply_" + consultationId, "ok", "Réponse envoyée")
                setAiReplyDraft("")
                // Update consultation status in real time
                setConsultations((prev) =>
                    prev.map((c) => c.consultation_id === consultationId ? { ...c, status: data.consultation?.status || "replied", ...data.consultation } : c)
                )
            } else {
                setMsg("reply_" + consultationId, "err", data.error || "Erreur envoi")
            }
        } catch { setMsg("reply_" + consultationId, "err", "Erreur réseau") }
        setAiReplySending(false)
    }

    async function askInlineAI(consultation: Consultation) {
        if (!inlineAiInput.trim() || inlineAiLoading) return
        setInlineAiLoading(true)
        setInlineAiReply("")
        try {
            const r = await fetch(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify({
                    project_id: projectId,
                    message: inlineAiInput.trim(),
                    context: { consultation, production_plan: briefAnalysis?.production_plan || null },
                }),
            })
            const data = await r.json()
            if (data.ok && data.reply) {
                setInlineAiReply(data.reply)
            } else {
                setInlineAiReply("Erreur : " + (data.error || "Impossible de contacter l'assistant."))
            }
        } catch { setInlineAiReply("Erreur réseau. Réessayez.") }
        setInlineAiLoading(false)
        setInlineAiInput("")
    }

    /* ─────── shared inline AI panel ─────── */
    const AI_SHORTCUTS = [
        { label: "Réécrire le mail", prompt: "Réécris le mail de consultation envoyé à ce fournisseur de manière plus professionnelle et percutante. Mail actuel : " },
        { label: "Réorienter le projet", prompt: "Propose une réorientation des lots de production pour ce projet en tenant compte des réponses fournisseurs et du plan de production actuel." },
        { label: "Préparer une réponse", prompt: "Prépare une réponse professionnelle à envoyer à ce fournisseur en tenant compte de sa réponse et du contexte projet." },
    ]

    function renderInlineAI(sel: Consultation, detailLbl: React.CSSProperties) {
        return (
            <div style={{ marginTop: 16, padding: "14px 16px", backgroundColor: C.white, borderRadius: 10, border: "1px solid " + C.border }}>
                <div style={{ ...detailLbl, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Brain size={12} /> Assistant IA
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {AI_SHORTCUTS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                const ctx = s.prompt + (sel.email_body || "") + (sel.reply_message ? `\nRéponse fournisseur : ${sel.reply_message}` : "")
                                setInlineAiInput(ctx)
                            }}
                            style={{
                                padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                border: "1px solid " + C.border, background: C.bg, color: C.dark,
                                cursor: "pointer", whiteSpace: "nowrap",
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        value={inlineAiInput}
                        onChange={(e) => setInlineAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") askInlineAI(sel) }}
                        placeholder="Poser une question sur cette consultation..."
                        style={{
                            flex: 1, padding: "8px 12px", fontSize: 12, border: "1px solid " + C.border,
                            borderRadius: 6, color: C.dark, outline: "none",
                        }}
                    />
                    <button
                        onClick={() => askInlineAI(sel)}
                        disabled={inlineAiLoading || !inlineAiInput.trim()}
                        style={{
                            padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: "none", background: C.yellow, color: C.dark,
                            cursor: inlineAiLoading ? "not-allowed" : "pointer",
                            opacity: inlineAiLoading ? 0.7 : 1,
                            display: "inline-flex", alignItems: "center", gap: 5,
                        }}
                    >
                        {inlineAiLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
                        {inlineAiLoading ? "..." : "Demander"}
                    </button>
                </div>
                {inlineAiReply && (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", backgroundColor: "#fafaf8", borderRadius: 8, border: "1px solid " + C.border, maxHeight: 200, overflowY: "auto" }}>
                        {inlineAiReply}
                    </div>
                )}
            </div>
        )
    }

    /* ─────── line items ─────── */
    function addLine() {
        setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])
    }
    function removeLine(idx: number) {
        setLineItems((prev) => prev.filter((_, i) => i !== idx))
    }
    function updateLine(idx: number, field: keyof LineItem, value: string | number) {
        setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)))
    }

    /* ─────── step state ─────── */
    function stepState(idx: number): "completed" | "active" | "future" {
        if (idx < activeStepIndex) return "completed"
        if (idx === activeStepIndex) return "active"
        return "future"
    }

    /* ─────── render ─────── */
    const stepBorder = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "#22c55e"
        if (state === "active") return C.yellow
        return C.border
    }

    const stepBg = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "#f0fdf4"
        if (state === "active") return "#fefce8"
        return "#fafafa"
    }

    const stepIconColor = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "#22c55e"
        if (state === "active") return "#b89a00"
        return C.muted
    }

    function renderMsg(key: string) {
        const m = messages[key]
        if (!m) return null
        return (
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: m.type === "ok" ? "#f0fdf4" : "#fef2f2", color: m.type === "ok" ? "#166534" : "#991b1b", border: "1px solid " + (m.type === "ok" ? "#bbf7d0" : "#fecaca") }}>
                {m.text}
            </div>
        )
    }

    function renderBtn(label: string, onClick: () => void, loadKey: string, icon: React.ReactNode, variant: "primary" | "secondary" = "primary", disabled = false) {
        const isLoading = loading[loadKey]
        const isPrimary = variant === "primary"
        return (
            <button
                onClick={onClick}
                disabled={isLoading || disabled}
                style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: isPrimary ? "none" : "1px solid " + C.border,
                    background: isPrimary ? C.yellow : C.white,
                    color: isPrimary ? C.dark : C.dark,
                    cursor: isLoading || disabled ? "not-allowed" : "pointer",
                    opacity: isLoading || disabled ? 0.6 : 1,
                    transition: "opacity 0.15s",
                }}
            >
                {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : icon}
                {label}
            </button>
        )
    }

    /* ─────── step content renderers ─────── */
    function renderProductionPlan() {
        const plan = briefAnalysis?.production_plan
        if (!plan) return null
        return (
            <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, backgroundColor: "#fefce8", border: "1px solid #fef08a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Route size={14} color="#b89a00" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>L&apos;IA recommande ce plan de production :</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{plan.total_lots} lot(s)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.lots?.map((lot: any) => (
                        <div key={lot.lot_number} style={{
                            padding: "10px 12px", borderRadius: 8,
                            backgroundColor: C.white,
                            borderLeft: `3px solid ${lot.is_amalgame ? C.yellow : C.border}`,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Lot {lot.lot_number}</span>
                                    {lot.recommended_supplier && (
                                        <span style={{ fontSize: 10, fontWeight: 600, color: C.white, backgroundColor: C.dark, padding: "1px 6px", borderRadius: 4 }}>
                                            {lot.recommended_supplier}
                                        </span>
                                    )}
                                    {lot.is_amalgame && (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: C.dark, backgroundColor: C.yellow, padding: "1px 6px", borderRadius: 4 }}>
                                            <Layers size={10} /> Amalgame
                                        </span>
                                    )}
                                </div>
                                {lot.estimated_delay_days != null && (
                                    <span style={{ fontSize: 11, color: C.muted }}>{lot.estimated_delay_days}j</span>
                                )}
                            </div>
                            {lot.products?.map((p: any, idx: number) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.dark, padding: "2px 0" }}>
                                    <span>{p.name} {p.quantity ? `× ${p.quantity}` : ""}</span>
                                    {p.estimated_price_ht != null && <span style={{ fontWeight: 600 }}>{formatPrice(p.estimated_price_ht)} HT</span>}
                                </div>
                            ))}
                            {lot.total_estimated_ht != null && (
                                <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: C.dark, marginTop: 4, paddingTop: 4, borderTop: "1px solid " + C.border }}>
                                    {formatPrice(lot.total_estimated_ht)} HT
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {plan.total_estimated_ht != null && (
                    <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: C.dark, marginTop: 10 }}>
                        Total estimé : {formatPrice(plan.total_estimated_ht)} HT
                    </div>
                )}
                {plan.optimization_notes && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{plan.optimization_notes}</div>
                )}
                {plan.risks?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {plan.risks.map((risk: string, idx: number) => (
                            <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#e67e22", backgroundColor: "rgba(230,126,34,0.1)", padding: "3px 8px", borderRadius: 4 }}>
                                <AlertTriangle size={11} /> {risk}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    function renderRouting() {
        const draftCount = consultations.filter((c) => c.status === "draft").length
        return (
            <div>
                {renderProductionPlan()}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {renderBtn("Lancer le routage IA", routeSuppliers, "route", <Route size={14} />)}
                    {consultations.length > 0 && renderBtn(`Envoyer tout (${draftCount})`, () => setConfirmSendAll(true), "sendAll", <Send size={14} />, "secondary", draftCount === 0)}
                </div>
                {renderMsg("route")}
                {renderMsg("sendAll")}
                {consultations.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {consultations.length} fournisseur(s) routé(s)
                        </div>
                        <div style={{ display: "flex", gap: 0, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", minHeight: 280 }}>
                            {/* Left: supplier list (40%) */}
                            <div style={{ width: "40%", borderRight: "1px solid " + C.border, overflowY: "auto", maxHeight: 500 }}>
                                {consultations.map((c) => {
                                    const isSelected = expandedConsultation === c.consultation_id
                                    return (
                                        <div
                                            key={c.consultation_id}
                                            onClick={() => { setExpandedConsultation(isSelected ? null : c.consultation_id); setAiReplyDraft(""); setInlineAiReply(""); setInlineAiInput("") }}
                                            style={{
                                                padding: "12px 14px", cursor: "pointer",
                                                backgroundColor: isSelected ? "#fafaf8" : C.white,
                                                borderBottom: "1px solid " + C.bg,
                                                borderLeft: isSelected ? "3px solid " + C.yellow : "3px solid transparent",
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, marginBottom: 2 }}>
                                                {c.supplier_name || c.supplier_id.slice(0, 10)}
                                            </div>
                                            {c.supplier_email && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{c.supplier_email}</div>}
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {renderConsultationStatus(c.status)}
                                                {c.status === "draft" && (
                                                    <span onClick={(e) => { e.stopPropagation(); setConfirmSendConsultation(c) }} style={{ fontSize: 11, fontWeight: 600, color: C.yellow, cursor: "pointer" }}>
                                                        Envoyer
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Right: detail panel (60%) */}
                            <div style={{ width: "60%", padding: "16px 20px", overflowY: "auto", maxHeight: 500, backgroundColor: "#fafaf8" }}>
                                {(() => {
                                    const sel = consultations.find((c) => c.consultation_id === expandedConsultation)
                                    if (!sel) return (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 13 }}>
                                            Sélectionnez un fournisseur
                                        </div>
                                    )
                                    const detailLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }
                                    return (
                                        <>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                                                    {sel.supplier_name || sel.supplier_id.slice(0, 10)}
                                                </div>
                                                {renderConsultationStatus(sel.status)}
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 16 }}>
                                                <div>
                                                    <div style={detailLbl}>Date d'envoi</div>
                                                    <div style={{ fontSize: 13, color: C.dark }}>{sel.sent_at ? formatDate(sel.sent_at) : "—"}</div>
                                                </div>
                                                <div>
                                                    <div style={detailLbl}>Date de réponse</div>
                                                    <div style={{ fontSize: 13, color: C.dark }}>{sel.responded_at ? formatDate(sel.responded_at) : "—"}</div>
                                                </div>
                                                {sel.response_price != null && (
                                                    <div>
                                                        <div style={detailLbl}>Prix proposé</div>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{formatPrice(sel.response_price)}</div>
                                                    </div>
                                                )}
                                                {sel.response_delay && (
                                                    <div>
                                                        <div style={detailLbl}>Délai proposé</div>
                                                        <div style={{ fontSize: 13, color: C.dark }}>{sel.response_delay}</div>
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={detailLbl}>Jours depuis l'envoi</div>
                                                    <div style={{ fontSize: 13, color: C.dark }}>
                                                        {sel.sent_at ? Math.max(0, Math.floor((Date.now() - new Date(sel.sent_at).getTime()) / 86400000)) + " j" : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={detailLbl}>Relances envoyées</div>
                                                    <div style={{ fontSize: 13, color: C.dark }}>{sel.reminders_count ?? 0}</div>
                                                </div>
                                            </div>
                                            {sel.matched_products && sel.matched_products.length > 0 && (
                                                <div style={{ marginBottom: 14 }}>
                                                    <div style={detailLbl}>Produits matchés</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                        {sel.matched_products.map((p: any, idx: number) => (
                                                            <span key={idx} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.white, border: "1px solid " + C.border, color: C.dark }}>
                                                                {p.name || p.product_name || p.label || JSON.stringify(p)}
                                                                {p.quantity ? ` × ${p.quantity}` : ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {sel.email_subject && (
                                                <div style={{ marginBottom: 14 }}>
                                                    <div style={detailLbl}>Objet du message</div>
                                                    <div style={{ fontSize: 13, color: C.dark }}>{sel.email_subject}</div>
                                                </div>
                                            )}
                                            {sel.email_body && (
                                                <div style={{ marginBottom: 14 }}>
                                                    <div style={detailLbl}>Message envoyé</div>
                                                    <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", backgroundColor: C.white, borderRadius: 8, border: "1px solid " + C.border, maxHeight: 200, overflowY: "auto" }}>
                                                        {sel.email_body}
                                                    </div>
                                                </div>
                                            )}
                                            {sel.reply_message && (
                                                <div style={{ marginBottom: 14 }}>
                                                    <div style={detailLbl}>Réponse reçue</div>
                                                    <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", backgroundColor: "#f0faf0", borderRadius: 8, border: "1px solid #c6e6c6", maxHeight: 200, overflowY: "auto" }}>
                                                        {sel.reply_message}
                                                    </div>
                                                    {/* AI reply generation */}
                                                    <div style={{ marginTop: 10 }}>
                                                        <button
                                                            onClick={() => generateAIReply(sel)}
                                                            disabled={aiReplyGenerating}
                                                            style={{
                                                                display: "inline-flex", alignItems: "center", gap: 6,
                                                                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                                border: "1px solid " + C.border, background: aiReplyGenerating ? "#fef9e0" : C.white,
                                                                color: C.dark, cursor: aiReplyGenerating ? "not-allowed" : "pointer",
                                                            }}
                                                        >
                                                            {aiReplyGenerating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={12} />}
                                                            {aiReplyGenerating ? "Génération..." : "Générer une réponse IA"}
                                                        </button>
                                                    </div>
                                                    {aiReplyDraft && (
                                                        <div style={{ marginTop: 10 }}>
                                                            <div style={detailLbl}>Réponse à envoyer</div>
                                                            <textarea
                                                                value={aiReplyDraft}
                                                                onChange={(e) => setAiReplyDraft(e.target.value)}
                                                                rows={6}
                                                                style={{
                                                                    width: "100%", padding: "10px 12px", fontSize: 12, lineHeight: 1.6,
                                                                    border: "1px solid " + C.border, borderRadius: 8, color: C.dark,
                                                                    resize: "vertical", outline: "none", boxSizing: "border-box",
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => sendAdminReply(sel.consultation_id)}
                                                                disabled={aiReplySending || !aiReplyDraft.trim()}
                                                                style={{
                                                                    marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                                                                    padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                                    border: "none", background: C.yellow, color: C.dark,
                                                                    cursor: aiReplySending ? "not-allowed" : "pointer",
                                                                    opacity: aiReplySending ? 0.7 : 1,
                                                                }}
                                                            >
                                                                {aiReplySending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
                                                                {aiReplySending ? "Envoi..." : "Envoyer cette réponse"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {renderMsg("reply_" + sel.consultation_id)}
                                                </div>
                                            )}
                                            {!sel.email_subject && !sel.email_body && !sel.matched_products?.length && !sel.reply_message && (
                                                <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>Aucun détail disponible pour cette consultation.</div>
                                            )}
                                            {/* Inline AI assistant */}
                                            {renderInlineAI(sel, detailLbl)}
                                            {renderMsg("send_" + sel.consultation_id)}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    function renderConsultationStatus(status: string) {
        const cfg: Record<string, { label: string; bg: string; color: string }> = {
            draft: { label: "Brouillon", bg: "#fef9e0", color: "#b89a00" },
            created: { label: "Cree", bg: "#f5f5f5", color: "#616161" },
            pending: { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
            sent: { label: "Envoye", bg: "#e8f0fe", color: "#1a3c7a" },
            responded: { label: "Repondu", bg: "#e8f8ee", color: "#1a7a3c" },
            declined: { label: "Decline", bg: "#fef2f2", color: "#991b1b" },
        }
        const c = cfg[status] || { label: status, bg: "#f5f5f5", color: "#616161" }
        return (
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
                {c.label}
            </span>
        )
    }

    function renderResponses() {
        const responded = consultations.filter((c) => c.status === "responded" || c.status === "replied")
        const pending = consultations.filter((c) => c.status !== "responded" && c.status !== "replied")
        const allForPanel = [...responded, ...pending]

        if (consultations.length === 0) {
            return (
                <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
                    Aucune consultation trouvée. Lancez le routage en étape 1.
                </div>
            )
        }

        const detailLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }

        return (
            <div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: C.dark }}>
                        <span style={{ fontWeight: 600 }}>{responded.length}</span> réponse(s)
                    </div>
                    <div style={{ fontSize: 13, color: C.muted }}>
                        <span style={{ fontWeight: 600 }}>{pending.length}</span> en attente
                    </div>
                </div>

                <div style={{ display: "flex", gap: 0, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", minHeight: 280 }}>
                    {/* Left: supplier list (40%) */}
                    <div style={{ width: "40%", borderRight: "1px solid " + C.border, overflowY: "auto", maxHeight: 500 }}>
                        {allForPanel.map((c) => {
                            const isSelected = expandedConsultation === c.consultation_id
                            const hasReplied = c.status === "responded" || c.status === "replied" || c.reply_message != null
                            return (
                                <div
                                    key={c.consultation_id}
                                    onClick={() => { setExpandedConsultation(isSelected ? null : c.consultation_id); setAiReplyDraft(""); setInlineAiReply(""); setInlineAiInput("") }}
                                    style={{
                                        padding: "12px 14px", cursor: "pointer",
                                        backgroundColor: isSelected ? "#fafaf8" : C.white,
                                        borderBottom: "1px solid " + C.bg,
                                        borderLeft: isSelected ? "3px solid " + C.yellow : "3px solid transparent",
                                        opacity: hasReplied ? 1 : 0.6,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, marginBottom: 2 }}>
                                        {c.supplier_name || c.supplier_id.slice(0, 10)}
                                    </div>
                                    {c.supplier_email && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{c.supplier_email}</div>}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {renderConsultationStatus(c.status)}
                                    </div>
                                    {c.status !== "replied" && c.status !== "responded" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                sendReminder(c.consultation_id)
                                                setMsg("reminder_" + c.consultation_id, "ok", "Relance envoyée")
                                            }}
                                            style={{
                                                marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
                                                padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                                border: "1px solid #e8d88e", background: "#fef9e0", color: "#b89a00",
                                                cursor: "pointer", opacity: 1, pointerEvents: "auto",
                                            }}
                                        >
                                            <Bell size={10} /> Relancer
                                        </button>
                                    )}
                                    {renderMsg("reminder_" + c.consultation_id)}
                                </div>
                            )
                        })}
                    </div>
                    {/* Right: detail panel (60%) */}
                    <div style={{ width: "60%", padding: "16px 20px", overflowY: "auto", maxHeight: 500, backgroundColor: "#fafaf8" }}>
                        {(() => {
                            const sel = allForPanel.find((c) => c.consultation_id === expandedConsultation)
                            if (!sel) return (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 13 }}>
                                    Sélectionnez un fournisseur
                                </div>
                            )
                            const hasReplied = sel.status === "responded" || sel.status === "replied" || sel.reply_message != null
                            return (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                                            {sel.supplier_name || sel.supplier_id.slice(0, 10)}
                                        </div>
                                        {renderConsultationStatus(sel.status)}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 16 }}>
                                        <div>
                                            <div style={detailLbl}>Date d'envoi</div>
                                            <div style={{ fontSize: 13, color: C.dark }}>{sel.sent_at ? formatDate(sel.sent_at) : "—"}</div>
                                        </div>
                                        <div>
                                            <div style={detailLbl}>Date de réponse</div>
                                            <div style={{ fontSize: 13, color: C.dark }}>{sel.responded_at ? formatDate(sel.responded_at) : "—"}</div>
                                        </div>
                                        {sel.response_price != null && (
                                            <div>
                                                <div style={detailLbl}>Prix proposé</div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{formatPrice(sel.response_price)}</div>
                                            </div>
                                        )}
                                        {sel.response_delay && (
                                            <div>
                                                <div style={detailLbl}>Délai proposé</div>
                                                <div style={{ fontSize: 13, color: C.dark }}>{sel.response_delay}</div>
                                            </div>
                                        )}
                                        <div>
                                            <div style={detailLbl}>Jours depuis l'envoi</div>
                                            <div style={{ fontSize: 13, color: C.dark }}>
                                                {sel.sent_at ? Math.max(0, Math.floor((Date.now() - new Date(sel.sent_at).getTime()) / 86400000)) + " j" : "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={detailLbl}>Relances envoyées</div>
                                            <div style={{ fontSize: 13, color: C.dark }}>{sel.reminders_count ?? 0}</div>
                                        </div>
                                    </div>

                                    {/* Supplier reply */}
                                    {hasReplied && sel.reply_message ? (
                                        <div style={{ marginBottom: 14 }}>
                                            <div style={detailLbl}>Réponse reçue</div>
                                            <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", backgroundColor: "#f0faf0", borderRadius: 8, border: "1px solid #c6e6c6", maxHeight: 200, overflowY: "auto" }}>
                                                {sel.reply_message}
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                <button
                                                    onClick={() => generateAIReply(sel)}
                                                    disabled={aiReplyGenerating}
                                                    style={{
                                                        display: "inline-flex", alignItems: "center", gap: 6,
                                                        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                        border: "1px solid " + C.border, background: aiReplyGenerating ? "#fef9e0" : C.white,
                                                        color: C.dark, cursor: aiReplyGenerating ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    {aiReplyGenerating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={12} />}
                                                    {aiReplyGenerating ? "Génération..." : "Générer une réponse IA"}
                                                </button>
                                            </div>
                                            {aiReplyDraft && (
                                                <div style={{ marginTop: 10 }}>
                                                    <div style={detailLbl}>Réponse à envoyer</div>
                                                    <textarea
                                                        value={aiReplyDraft}
                                                        onChange={(e) => setAiReplyDraft(e.target.value)}
                                                        rows={6}
                                                        style={{
                                                            width: "100%", padding: "10px 12px", fontSize: 12, lineHeight: 1.6,
                                                            border: "1px solid " + C.border, borderRadius: 8, color: C.dark,
                                                            resize: "vertical", outline: "none", boxSizing: "border-box",
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => sendAdminReply(sel.consultation_id)}
                                                        disabled={aiReplySending || !aiReplyDraft.trim()}
                                                        style={{
                                                            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                                                            padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                            border: "none", background: C.yellow, color: C.dark,
                                                            cursor: aiReplySending ? "not-allowed" : "pointer",
                                                            opacity: aiReplySending ? 0.7 : 1,
                                                        }}
                                                    >
                                                        {aiReplySending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
                                                        {aiReplySending ? "Envoi..." : "Envoyer cette réponse"}
                                                    </button>
                                                </div>
                                            )}
                                            {renderMsg("reply_" + sel.consultation_id)}
                                        </div>
                                    ) : hasReplied ? (
                                        <div style={{ padding: 16, textAlign: "center", color: C.muted, fontSize: 13, fontStyle: "italic" }}>
                                            Ce fournisseur a répondu mais aucun message n'est disponible.
                                        </div>
                                    ) : (
                                        <div style={{ padding: 16, textAlign: "center", color: C.muted, fontSize: 13, fontStyle: "italic" }}>
                                            En attente de réponse de ce fournisseur.
                                        </div>
                                    )}
                                    {/* Inline AI assistant */}
                                    {renderInlineAI(sel, detailLbl)}

                                    {renderMsg("reminder_" + sel.consultation_id)}
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>
        )
    }

    function renderQuote() {
        return (
            <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {renderBtn("Generer le devis client", generateQuote, "quote", <FileText size={14} />)}
                    {quoteUrl && (
                        <a
                            href={quoteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                                border: "1px solid " + C.border, background: C.white, color: C.dark,
                                textDecoration: "none",
                            }}
                        >
                            <Download size={14} />
                            Telecharger {quoteNumber || "le devis"}
                        </a>
                    )}
                </div>
                {renderMsg("quote")}
                {quoteUrl && (
                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13, color: "#166534" }}>
                        <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                        Devis {quoteNumber} genere avec succes.
                    </div>
                )}
            </div>
        )
    }

    function renderValidation() {
        if (validations.length === 0) {
            return (
                <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
                    Aucune validation recue. Le devis doit etre genere et envoye au client.
                </div>
            )
        }

        return (
            <div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr>
                            {["Fournisseur", "Prix", "Decision client", "Decision admin", "Statut final"].map((h) => (
                                <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: "1px solid " + C.border, textTransform: "uppercase" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {validations.map((v) => (
                            <tr key={v.id}>
                                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontWeight: 500, color: C.dark }}>
                                    {v.supplier?.name || v.supplier_id.slice(0, 10)}
                                </td>
                                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontWeight: 600, color: C.dark }}>
                                    {formatPrice(v.supplier_price)}
                                </td>
                                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                    {renderDecisionBadge(v.client_decision)}
                                </td>
                                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                    {renderDecisionBadge(v.admin_decision)}
                                </td>
                                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                    {renderFinalStatus(v.final_status)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    function renderDecisionBadge(decision: string) {
        if (decision === "accepted") return <span style={{ color: "#166534", fontWeight: 600, fontSize: 12 }}><Check size={13} style={{ verticalAlign: "middle", marginRight: 2 }} />Accepte</span>
        if (decision === "rejected") return <span style={{ color: "#991b1b", fontWeight: 600, fontSize: 12 }}><X size={13} style={{ verticalAlign: "middle", marginRight: 2 }} />Refuse</span>
        return <span style={{ color: C.muted, fontSize: 12 }}><Clock size={13} style={{ verticalAlign: "middle", marginRight: 2 }} />En attente</span>
    }

    function renderFinalStatus(status: string) {
        const cfg: Record<string, { label: string; bg: string; color: string }> = {
            accepted: { label: "Accepte", bg: "#e8f8ee", color: "#1a7a3c" },
            rejected: { label: "Refuse", bg: "#fef2f2", color: "#991b1b" },
            pending: { label: "En cours", bg: "#fef9e0", color: "#b89a00" },
        }
        const c = cfg[status] || { label: status, bg: "#f5f5f5", color: "#616161" }
        return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{c.label}</span>
    }

    function renderInvoicing() {
        if (invoiceResult) {
            return (
                <div>
                    <div style={{ padding: "14px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                            <Check size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                            Facture {invoiceResult.invoice?.invoice_number} generee
                        </div>
                        <div style={{ fontSize: 13, color: "#166534" }}>
                            Total : {formatPrice(invoiceResult.invoice?.total || 0)}
                            {invoiceResult.invoice?.payment_type === "split" && (
                                <span> — Acompte : {formatPrice(invoiceResult.invoice?.deposit_amount || 0)}</span>
                            )}
                        </div>
                    </div>
                    {invoiceResult.pdf_url && (
                        <a
                            href={invoiceResult.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                                border: "1px solid " + C.border, background: C.white, color: C.dark,
                                textDecoration: "none",
                            }}
                        >
                            <Download size={14} />
                            Telecharger la facture PDF
                        </a>
                    )}
                </div>
            )
        }

        const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0)

        return (
            <div>
                {/* Line items */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Lignes de facturation
                    </div>
                    <button
                        onClick={generateLinesViaAI}
                        disabled={aiGeneratingLines}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: "1px solid " + C.border, background: aiGeneratingLines ? "#fef9e0" : C.white,
                            color: C.dark, cursor: aiGeneratingLines ? "not-allowed" : "pointer",
                            opacity: aiGeneratingLines ? 0.7 : 1,
                        }}
                    >
                        {aiGeneratingLines ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={12} />}
                        {aiGeneratingLines ? "Generation..." : "Generer les lignes via IA"}
                    </button>
                </div>
                {lineItems.map((li, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            value={li.description}
                            onChange={(e) => updateLine(idx, "description", e.target.value)}
                            placeholder="Description"
                            style={{ flex: 2, minWidth: 160, padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none" }}
                        />
                        <input
                            type="number"
                            value={li.quantity}
                            onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                            placeholder="Qte"
                            min={1}
                            style={{ width: 70, padding: "8px 10px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", textAlign: "center" }}
                        />
                        <input
                            type="number"
                            value={li.unit_price}
                            onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))}
                            placeholder="PU HT"
                            min={0}
                            step={0.01}
                            style={{ width: 100, padding: "8px 10px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", textAlign: "right" }}
                        />
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, width: 80, textAlign: "right" }}>
                            {formatPrice(li.quantity * li.unit_price)}
                        </div>
                        {lineItems.length > 1 && (
                            <button onClick={() => removeLine(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", padding: 4 }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={addLine}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", border: "1px dashed " + C.border, borderRadius: 6, background: "none", fontSize: 12, color: C.muted, cursor: "pointer", marginBottom: 16 }}
                >
                    <Plus size={13} /> Ajouter une ligne
                </button>

                {/* Subtotal */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                        Sous-total HT : {formatPrice(subtotal)}
                    </div>
                </div>

                {/* Due days */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: C.muted }}>Echeance :</label>
                    <select
                        value={dueDays}
                        onChange={(e) => setDueDays(Number(e.target.value))}
                        style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none" }}
                    >
                        <option value={15}>15 jours</option>
                        <option value={30}>30 jours</option>
                        <option value={45}>45 jours</option>
                        <option value={60}>60 jours</option>
                    </select>
                </div>

                {/* Generate button */}
                {renderBtn("Generer la facture", generateInvoice, "invoice", <CreditCard size={14} />)}
                {renderMsg("invoice")}
            </div>
        )
    }

    /* ─────── main render ─────── */
    return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {STEPS.map((step, idx) => {
                    const state = stepState(idx)
                    const Icon = step.icon
                    const isExpanded = expandedStep === step.key

                    return (
                        <div key={step.key} style={{ position: "relative" }}>
                            {/* Connector line */}
                            {idx > 0 && (
                                <div style={{
                                    position: "absolute", top: -8, left: 22,
                                    width: 2, height: 8,
                                    background: stepState(idx - 1) === "completed" ? "#22c55e" : C.border,
                                }} />
                            )}

                            {/* Step header */}
                            <div
                                ref={(el) => { stepRefs.current[step.key] = el }}
                                tabIndex={-1}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation()
                                    const next = isExpanded ? null : step.key
                                    setExpandedStep(next)
                                    if (next) { setTimeout(() => { stepRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 100) }
                                }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "14px 16px",
                                    background: stepBg(state),
                                    borderRadius: 10,
                                    border: "1.5px solid " + stepBorder(state),
                                    cursor: "pointer",
                                    marginBottom: isExpanded ? 0 : 8,
                                    borderBottomLeftRadius: isExpanded ? 0 : 10,
                                    borderBottomRightRadius: isExpanded ? 0 : 10,
                                    transition: "border-color 0.2s, background 0.2s",
                                }}
                            >
                                {/* Step number circle */}
                                <div style={{
                                    width: 32, height: 32, borderRadius: "50%",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: state === "completed" ? "#22c55e" : state === "active" ? C.yellow : "#e5e5e5",
                                    color: state === "future" ? C.muted : C.dark,
                                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {state === "completed" ? <Check size={16} color="#fff" /> : idx + 1}
                                </div>

                                <Icon size={18} color={stepIconColor(state)} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: state === "future" ? C.muted : C.dark }}>
                                        {step.label}
                                    </div>
                                </div>

                                {isExpanded ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
                            </div>

                            {/* Step content */}
                            {isExpanded && (
                                <div style={{
                                    padding: "16px 20px",
                                    background: C.white,
                                    border: "1.5px solid " + stepBorder(state),
                                    borderTop: "none",
                                    borderBottomLeftRadius: 10,
                                    borderBottomRightRadius: 10,
                                    marginBottom: 8,
                                }}>
                                    {step.key === "routing" && renderRouting()}
                                    {step.key === "responses" && renderResponses()}
                                    {step.key === "quote" && renderQuote()}
                                    {step.key === "validation" && renderValidation()}
                                    {step.key === "invoicing" && renderInvoicing()}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ─── Confirmation modal for individual send ─── */}
            {confirmSendConsultation && (
                <div
                    onClick={() => setConfirmSendConsultation(null)}
                    style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: C.white, borderRadius: 14, padding: "28px 28px 24px", maxWidth: 560, width: "92%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
                    >
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                            <Send size={16} /> Confirmer l&apos;envoi
                        </h3>
                        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>
                            Vous allez envoyer cette consultation par email.
                        </p>

                        {/* Supplier */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Fournisseur</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                                {confirmSendConsultation.supplier_name || confirmSendConsultation.supplier_id.slice(0, 12)}
                            </div>
                            {confirmSendConsultation.supplier_email && (
                                <div style={{ fontSize: 12, color: C.muted }}>{confirmSendConsultation.supplier_email}</div>
                            )}
                        </div>

                        {/* Matched products */}
                        {confirmSendConsultation.matched_products && confirmSendConsultation.matched_products.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Produits</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {confirmSendConsultation.matched_products.map((p: any, idx: number) => (
                                        <span key={idx} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "#fefce8", border: "1px solid #fef08a", color: C.dark }}>
                                            {p.name || p.product_name || p.label || JSON.stringify(p)}
                                            {p.quantity ? ` \u00d7 ${p.quantity}` : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Email preview */}
                        {(confirmSendConsultation.email_subject || confirmSendConsultation.email_body) && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Apercu email</div>
                                {confirmSendConsultation.email_subject && (
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>
                                        {confirmSendConsultation.email_subject}
                                    </div>
                                )}
                                {confirmSendConsultation.email_body && (
                                    <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "12px 14px", backgroundColor: "#fafaf8", borderRadius: 8, border: "1px solid " + C.border, maxHeight: 220, overflowY: "auto" }}>
                                        {confirmSendConsultation.email_body}
                                    </div>
                                )}
                            </div>
                        )}

                        {renderMsg("send_" + confirmSendConsultation.consultation_id)}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                            <button
                                onClick={() => setConfirmSendConsultation(null)}
                                style={{ padding: "9px 22px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    await sendOne(confirmSendConsultation.consultation_id)
                                    setConfirmSendConsultation(null)
                                }}
                                disabled={loading["send_" + confirmSendConsultation.consultation_id]}
                                style={{
                                    padding: "9px 22px", borderRadius: 8, border: "none",
                                    backgroundColor: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    opacity: loading["send_" + confirmSendConsultation.consultation_id] ? 0.6 : 1,
                                }}
                            >
                                {loading["send_" + confirmSendConsultation.consultation_id]
                                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Envoi...</>
                                    : <><Send size={14} /> Confirmer l&apos;envoi</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Confirmation modal for send all ─── */}
            {confirmSendAll && (() => {
                const drafts = consultations.filter((c) => c.status === "draft")
                return (
                    <div
                        onClick={() => setConfirmSendAll(false)}
                        style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: C.white, borderRadius: 14, padding: "28px 28px 24px", maxWidth: 640, width: "92%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
                        >
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                                <Send size={16} /> Envoyer {drafts.length} consultation{drafts.length > 1 ? "s" : ""}
                            </h3>
                            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>
                                Les emails suivants seront envoyés aux fournisseurs.
                            </p>

                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                                {drafts.map((c) => (
                                    <div key={c.consultation_id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid " + C.border, backgroundColor: "#fafaf8" }}>
                                        {/* Supplier */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                                                    {c.supplier_name || c.supplier_id.slice(0, 12)}
                                                </div>
                                                {c.supplier_email && (
                                                    <div style={{ fontSize: 12, color: C.muted }}>{c.supplier_email}</div>
                                                )}
                                            </div>
                                            {renderConsultationStatus(c.status)}
                                        </div>

                                        {/* Matched products */}
                                        {c.matched_products && c.matched_products.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                                                {c.matched_products.map((p: any, idx: number) => (
                                                    <span key={idx} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: "#fefce8", border: "1px solid #fef08a", color: C.dark }}>
                                                        {p.name || p.product_name || p.label || JSON.stringify(p)}
                                                        {p.quantity ? ` \u00d7 ${p.quantity}` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Email preview */}
                                        {c.email_subject && (
                                            <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 4 }}>{c.email_subject}</div>
                                        )}
                                        {c.email_body && (
                                            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 80, overflowY: "auto", padding: "6px 10px", backgroundColor: C.white, borderRadius: 6, border: "1px solid " + C.border }}>
                                                {c.email_body}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {renderMsg("sendAll")}

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                                <button
                                    onClick={() => setConfirmSendAll(false)}
                                    style={{ padding: "9px 22px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        await sendAll()
                                        setConfirmSendAll(false)
                                    }}
                                    disabled={loading["sendAll"]}
                                    style={{
                                        padding: "9px 22px", borderRadius: 8, border: "none",
                                        backgroundColor: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer",
                                        display: "inline-flex", alignItems: "center", gap: 6,
                                        opacity: loading["sendAll"] ? 0.6 : 1,
                                    }}
                                >
                                    {loading["sendAll"]
                                        ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Envoi...</>
                                        : <><Send size={14} /> Confirmer l&apos;envoi ({drafts.length})</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
