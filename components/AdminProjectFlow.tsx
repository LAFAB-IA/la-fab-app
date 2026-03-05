"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { formatPrice, formatDate } from "@/lib/format"
import {
    Route, MessageSquare, FileText, CheckSquare, CreditCard,
    Send, RefreshCw, ChevronDown, ChevronUp, Bell, Download,
    Check, X, Clock, Loader2, Plus, Trash2
} from "lucide-react"

const { useState, useEffect, useCallback } = React

/* ─────── types ─────── */
interface Props {
    projectId: string
    projectStatus: string
    token: string
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
export default function AdminProjectFlow({ projectId, projectStatus, token }: Props) {
    const [expandedStep, setExpandedStep] = useState<StepKey | null>(null)
    const [consultations, setConsultations] = useState<Consultation[]>([])
    const [validations, setValidations] = useState<Validation[]>([])
    const [quoteUrl, setQuoteUrl] = useState<string | null>(null)
    const [quoteNumber, setQuoteNumber] = useState<string | null>(null)

    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [messages, setMessages] = useState<Record<string, { type: "ok" | "err"; text: string }>>({})

    /* invoice step state */
    const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }])
    const [paymentType, setPaymentType] = useState<"full" | "split">("full")
    const [dueDays, setDueDays] = useState(30)
    const [invoiceResult, setInvoiceResult] = useState<any>(null)

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
            if (data.ok) setConsultations(data.consultations || [])
        } catch { /* silent */ }
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
                setMsg("sendAll", "err", data.error || "Erreur envoi")
            }
        } catch { setMsg("sendAll", "err", "Erreur reseau") }
        setLoad("sendAll", false)
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
                    payment_type: paymentType,
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
    function renderRouting() {
        const pendingCount = consultations.filter((c) => c.status === "pending" || c.status === "created").length
        return (
            <div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {renderBtn("Lancer le routage", routeSuppliers, "route", <Route size={14} />)}
                    {consultations.length > 0 && renderBtn(`Envoyer tout (${pendingCount})`, sendAll, "sendAll", <Send size={14} />, "secondary", pendingCount === 0)}
                </div>
                {renderMsg("route")}
                {renderMsg("sendAll")}
                {consultations.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {consultations.length} fournisseur(s) route(s)
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr>
                                    {["Fournisseur", "Statut", "Envoye le"].map((h) => (
                                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: "1px solid " + C.border, textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {consultations.map((c) => (
                                    <tr key={c.consultation_id}>
                                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                            <div style={{ fontWeight: 500, color: C.dark }}>{c.supplier_name || c.supplier_id.slice(0, 10)}</div>
                                            {c.supplier_email && <div style={{ fontSize: 11, color: C.muted }}>{c.supplier_email}</div>}
                                        </td>
                                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                            {renderConsultationStatus(c.status)}
                                        </td>
                                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 12, color: C.muted }}>
                                            {c.sent_at ? formatDate(c.sent_at) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )
    }

    function renderConsultationStatus(status: string) {
        const cfg: Record<string, { label: string; bg: string; color: string }> = {
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
        const responded = consultations.filter((c) => c.status === "responded")
        const pending = consultations.filter((c) => c.status === "sent" || c.status === "pending")
        return (
            <div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: C.dark }}>
                        <span style={{ fontWeight: 600 }}>{responded.length}</span> reponse(s)
                    </div>
                    <div style={{ fontSize: 13, color: C.muted }}>
                        <span style={{ fontWeight: 600 }}>{pending.length}</span> en attente
                    </div>
                </div>

                {responded.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                        <thead>
                            <tr>
                                {["Fournisseur", "Prix propose", "Delai", "Repondu le"].map((h) => (
                                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: "1px solid " + C.border, textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {responded.map((c) => (
                                <tr key={c.consultation_id}>
                                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontWeight: 500, color: C.dark }}>
                                        {c.supplier_name || c.supplier_id.slice(0, 10)}
                                    </td>
                                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontWeight: 600, color: C.dark }}>
                                        {c.response_price ? formatPrice(c.response_price) : "—"}
                                    </td>
                                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", color: C.muted }}>
                                        {c.response_delay || "—"}
                                    </td>
                                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 12, color: C.muted }}>
                                        {c.responded_at ? formatDate(c.responded_at) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {pending.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Relancer les fournisseurs en attente
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {pending.map((c) => (
                                <div key={c.consultation_id}>
                                    {renderBtn(
                                        c.supplier_name || c.supplier_id.slice(0, 8),
                                        () => sendReminder(c.consultation_id),
                                        "reminder_" + c.consultation_id,
                                        <Bell size={13} />,
                                        "secondary"
                                    )}
                                </div>
                            ))}
                        </div>
                        {renderMsg("reminder")}
                    </div>
                )}

                {consultations.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
                        Aucune consultation trouvee. Lancez le routage en etape 1.
                    </div>
                )}
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
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Lignes de facturation
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

                {/* Payment options */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer", color: C.dark }}>
                            <input type="radio" name="paymentType" value="full" checked={paymentType === "full"} onChange={() => setPaymentType("full")} />
                            Paiement integral
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer", color: C.dark }}>
                            <input type="radio" name="paymentType" value="split" checked={paymentType === "split"} onChange={() => setPaymentType("split")} />
                            Paiement echelonne
                        </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                                onClick={() => setExpandedStep(isExpanded ? null : step.key)}
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
        </div>
    )
}
