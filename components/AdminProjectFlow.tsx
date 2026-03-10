"use client"

import * as React from "react"
import { API_URL } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { formatPrice, formatDate, formatDateShort } from "@/lib/format"
import {
    Route, MessageSquare, FileText, CheckSquare, CreditCard,
    Send, RefreshCw, ChevronDown, ChevronUp, Bell, Download,
    Check, X, Clock, Loader2, Plus, Trash2, Layers, AlertTriangle, Brain, Eye, CheckCircle
} from "lucide-react"
import PdfViewerModal from "@/components/ui/PdfViewerModal"

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
    supplier_trade?: string
    supplier_category?: string
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

interface Quote {
    quote_number: string
    version: number
    validated: boolean
    quote_url: string
    created_at?: string
    generated_at?: string
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
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [confirmValidateQuote, setConfirmValidateQuote] = useState<Quote | null>(null)

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
    const [pdfModal, setPdfModal] = useState<{ url: string; title: string } | null>(null)
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

    function setMsg(key: string, type: "ok" | "err", text: string, persistent?: boolean) {
        setMessages((p) => ({ ...p, [key]: { type, text } }))
        if (type === "ok" && !persistent) setTimeout(() => setMessages((p) => { const n = { ...p }; delete n[key]; return n }), 4000)
    }

    function setLoad(key: string, v: boolean) {
        setLoading((p) => ({ ...p, [key]: v }))
    }

