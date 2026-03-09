"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import { formatPrice, formatDate } from "@/lib/format"
import {
    ArrowLeft, Send, Loader2, CheckCircle2, Clock, FileText
} from "lucide-react"

const { useState, useEffect } = React

export default function SupplierConsultations() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [consultations, setConsultations] = useState<any[]>([])

    /* reply form state per consultation */
    const [replyData, setReplyData] = useState<Record<string, { response: string; price: string; delay: string; notes: string }>>({})
    const [sending, setSending] = useState<Record<string, boolean>>({})
    const [msgs, setMsgs] = useState<Record<string, { type: "ok" | "err"; text: string }>>({})

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifie"); setLoading(false); return }
        fetchWithAuth(`${API_URL}/api/supplier-portal/consultations`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setConsultations(data.consultations || [])
                else setError(data.error || "Erreur serveur")
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [isAuthenticated, authLoading])

    function getReply(id: string) {
        return replyData[id] || { response: "", price: "", delay: "", notes: "" }
    }

    function updateReply(id: string, field: string, value: string) {
        setReplyData((prev) => ({
            ...prev,
            [id]: { ...getReply(id), [field]: value },
        }))
    }

    async function sendReply(consultationId: string) {
        const rd = getReply(consultationId)
        if (!rd.response.trim()) {
            setMsgs((p) => ({ ...p, [consultationId]: { type: "err", text: "La proposition est obligatoire" } }))
            return
        }
        setSending((p) => ({ ...p, [consultationId]: true }))
        try {
            const r = await fetchWithAuth(`${API_URL}/api/supplier-portal/consultations/${consultationId}/reply`, {
                method: "POST",
                body: JSON.stringify({
                    response_text: rd.response,
                    proposed_price: rd.price ? Number(rd.price) : undefined,
                }),
            })
            const data = await r.json()
            if (data.ok) {
                setMsgs((p) => ({ ...p, [consultationId]: { type: "ok", text: "Reponse envoyee" } }))
                setConsultations((prev) => prev.map((c) =>
                    (c.consultation_id || c.id) === consultationId
                        ? { ...c, status: "replied", response_text: rd.response, proposed_price: rd.price ? Number(rd.price) : null }
                        : c
                ))
            } else {
                setMsgs((p) => ({ ...p, [consultationId]: { type: "err", text: data.error || "Erreur" } }))
            }
        } catch {
            setMsgs((p) => ({ ...p, [consultationId]: { type: "err", text: "Erreur reseau" } }))
        }
        setSending((p) => ({ ...p, [consultationId]: false }))
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement des consultations...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif", padding: 40 }}>
            <p style={{ color: "#c0392b" }}>{error}</p>
        </div>
    )

    const sorted = [...consultations].sort((a, b) =>
        new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime()
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 900, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 4px 0" }}>Mes consultations</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{consultations.length} consultation{consultations.length > 1 ? "s" : ""}</p>
                </div>
                <a href="/supplier/dashboard" style={{
                    padding: "9px 18px", background: C.white, color: C.dark,
                    border: "1px solid " + C.border, borderRadius: 8, fontSize: 13,
                    fontWeight: 600, textDecoration: "none", display: "inline-flex",
                    alignItems: "center", gap: 8,
                }}>
                    <ArrowLeft size={14} /> Dashboard
                </a>
            </div>

            {sorted.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>
                    Aucune consultation recue pour le moment
                </div>
            )}

            {/* Consultation cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {sorted.map((c) => {
                    const cId = c.consultation_id || c.id
                    const isPending = c.status === "sent" || c.status === "pending"
                    const isReplied = c.status === "replied" || c.status === "responded"
                    const isSending = sending[cId]
                    const msg = msgs[cId]
                    const rd = getReply(cId)

                    return (
                        <div key={cId} style={{
                            background: C.white, borderRadius: 12,
                            border: "1px solid " + C.border,
                            boxShadow: "0 1px 3px rgba(58,64,64,0.06)",
                            overflow: "hidden",
                        }}>
                            {/* Card header */}
                            <div style={{ padding: "18px 22px", borderBottom: "1px solid " + C.border }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                            <FileText size={16} color={C.muted} />
                                            <span style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>
                                                Projet {(c.project_id || "").slice(0, 12)}...
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            Envoye le {formatDate(c.sent_at || c.created_at)}
                                        </div>
                                    </div>
                                    {renderStatus(c.status)}
                                </div>

                                {/* Brief specs */}
                                {c.specifications && (
                                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f8f8f6", fontSize: 13, color: C.dark, lineHeight: 1.5 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Specifications demandees</div>
                                        {c.specifications}
                                    </div>
                                )}
                                {c.brief_description && !c.specifications && (
                                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f8f8f6", fontSize: 13, color: C.dark, lineHeight: 1.5 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Description du brief</div>
                                        {c.brief_description}
                                    </div>
                                )}
                            </div>

                            {/* Reply form for pending */}
                            {isPending && (
                                <div style={{ padding: "18px 22px", background: "#fefce8" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 12 }}>
                                        Votre reponse
                                    </div>

                                    <textarea
                                        value={rd.response}
                                        onChange={(e) => updateReply(cId, "response", e.target.value)}
                                        placeholder="Votre proposition..."
                                        rows={4}
                                        style={{
                                            width: "100%", padding: "10px 14px", border: "1px solid " + C.border,
                                            borderRadius: 8, fontSize: 13, color: C.dark, resize: "vertical",
                                            outline: "none", boxSizing: "border-box", marginBottom: 10, fontFamily: "Inter, sans-serif",
                                        }}
                                    />

                                    <div className="supplier-reply-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Prix propose HT</label>
                                            <input
                                                type="number"
                                                value={rd.price}
                                                onChange={(e) => updateReply(cId, "price", e.target.value)}
                                                placeholder="0.00"
                                                min={0}
                                                step={0.01}
                                                style={{ width: "100%", padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", boxSizing: "border-box" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Delai de livraison (jours)</label>
                                            <input
                                                type="number"
                                                value={rd.delay}
                                                onChange={(e) => updateReply(cId, "delay", e.target.value)}
                                                placeholder="15"
                                                min={1}
                                                style={{ width: "100%", padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", boxSizing: "border-box" }}
                                            />
                                        </div>
                                    </div>

                                    <textarea
                                        value={rd.notes}
                                        onChange={(e) => updateReply(cId, "notes", e.target.value)}
                                        placeholder="Notes complementaires (optionnel)..."
                                        rows={2}
                                        style={{
                                            width: "100%", padding: "10px 14px", border: "1px solid " + C.border,
                                            borderRadius: 8, fontSize: 13, color: C.dark, resize: "vertical",
                                            outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "Inter, sans-serif",
                                        }}
                                    />

                                    <button
                                        onClick={() => sendReply(cId)}
                                        disabled={isSending}
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: 6,
                                            padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                                            border: "none", background: C.yellow, color: C.dark,
                                            cursor: isSending ? "not-allowed" : "pointer",
                                            opacity: isSending ? 0.6 : 1,
                                        }}
                                    >
                                        {isSending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
                                        Envoyer ma reponse
                                    </button>

                                    {msg && (
                                        <div style={{
                                            marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                                            background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2",
                                            color: msg.type === "ok" ? "#166534" : "#991b1b",
                                            border: "1px solid " + (msg.type === "ok" ? "#bbf7d0" : "#fecaca"),
                                        }}>
                                            {msg.text}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Read-only reply for responded */}
                            {isReplied && (
                                <div style={{ padding: "18px 22px", background: "#f0fdf4" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                        <CheckCircle2 size={15} color="#1a7a3c" />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a7a3c" }}>Reponse envoyee</span>
                                    </div>

                                    {c.response_text && (
                                        <div style={{ fontSize: 13, color: C.dark, marginBottom: 8, lineHeight: 1.5 }}>
                                            {c.response_text}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                                        {c.proposed_price != null && (
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Prix propose</div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{formatPrice(Number(c.proposed_price))}</div>
                                            </div>
                                        )}
                                        {c.lead_time_days && (
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Delai</div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{c.lead_time_days} jours</div>
                                            </div>
                                        )}
                                        {c.responded_at && (
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Date de reponse</div>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: C.dark }}>{formatDate(c.responded_at)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
                @media (max-width: 768px) {
                    .supplier-reply-fields { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}

function renderStatus(status: string) {
    const cfg: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
        sent: { label: "En attente", bg: "#fef9e0", color: "#b89a00", icon: <Clock size={12} /> },
        pending: { label: "En attente", bg: "#fef9e0", color: "#b89a00", icon: <Clock size={12} /> },
        replied: { label: "Repondue", bg: "#e8f8ee", color: "#1a7a3c", icon: <CheckCircle2 size={12} /> },
        responded: { label: "Repondue", bg: "#e8f8ee", color: "#1a7a3c", icon: <CheckCircle2 size={12} /> },
        validated: { label: "Validee", bg: "#e8f0fe", color: "#1a3c7a", icon: <CheckCircle2 size={12} /> },
    }
    const c = cfg[status] || { label: status, bg: "#f5f5f5", color: "#616161", icon: null }
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>
            {c.icon} {c.label}
        </span>
    )
}