    /* ─────── data fetching ─────── */
    const fetchConsultations = useCallback(async () => {
        try {
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${projectId}`)
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
    }, [projectId])

    const fetchValidations = useCallback(async () => {
        try {
            const r = await fetchWithAuth(`${API_URL}/api/quote-validation/project/${projectId}`)
            const data = await r.json()
            if (data.ok) setValidations(data.validations || [])
        } catch { /* silent */ }
    }, [projectId])

    const fetchQuotes = useCallback(async () => {
        try {
            const r = await fetchWithAuth(`${API_URL}/api/project/${projectId}`)
            const data = await r.json()
            if (data.ok && data.project?.quotes) {
                setQuotes(data.project.quotes)
            }
        } catch { /* silent */ }
    }, [projectId])

    useEffect(() => {
        fetchConsultations()
        fetchValidations()
        fetchQuotes()
    }, [fetchConsultations, fetchValidations, fetchQuotes])

    /* ─────── actions ─────── */
    async function routeSuppliers() {
        setLoad("route", true)
        try {
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${projectId}/route`, { method: "POST" })
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
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${projectId}/send-all`, { method: "POST" })
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
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${consultationId}/send`, { method: "POST" })
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
            const r = await fetchWithAuth(`${API_URL}/api/reminders/send-one/${consultationId}`, { method: "POST" })
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
            const r = await fetchWithAuth(`${API_URL}/api/project/${projectId}/generate-quote`, { method: "POST" })
            const data = await r.json()
            if (data.ok) {
                setMsg("quote", "ok", `Devis ${data.quote_number} genere`, true)
                await fetchQuotes()
            } else {
                setMsg("quote", "err", data.error || "Erreur generation devis")
            }
        } catch { setMsg("quote", "err", "Erreur reseau") }
        setLoad("quote", false)
    }

    async function validateQuote(quote: Quote) {
        setLoad("validate_quote", true)
        try {
            const r = await fetchWithAuth(`${API_URL}/api/project/${projectId}/validate-quote`, {
                method: "POST",
                body: JSON.stringify({ quote_number: quote.quote_number }),
            })
            const data = await r.json()
            if (data.ok) {
                setMsg("quote", "ok", `Devis ${quote.quote_number} valide`, true)
                await fetchQuotes()
            } else {
                setMsg("quote", "err", data.error || "Erreur validation devis")
            }
        } catch { setMsg("quote", "err", "Erreur reseau") }
        setLoad("validate_quote", false)
        setConfirmValidateQuote(null)
    }

    async function generateInvoice() {
        const validItems = lineItems.filter((li) => li.description.trim() && li.quantity > 0 && li.unit_price > 0)
        if (validItems.length === 0) {
            setMsg("invoice", "err", "Ajoutez au moins une ligne valide")
            return
        }
        setLoad("invoice", true)
        try {
            const r = await fetchWithAuth(`${API_URL}/api/invoice/generate`, {
                method: "POST",
                body: JSON.stringify({
                    project_id: projectId,
                    line_items: validItems,
                    due_days: dueDays,
                }),
            })
            const data = await r.json()
            if (data.ok) {
                setInvoiceResult(data)
                setMsg("invoice", "ok", `Facture ${data.invoice?.invoice_number} generee`, true)
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
            const r = await fetchWithAuth(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
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
            const r = await fetchWithAuth(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
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
            const r = await fetchWithAuth(`${API_URL}/api/consultation/${consultationId}/admin-reply`, {
                method: "POST",
                body: JSON.stringify({ reply_message: aiReplyDraft.trim() }),
            })
            const data = await r.json()
            if (data.ok) {
                setMsg("reply_" + consultationId, "ok", "Réponse envoyée")
                setAiReplyDraft("")
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
            const r = await fetchWithAuth(`${API_URL}/api/ai/project-assistant`, {
                method: "POST",
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

    function renderInlineAI(sel: Consultation) {
        return (
            <div className="mt-4 px-4 py-3.5 bg-[#FAFFFD] rounded-[10px] border border-[#e0e0de]">
                <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-2 flex items-center gap-1.5">
                    <Brain size={12} /> Assistant IA
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                    {AI_SHORTCUTS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                const ctx = s.prompt + (sel.email_body || "") + (sel.reply_message ? `\nRéponse fournisseur : ${sel.reply_message}` : "")
                                setInlineAiInput(ctx)
                            }}
                            className="py-1 px-2.5 rounded-[5px] text-[11px] font-semibold border border-[#e0e0de] bg-[#f0f0ee] text-black cursor-pointer whitespace-nowrap"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={inlineAiInput}
                        onChange={(e) => setInlineAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") askInlineAI(sel) }}
                        placeholder="Poser une question sur cette consultation..."
                        className="flex-1 py-2 px-3 text-xs border border-[#e0e0de] rounded-md text-black outline-none"
                    />
                    <button
                        onClick={() => askInlineAI(sel)}
                        disabled={inlineAiLoading || !inlineAiInput.trim()}
                        className={`py-2 px-3.5 rounded-md text-xs font-semibold border-none bg-[#F4CF15] text-black inline-flex items-center gap-[5px] ${inlineAiLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100"}`}
                    >
                        {inlineAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {inlineAiLoading ? "..." : "Demander"}
                    </button>
                </div>
                {inlineAiReply && (
                    <div className="mt-2.5 text-xs text-black leading-relaxed whitespace-pre-wrap py-2.5 px-3 bg-[#fafaf8] rounded-lg border border-[#e0e0de] max-h-[200px] overflow-y-auto">
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
    const stepBorderClass = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "border-[#22c55e]"
        if (state === "active") return "border-[#F4CF15]"
        return "border-[#e0e0de]"
    }

    const stepBgClass = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "bg-[#f0fdf4]"
        if (state === "active") return "bg-[#fefce8]"
        return "bg-[#fafafa]"
    }

    const stepIconColor = (state: "completed" | "active" | "future") => {
        if (state === "completed") return "#22c55e"
        if (state === "active") return "#b89a00"
        return "#7a8080"
    }

    function renderMsg(key: string) {
        const m = messages[key]
        if (!m) return null
        return (
            <div className={`mt-2 py-2 px-3 rounded-md text-xs font-medium border ${m.type === "ok" ? "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]" : "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]"}`}>
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
                className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-lg text-[13px] font-semibold text-black ${isPrimary ? "border-none bg-[#F4CF15]" : "border border-[#e0e0de] bg-[#FAFFFD]"} ${isLoading || disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"}`}
            >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : icon}
                {label}
            </button>
        )
    }

    /* ─────── step content renderers ─────── */
    function renderProductionPlan() {
        const plan = briefAnalysis?.production_plan
        if (!plan) return null
        return (
            <div className="mb-4 p-4 rounded-[10px] bg-[#fefce8] border border-[#fef08a]">
                <div className="flex items-center gap-1.5 mb-2">
                    <Route size={14} color="#b89a00" />
                    <span className="text-[13px] font-bold text-black">L&apos;IA recommande ce plan de production :</span>
                </div>
                <div className="text-xs text-[#7a8080] mb-3">{plan.total_lots} lot(s)</div>
                <div className="flex flex-col gap-2">
                    {plan.lots?.map((lot: any) => (
                        <div key={lot.lot_number} className={`py-2.5 px-3 rounded-lg bg-[#FAFFFD] border-l-[3px] ${lot.is_amalgame ? "border-l-[#F4CF15]" : "border-l-[#e0e0de]"}`}>
                            <div className="flex justify-between items-center flex-wrap gap-1.5 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-bold text-black">Lot {lot.lot_number}</span>
                                    {lot.recommended_supplier && (
                                        <span className="text-[10px] font-semibold text-[#FAFFFD] bg-black px-1.5 py-px rounded">
                                            {lot.recommended_supplier}
                                        </span>
                                    )}
                                    {lot.is_amalgame && (
                                        <span className="inline-flex items-center gap-[3px] text-[10px] font-semibold text-black bg-[#F4CF15] px-1.5 py-px rounded">
                                            <Layers size={10} /> Amalgame
                                        </span>
                                    )}
                                </div>
                                {lot.estimated_delay_days != null && (
                                    <span className="text-[11px] text-[#7a8080]">{lot.estimated_delay_days}j</span>
                                )}
                            </div>
                            {lot.products?.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs text-black py-0.5">
                                    <span>{p.name} {p.quantity ? `× ${p.quantity}` : ""}</span>
                                    {p.estimated_price_ht != null && <span className="font-semibold">{formatPrice(p.estimated_price_ht)} HT</span>}
                                </div>
                            ))}
                            {lot.total_estimated_ht != null && (
                                <div className="text-right text-xs font-bold text-black mt-1 pt-1 border-t border-[#e0e0de]">
                                    {formatPrice(lot.total_estimated_ht)} HT
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {plan.total_estimated_ht != null && (
                    <div className="text-right text-sm font-bold text-black mt-2.5">
                        Total estimé : {formatPrice(plan.total_estimated_ht)} HT
                    </div>
                )}
                {plan.optimization_notes && (
                    <div className="text-xs text-[#7a8080] mt-2">{plan.optimization_notes}</div>
                )}
                {plan.risks?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {plan.risks.map((risk: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-[3px] text-[11px] font-semibold text-[#e67e22] bg-[rgba(230,126,34,0.1)] py-[3px] px-2 rounded">
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
                <div className="flex gap-2.5 flex-wrap mb-3">
                    {renderBtn("Lancer le routage IA", routeSuppliers, "route", <Route size={14} />)}
                    {consultations.length > 0 && renderBtn(`Envoyer tout (${draftCount})`, () => setConfirmSendAll(true), "sendAll", <Send size={14} />, "secondary", draftCount === 0)}
                </div>
                {renderMsg("route")}
                {renderMsg("sendAll")}
                {consultations.length > 0 && (
                    <div className="mt-3">
                        <div className="text-xs font-semibold text-[#7a8080] mb-2.5 uppercase tracking-[0.5px]">
                            {consultations.length} fournisseur(s) routé(s)
                        </div>
                        <div className="flex border border-[#e0e0de] rounded-[10px] overflow-hidden min-h-[280px]">
                            {/* Left: supplier list (40%) */}
                            <div className="w-[40%] border-r border-[#e0e0de] overflow-y-auto max-h-[500px]">
                                {consultations.map((c) => {
                                    const isSelected = expandedConsultation === c.consultation_id
                                    return (
                                        <div
                                            key={c.consultation_id}
                                            onClick={() => { setExpandedConsultation(isSelected ? null : c.consultation_id); setAiReplyDraft(""); setInlineAiReply(""); setInlineAiInput("") }}
                                            className={`py-3 px-3.5 cursor-pointer border-b border-[#f0f0ee] border-l-[3px] ${isSelected ? "bg-[#fafaf8] border-l-[#F4CF15]" : "bg-[#FAFFFD] border-l-transparent"}`}
                                        >
                                            {renderSupplierListItem(c)}
                                            <div className="flex items-center gap-2">
                                                {renderConsultationStatus(c.status)}
                                                {c.status === "draft" && (
                                                    <span onClick={(e) => { e.stopPropagation(); setConfirmSendConsultation(c) }} className="text-[11px] font-semibold text-[#F4CF15] cursor-pointer">
                                                        Envoyer
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Right: detail panel (60%) */}
                            <div className="w-[60%] py-4 px-5 overflow-y-auto max-h-[500px] bg-[#fafaf8]">
                                {(() => {
                                    const sel = consultations.find((c) => c.consultation_id === expandedConsultation)
                                    if (!sel) return (
                                        <div className="flex items-center justify-center h-full text-[#7a8080] text-[13px]">
                                            Sélectionnez un fournisseur
                                        </div>
                                    )
                                    return (
                                        <>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="text-[15px] font-bold text-black">
                                                    {sel.supplier_name || sel.supplier_id.slice(0, 10)}
                                                </div>
                                                {renderConsultationStatus(sel.status)}
                                            </div>
                                            {renderDetailGrid(sel)}
                                            {renderMatchedProducts(sel)}
                                            {sel.email_subject && (
                                                <div className="mb-3.5">
                                                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Objet du message</div>
                                                    <div className="text-[13px] text-black">{sel.email_subject}</div>
                                                </div>
                                            )}
                                            {sel.email_body && (
                                                <div className="mb-3.5">
                                                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Message envoyé</div>
                                                    <div className="text-xs text-black leading-relaxed whitespace-pre-wrap py-2.5 px-3 bg-[#FAFFFD] rounded-lg border border-[#e0e0de] max-h-[200px] overflow-y-auto">
                                                        {sel.email_body}
                                                    </div>
                                                </div>
                                            )}
                                            {sel.reply_message && renderReplySection(sel)}
                                            {!sel.email_subject && !sel.email_body && !sel.matched_products?.length && !sel.reply_message && (
                                                <div className="text-[13px] text-[#7a8080] italic">Aucun détail disponible pour cette consultation.</div>
                                            )}
                                            {renderInlineAI(sel)}
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

    function renderDetailGrid(sel: Consultation) {
        return (
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-4">
                <div>
                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Date d&apos;envoi</div>
                    <div className="text-[13px] text-black">{sel.sent_at ? formatDate(sel.sent_at) : "—"}</div>
                </div>
                <div>
                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Date de réponse</div>
                    <div className="text-[13px] text-black">{sel.responded_at ? formatDate(sel.responded_at) : "—"}</div>
                </div>
                {sel.response_price != null && (
                    <div>
                        <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Prix proposé</div>
                        <div className="text-[13px] font-semibold text-black">{formatPrice(sel.response_price)}</div>
                    </div>
                )}
                {sel.response_delay && (
                    <div>
                        <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Délai proposé</div>
                        <div className="text-[13px] text-black">{sel.response_delay}</div>
                    </div>
                )}
                <div>
                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Jours depuis l&apos;envoi</div>
                    <div className="text-[13px] text-black">
                        {sel.sent_at ? Math.max(0, Math.floor((Date.now() - new Date(sel.sent_at).getTime()) / 86400000)) + " j" : "—"}
                    </div>
                </div>
                <div>
                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Relances envoyées</div>
                    <div className="text-[13px] text-black">{sel.reminders_count ?? 0}</div>
                </div>
            </div>
        )
    }

    function renderMatchedProducts(sel: Consultation) {
        if (!sel.matched_products || sel.matched_products.length === 0) return null
        return (
            <div className="mb-3.5">
                <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Produits matchés</div>
                <div className="flex flex-wrap gap-1.5">
                    {sel.matched_products.map((p: any, idx: number) => (
                        <span key={idx} className="py-[3px] px-2.5 rounded-md text-xs font-medium bg-[#FAFFFD] border border-[#e0e0de] text-black">
                            {p.name || p.product_name || p.label || JSON.stringify(p)}
                            {p.quantity ? ` × ${p.quantity}` : ""}
                        </span>
                    ))}
                </div>
            </div>
        )
    }

    function renderReplySection(sel: Consultation) {
        return (
            <div className="mb-3.5">
                <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Réponse reçue</div>
                <div className="text-xs text-black leading-relaxed whitespace-pre-wrap py-2.5 px-3 bg-[#f0faf0] rounded-lg border border-[#c6e6c6] max-h-[200px] overflow-y-auto">
                    {sel.reply_message}
                </div>
                <div className="mt-2.5">
                    <button
                        onClick={() => generateAIReply(sel)}
                        disabled={aiReplyGenerating}
                        className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-md text-xs font-semibold border border-[#e0e0de] text-black ${aiReplyGenerating ? "bg-[#fef9e0] cursor-not-allowed" : "bg-[#FAFFFD] cursor-pointer"}`}
                    >
                        {aiReplyGenerating ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                        {aiReplyGenerating ? "Génération..." : "Générer une réponse IA"}
                    </button>
                </div>
                {aiReplyDraft && (
                    <div className="mt-2.5">
                        <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Réponse à envoyer</div>
                        <textarea
                            value={aiReplyDraft}
                            onChange={(e) => setAiReplyDraft(e.target.value)}
                            rows={6}
                            className="w-full py-2.5 px-3 text-xs leading-relaxed border border-[#e0e0de] rounded-lg text-black resize-y outline-none box-border"
                        />
                        <button
                            onClick={() => sendAdminReply(sel.consultation_id)}
                            disabled={aiReplySending || !aiReplyDraft.trim()}
                            className={`mt-2 inline-flex items-center gap-1.5 py-2 px-4 rounded-md text-xs font-semibold border-none bg-[#F4CF15] text-black ${aiReplySending ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100"}`}
                        >
                            {aiReplySending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            {aiReplySending ? "Envoi..." : "Envoyer cette réponse"}
                        </button>
                    </div>
                )}
                {renderMsg("reply_" + sel.consultation_id)}
            </div>
        )
    }

    function renderSupplierListItem(c: Consultation) {
        const name = c.supplier_name || c.supplier_id
        const trade = c.supplier_trade || c.supplier_category
        return (
            <>
                <div className="font-semibold text-[13px] text-black mb-0.5">{name}</div>
                {trade && <div className="text-[11px] text-[#7a8080] mb-0.5">{trade}</div>}
                {c.supplier_email && <div className="text-[10px] text-[#7a8080] mb-1">{c.supplier_email}</div>}
                {c.matched_products && c.matched_products.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {c.matched_products.map((p: any, idx: number) => (
                            <span key={idx} className="px-1.5 py-px rounded text-[10px] font-medium bg-[#f0f0ee] border border-[#e0e0de] text-black">
                                {p.name || p.product_name || p.label || "Produit"}
                            </span>
                        ))}
                    </div>
                )}
            </>
        )
    }

    function renderConsultationStatus(status: string) {
        const cfg: Record<string, { label: string; bg: string; text: string }> = {
            draft: { label: "Brouillon", bg: "bg-[#fef9e0]", text: "text-[#b89a00]" },
            created: { label: "Cree", bg: "bg-[#f5f5f5]", text: "text-[#616161]" },
            pending: { label: "En attente", bg: "bg-[#fef9e0]", text: "text-[#b89a00]" },
            sent: { label: "Envoye", bg: "bg-[#e8f0fe]", text: "text-[#1a3c7a]" },
            responded: { label: "Repondu", bg: "bg-[#e8f8ee]", text: "text-[#1a7a3c]" },
            declined: { label: "Decline", bg: "bg-[#fef2f2]", text: "text-[#991b1b]" },
        }
        const c = cfg[status] || { label: status, bg: "bg-[#f5f5f5]", text: "text-[#616161]" }
        return (
            <span className={`inline-block py-[3px] px-2.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
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
                <div className="p-5 text-center text-[#7a8080] text-[13px]">
                    Aucune consultation trouvée. Lancez le routage en étape 1.
                </div>
            )
        }

        return (
            <div>
                <div className="flex gap-4 mb-3">
                    <div className="text-[13px] text-black">
                        <span className="font-semibold">{responded.length}</span> réponse(s)
                    </div>
                    <div className="text-[13px] text-[#7a8080]">
                        <span className="font-semibold">{pending.length}</span> en attente
                    </div>
                </div>

                <div className="flex border border-[#e0e0de] rounded-[10px] overflow-hidden min-h-[280px]">
                    {/* Left: supplier list (40%) */}
                    <div className="w-[40%] border-r border-[#e0e0de] overflow-y-auto max-h-[500px]">
                        {allForPanel.map((c) => {
                            const isSelected = expandedConsultation === c.consultation_id
                            const hasReplied = c.status === "responded" || c.status === "replied" || c.reply_message != null
                            return (
                                <div
                                    key={c.consultation_id}
                                    onClick={() => { setExpandedConsultation(isSelected ? null : c.consultation_id); setAiReplyDraft(""); setInlineAiReply(""); setInlineAiInput("") }}
                                    className={`py-3 px-3.5 cursor-pointer border-b border-[#f0f0ee] border-l-[3px] ${isSelected ? "bg-[#fafaf8] border-l-[#F4CF15]" : "bg-[#FAFFFD] border-l-transparent"}`}
                                >
                                    <div className={hasReplied ? "opacity-100" : "opacity-60"}>
                                        {renderSupplierListItem(c)}
                                        <div className="flex items-center gap-2">
                                            {renderConsultationStatus(c.status)}
                                        </div>
                                    </div>
                                    {c.status !== "replied" && c.status !== "responded" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                sendReminder(c.consultation_id)
                                                setMsg("reminder_" + c.consultation_id, "ok", "Relance envoyée")
                                            }}
                                            className="mt-1.5 inline-flex items-center gap-1 py-1 px-2.5 rounded-[5px] text-[11px] font-semibold border border-[#e8d88e] bg-[#fef9e0] text-[#b89a00] cursor-pointer"
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
                    <div className="w-[60%] py-4 px-5 overflow-y-auto max-h-[500px] bg-[#fafaf8]">
                        {(() => {
                            const sel = allForPanel.find((c) => c.consultation_id === expandedConsultation)
                            if (!sel) return (
                                <div className="flex items-center justify-center h-full text-[#7a8080] text-[13px]">
                                    Sélectionnez un fournisseur
                                </div>
                            )
                            const hasReplied = sel.status === "responded" || sel.status === "replied" || sel.reply_message != null
                            return (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-[15px] font-bold text-black">
                                            {sel.supplier_name || sel.supplier_id.slice(0, 10)}
                                        </div>
                                        {renderConsultationStatus(sel.status)}
                                    </div>
                                    {renderDetailGrid(sel)}

                                    {/* Supplier reply */}
                                    {hasReplied && sel.reply_message ? (
                                        renderReplySection(sel)
                                    ) : hasReplied ? (
                                        <div className="p-4 text-center text-[#7a8080] text-[13px] italic">
                                            Ce fournisseur a répondu mais aucun message n&apos;est disponible.
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-[#7a8080] text-[13px] italic">
                                            En attente de réponse de ce fournisseur.
                                        </div>
                                    )}
                                    {renderInlineAI(sel)}

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
        const sortedQuotes = [...quotes].sort((a, b) => b.version - a.version)

        return (
            <div>
                <div className="flex gap-2.5 items-center flex-wrap">
                    {renderBtn(
                        quotes.length === 0 ? "Generer le devis client" : "Generer une nouvelle version",
                        generateQuote,
                        "quote",
                        quotes.length === 0 ? <FileText size={14} /> : <RefreshCw size={14} />,
                    )}
                </div>
                {renderMsg("quote")}

                {/* Liste des versions */}
                {sortedQuotes.length > 0 && (
                    <div className="mt-3.5 flex flex-col gap-2">
                        {sortedQuotes.map((q) => (
                            <div
                                key={q.quote_number}
                                className={`flex items-center gap-2.5 flex-wrap py-2.5 px-3.5 rounded-lg border ${q.validated ? "border-[#bbf7d0] bg-[#f0fdf4]" : "border-[#e0e0de] bg-[#FAFFFD]"}`}
                            >
                                <span className="text-[13px] font-semibold text-black">
                                    Version {q.version} — {q.quote_number}
                                </span>
                                <span className="text-xs text-[#7a8080]">
                                    — {formatDateShort(q.generated_at || q.created_at || "")}
                                </span>
                                <span className={`py-0.5 px-2.5 rounded-full text-[11px] font-semibold ${q.validated ? "bg-[#e8f8ee] text-[#166534]" : "bg-[#f5f5f5] text-[#616161]"}`}>
                                    {q.validated ? (
                                        <><CheckCircle size={11} className="inline align-middle mr-1" />Valide</>
                                    ) : (
                                        <><Clock size={11} className="inline align-middle mr-1" />En attente</>
                                    )}
                                </span>
                                <div className="ml-auto flex gap-1.5">
                                    <button
                                        onClick={() => setPdfModal({ url: q.quote_url, title: `Devis ${q.quote_number}` })}
                                        className="inline-flex items-center gap-1 py-[5px] px-3 rounded-md text-xs font-semibold border border-[#e0e0de] bg-[#FAFFFD] text-black cursor-pointer"
                                    >
                                        <Eye size={13} />
                                        Voir
                                    </button>
                                    {!q.validated && (
                                        <button
                                            onClick={() => setConfirmValidateQuote(q)}
                                            className="inline-flex items-center gap-1 py-[5px] px-3 rounded-md text-xs font-semibold border-none bg-[#166534] text-white cursor-pointer"
                                        >
                                            <Check size={13} />
                                            Valider ce devis
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modale confirmation validation */}
                {confirmValidateQuote && (
                    <>
                        <div onClick={() => setConfirmValidateQuote(null)} className="fixed inset-0 z-[1500] bg-black/40" />
                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1501] bg-[#FAFFFD] rounded-xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)] max-w-[420px] w-[90vw] font-[Inter,sans-serif]">
                            <div className="text-[15px] font-semibold text-black mb-3">
                                Confirmer la validation
                            </div>
                            <div className="text-[13px] text-[#7a8080] mb-5">
                                Confirmer la validation du devis <strong>{confirmValidateQuote.quote_number}</strong> ?
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setConfirmValidateQuote(null)}
                                    className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e0e0de] bg-[#FAFFFD] text-black cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => validateQuote(confirmValidateQuote)}
                                    disabled={loading["validate_quote"]}
                                    className={`py-2 px-4 rounded-lg text-[13px] font-semibold border-none bg-[#166534] text-white ${loading["validate_quote"] ? "cursor-wait opacity-70" : "cursor-pointer opacity-100"}`}
                                >
                                    {loading["validate_quote"] ? (
                                        <><Loader2 size={13} className="inline align-middle mr-1 animate-spin" />Validation...</>
                                    ) : (
                                        <><Check size={13} className="inline align-middle mr-1" />Confirmer</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }

    function renderValidation() {
        const lastValidated = [...quotes].filter(q => q.validated).sort((a, b) => b.version - a.version)[0]

        return (
            <div>
                {lastValidated ? (
                    <div className="mb-3.5 py-2.5 px-3.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[13px] text-[#166534]">
                        <CheckCircle size={14} className="inline align-middle mr-1.5" />
                        Devis <strong>{lastValidated.quote_number}</strong> valide par l&apos;admin.
                    </div>
                ) : (
                    <div className="mb-3.5 py-2.5 px-3.5 rounded-lg bg-[#fef9e0] border border-[#fde68a] text-[13px] text-[#b89a00]">
                        <Clock size={14} className="inline align-middle mr-1.5" />
                        Aucun devis valide. Validez un devis dans l&apos;etape precedente.
                    </div>
                )}
                {renderBtn(
                    "Simuler validation client",
                    async () => {
                        const target = lastValidated || quotes[0]
                        if (!target) {
                            setMsg("validation", "err", "Aucun devis disponible")
                            return
                        }
                        setLoad("validation", true)
                        try {
                            const r = await fetchWithAuth(`${API_URL}/api/project/${projectId}/validate-quote`, {
                                method: "POST",
                                body: JSON.stringify({ quote_number: target.quote_number }),
                            })
                            const data = await r.json()
                            if (data.ok) {
                                setMsg("validation", "ok", "Validation client simulee")
                                await fetchQuotes()
                            } else {
                                setMsg("validation", "err", data.error || "Erreur validation")
                            }
                        } catch { setMsg("validation", "err", "Erreur reseau") }
                        setLoad("validation", false)
                    },
                    "validation",
                    <CheckSquare size={14} />,
                )}
                {renderMsg("validation")}
            </div>
        )
    }

    function renderDecisionBadge(decision: string) {
        if (decision === "accepted") return <span className="text-[#166534] font-semibold text-xs"><Check size={13} className="inline align-middle mr-0.5" />Accepte</span>
        if (decision === "rejected") return <span className="text-[#991b1b] font-semibold text-xs"><X size={13} className="inline align-middle mr-0.5" />Refuse</span>
        return <span className="text-[#7a8080] text-xs"><Clock size={13} className="inline align-middle mr-0.5" />En attente</span>
    }

    function renderFinalStatus(status: string) {
        const cfg: Record<string, { label: string; bg: string; text: string }> = {
            accepted: { label: "Accepte", bg: "bg-[#e8f8ee]", text: "text-[#1a7a3c]" },
            rejected: { label: "Refuse", bg: "bg-[#fef2f2]", text: "text-[#991b1b]" },
            pending: { label: "En cours", bg: "bg-[#fef9e0]", text: "text-[#b89a00]" },
        }
        const c = cfg[status] || { label: status, bg: "bg-[#f5f5f5]", text: "text-[#616161]" }
        return <span className={`py-[3px] px-2.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>{c.label}</span>
    }

    function renderInvoicing() {
        if (invoiceResult) {
            return (
                <div>
                    <div className="py-3.5 px-4 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] mb-3">
                        <div className="text-sm font-semibold text-[#166534] mb-1">
                            <Check size={15} className="inline align-middle mr-1.5" />
                            Facture {invoiceResult.invoice?.invoice_number} generee
                        </div>
                        <div className="text-[13px] text-[#166534]">
                            Total : {formatPrice(invoiceResult.invoice?.total || 0)}
                            {invoiceResult.invoice?.payment_type === "split" && (
                                <span> — Acompte : {formatPrice(invoiceResult.invoice?.deposit_amount || 0)}</span>
                            )}
                        </div>
                    </div>
                    {invoiceResult.pdf_url && (
                        <button
                            onClick={() => setPdfModal({ url: invoiceResult.pdf_url!, title: `Facture ${invoiceResult.invoice?.invoice_number || ""}` })}
                            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e0e0de] bg-[#FAFFFD] text-black cursor-pointer"
                        >
                            <Eye size={14} />
                            Voir la facture PDF
                        </button>
                    )}
                </div>
            )
        }

        const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0)

        return (
            <div>
                {/* Line items */}
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-semibold text-[#7a8080] uppercase tracking-[0.5px]">
                        Lignes de facturation
                    </div>
                    <button
                        onClick={generateLinesViaAI}
                        disabled={aiGeneratingLines}
                        className={`inline-flex items-center gap-[5px] py-[5px] px-3 rounded-md text-[11px] font-semibold border border-[#e0e0de] text-black ${aiGeneratingLines ? "bg-[#fef9e0] cursor-not-allowed opacity-70" : "bg-[#FAFFFD] cursor-pointer opacity-100"}`}
                    >
                        {aiGeneratingLines ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                        {aiGeneratingLines ? "Generation..." : "Generer les lignes via IA"}
                    </button>
                </div>
                {lineItems.map((li, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center flex-wrap">
                        <input
                            value={li.description}
                            onChange={(e) => updateLine(idx, "description", e.target.value)}
                            placeholder="Description"
                            className="flex-[2] min-w-[160px] py-2 px-3 border border-[#e0e0de] rounded-md text-[13px] text-black outline-none"
                        />
                        <input
                            type="number"
                            value={li.quantity}
                            onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                            placeholder="Qte"
                            min={1}
                            className="w-[70px] py-2 px-2.5 border border-[#e0e0de] rounded-md text-[13px] text-black outline-none text-center"
                        />
                        <input
                            type="number"
                            value={li.unit_price}
                            onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))}
                            placeholder="PU HT"
                            min={0}
                            step={0.01}
                            className="w-[100px] py-2 px-2.5 border border-[#e0e0de] rounded-md text-[13px] text-black outline-none text-right"
                        />
                        <div className="text-[13px] font-semibold text-black w-20 text-right">
                            {formatPrice(li.quantity * li.unit_price)}
                        </div>
                        {lineItems.length > 1 && (
                            <button onClick={() => removeLine(idx)} className="bg-transparent border-none cursor-pointer text-[#991b1b] p-1">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={addLine}
                    className="inline-flex items-center gap-1 py-1.5 px-3 border border-dashed border-[#e0e0de] rounded-md bg-transparent text-xs text-[#7a8080] cursor-pointer mb-4"
                >
                    <Plus size={13} /> Ajouter une ligne
                </button>

                {/* Subtotal */}
                <div className="flex justify-end mb-4">
                    <div className="text-sm font-semibold text-black">
                        Sous-total HT : {formatPrice(subtotal)}
                    </div>
                </div>

                {/* Due days */}
                <div className="flex items-center gap-1.5 mb-4">
                    <label className="text-xs text-[#7a8080]">Echeance :</label>
                    <select
                        value={dueDays}
                        onChange={(e) => setDueDays(Number(e.target.value))}
                        className="py-1.5 px-2.5 border border-[#e0e0de] rounded-md text-[13px] text-black outline-none"
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
        <div className="font-[Inter,sans-serif]">
            <div className="flex flex-col">
                {STEPS.map((step, idx) => {
                    const state = stepState(idx)
                    const Icon = step.icon
                    const isExpanded = expandedStep === step.key

                    return (
                        <div key={step.key} className="relative">
                            {/* Connector line */}
                            {idx > 0 && (
                                <div className={`absolute -top-2 left-[22px] w-0.5 h-2 ${stepState(idx - 1) === "completed" ? "bg-[#22c55e]" : "bg-[#e0e0de]"}`} />
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
                                    if (next) { setTimeout(() => { const el = stepRefs.current[next]; if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }) } }, 100) }
                                }}
                                className={`flex items-center gap-3 py-3.5 px-4 rounded-[10px] border-[1.5px] cursor-pointer transition-colors duration-200 ${stepBgClass(state)} ${stepBorderClass(state)} ${isExpanded ? "mb-0 rounded-b-none" : "mb-2"}`}
                            >
                                {/* Step number circle */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${state === "completed" ? "bg-[#22c55e] text-black" : state === "active" ? "bg-[#F4CF15] text-black" : "bg-[#e5e5e5] text-[#7a8080]"}`}>
                                    {state === "completed" ? <Check size={16} color="#fff" /> : idx + 1}
                                </div>

                                <Icon size={18} color={stepIconColor(state)} />

                                <div className="flex-1">
                                    <div className={`text-sm font-semibold ${state === "future" ? "text-[#7a8080]" : "text-black"}`}>
                                        {step.label}
                                    </div>
                                </div>

                                {isExpanded ? <ChevronUp size={16} color="#7a8080" /> : <ChevronDown size={16} color="#7a8080" />}
                            </div>

                            {/* Step content */}
                            {isExpanded && (
                                <div className={`py-4 px-5 bg-[#FAFFFD] border-[1.5px] border-t-0 rounded-b-[10px] mb-2 ${stepBorderClass(state)}`}>
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
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FAFFFD] rounded-[14px] pt-7 px-7 pb-6 max-w-[560px] w-[92%] max-h-[85vh] overflow-y-auto shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                    >
                        <h3 className="text-base font-bold text-black m-0 mb-1.5 flex items-center gap-2">
                            <Send size={16} /> Confirmer l&apos;envoi
                        </h3>
                        <p className="text-[13px] text-[#7a8080] m-0 mb-5">
                            Vous allez envoyer cette consultation par email.
                        </p>

                        {/* Supplier */}
                        <div className="mb-3.5">
                            <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1">Fournisseur</div>
                            <div className="text-sm font-semibold text-black">
                                {confirmSendConsultation.supplier_name || confirmSendConsultation.supplier_id.slice(0, 12)}
                            </div>
                            {confirmSendConsultation.supplier_email && (
                                <div className="text-xs text-[#7a8080]">{confirmSendConsultation.supplier_email}</div>
                            )}
                        </div>

                        {/* Matched products */}
                        {confirmSendConsultation.matched_products && confirmSendConsultation.matched_products.length > 0 && (
                            <div className="mb-3.5">
                                <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1.5">Produits</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {confirmSendConsultation.matched_products.map((p: any, idx: number) => (
                                        <span key={idx} className="py-1 px-2.5 rounded-md text-xs font-medium bg-[#fefce8] border border-[#fef08a] text-black">
                                            {p.name || p.product_name || p.label || JSON.stringify(p)}
                                            {p.quantity ? ` \u00d7 ${p.quantity}` : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Email preview */}
                        {(confirmSendConsultation.email_subject || confirmSendConsultation.email_body) && (
                            <div className="mb-5">
                                <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[0.5px] mb-1.5">Apercu email</div>
                                {confirmSendConsultation.email_subject && (
                                    <div className="text-[13px] font-semibold text-black mb-1.5">
                                        {confirmSendConsultation.email_subject}
                                    </div>
                                )}
                                {confirmSendConsultation.email_body && (
                                    <div className="text-xs text-black leading-relaxed whitespace-pre-wrap py-3 px-3.5 bg-[#fafaf8] rounded-lg border border-[#e0e0de] max-h-[220px] overflow-y-auto">
                                        {confirmSendConsultation.email_body}
                                    </div>
                                )}
                            </div>
                        )}

                        {renderMsg("send_" + confirmSendConsultation.consultation_id)}

                        {/* Actions */}
                        <div className="flex gap-2.5 justify-end mt-4">
                            <button
                                onClick={() => setConfirmSendConsultation(null)}
                                className="py-[9px] px-[22px] rounded-lg border border-[#e0e0de] bg-[#FAFFFD] text-black text-[13px] font-semibold cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    await sendOne(confirmSendConsultation.consultation_id)
                                    setConfirmSendConsultation(null)
                                }}
                                disabled={loading["send_" + confirmSendConsultation.consultation_id]}
                                className={`py-[9px] px-[22px] rounded-lg border-none bg-[#F4CF15] text-black text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 ${loading["send_" + confirmSendConsultation.consultation_id] ? "opacity-60" : "opacity-100"}`}
                            >
                                {loading["send_" + confirmSendConsultation.consultation_id]
                                    ? <><Loader2 size={14} className="animate-spin" /> Envoi...</>
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
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#FAFFFD] rounded-[14px] pt-7 px-7 pb-6 max-w-[640px] w-[92%] max-h-[85vh] overflow-y-auto shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                        >
                            <h3 className="text-base font-bold text-black m-0 mb-1.5 flex items-center gap-2">
                                <Send size={16} /> Envoyer {drafts.length} consultation{drafts.length > 1 ? "s" : ""}
                            </h3>
                            <p className="text-[13px] text-[#7a8080] m-0 mb-5">
                                Les emails suivants seront envoyés aux fournisseurs.
                            </p>

                            <div className="flex flex-col gap-3 mb-5">
                                {drafts.map((c) => (
                                    <div key={c.consultation_id} className="py-3.5 px-4 rounded-[10px] border border-[#e0e0de] bg-[#fafaf8]">
                                        {/* Supplier */}
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-sm font-semibold text-black">
                                                    {c.supplier_name || c.supplier_id.slice(0, 12)}
                                                </div>
                                                {c.supplier_email && (
                                                    <div className="text-xs text-[#7a8080]">{c.supplier_email}</div>
                                                )}
                                            </div>
                                            {renderConsultationStatus(c.status)}
                                        </div>

                                        {/* Matched products */}
                                        {c.matched_products && c.matched_products.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {c.matched_products.map((p: any, idx: number) => (
                                                    <span key={idx} className="py-0.5 px-2 rounded text-[11px] font-medium bg-[#fefce8] border border-[#fef08a] text-black">
                                                        {p.name || p.product_name || p.label || JSON.stringify(p)}
                                                        {p.quantity ? ` \u00d7 ${p.quantity}` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Email preview */}
                                        {c.email_subject && (
                                            <div className="text-xs font-semibold text-black mb-1">{c.email_subject}</div>
                                        )}
                                        {c.email_body && (
                                            <div className="text-[11px] text-[#7a8080] leading-normal whitespace-pre-wrap max-h-20 overflow-y-auto py-1.5 px-2.5 bg-[#FAFFFD] rounded-md border border-[#e0e0de]">
                                                {c.email_body}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {renderMsg("sendAll")}

                            {/* Actions */}
                            <div className="flex gap-2.5 justify-end mt-4">
                                <button
                                    onClick={() => setConfirmSendAll(false)}
                                    className="py-[9px] px-[22px] rounded-lg border border-[#e0e0de] bg-[#FAFFFD] text-black text-[13px] font-semibold cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        await sendAll()
                                        setConfirmSendAll(false)
                                    }}
                                    disabled={loading["sendAll"]}
                                    className={`py-[9px] px-[22px] rounded-lg border-none bg-[#F4CF15] text-black text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 ${loading["sendAll"] ? "opacity-60" : "opacity-100"}`}
                                >
                                    {loading["sendAll"]
                                        ? <><Loader2 size={14} className="animate-spin" /> Envoi...</>
                                        : <><Send size={14} /> Confirmer l&apos;envoi ({drafts.length})</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {pdfModal && (
                <PdfViewerModal
                    url={pdfModal.url}
                    isOpen={true}
                    onClose={() => setPdfModal(null)}
                    title={pdfModal.title}
                />
            )}
        </div>
    )
}
