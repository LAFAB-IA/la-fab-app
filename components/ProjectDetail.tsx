"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import ProjectTimeline from "@/components/shared/ProjectTimeline"
import StatusBadge from "@/components/shared/StatusBadge"
import { FileText, Download, FileSpreadsheet, FileImage, FileType, File, Route, Layers, AlertTriangle } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format"

interface ProjectDetailProps {
    projectId?: string
    onClose?: () => void
}

export default function ProjectDetail({ projectId: propId, onClose }: ProjectDetailProps = {}) {
    const { token, isAuthenticated, isLoading: authLoading, user } = useAuth()
    const params = useParams()
    const id = propId || (params.id as string)

    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Invoices
    const [invoices, setInvoices] = useState<any[]>([])
    const [invoicesLoading, setInvoicesLoading] = useState(false)

    // Messages
    const [messages, setMessages] = useState<any[]>([])
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [msgText, setMsgText] = useState("")
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch project
    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token || !id) { setError("Non authentifié"); setLoading(false); return }

        fetch(`${API_URL}/api/project/${id}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.project) setProject(data.project)
                else setError("Projet introuvable")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading, id])

    // Fetch invoices
    useEffect(() => {
        if (!token || !id || !project) return
        setInvoicesLoading(true)
        fetch(`${API_URL}/api/invoice/list?project_id=${id}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices || [])
                setInvoicesLoading(false)
            })
            .catch(() => setInvoicesLoading(false))
    }, [token, id, project])

    // Fetch messages
    useEffect(() => {
        if (!token || !id || !project) return
        setMessagesLoading(true)
        fetch(`${API_URL}/api/project/${id}/messages`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setMessages(data.messages || [])
                setMessagesLoading(false)
            })
            .catch(() => setMessagesLoading(false))
    }, [token, id, project])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    function handleSendMessage() {
        if (!token || !msgText.trim() || sending) return
        setSending(true)
        fetch(`${API_URL}/api/project/${id}/messages`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ content: msgText.trim() }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.message) {
                    setMessages((prev) => [...prev, data.message])
                    setMsgText("")
                }
                setSending(false)
            })
            .catch(() => setSending(false))
    }

    function handlePay(invoiceId: string, step: string) {
        if (!token) return
        fetch(`${API_URL}/api/stripe/create-checkout/${invoiceId}?step=${step}`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.checkout_url) window.location.href = data.checkout_url
            })
            .catch(() => {})
    }

    const lbl = { fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 2 }
    const sec = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: "1px solid " + C.border }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    if (error || !project) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>{error || "Projet introuvable"}</p>
        </div>
    )

    const { status, product, quantity, pricing, brief_analysis, created_at, quote_url, quote_number } = project

    return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {onClose ? (
                    <button onClick={onClose} style={{ color: C.muted, fontSize: 14, fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Fermer</button>
                ) : (
                    <a href="/projets" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Mes projets</a>
                )}

                <div style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginTop: 16 }}>

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark }}>
                                {brief_analysis?.product_type || product?.label || "Projet"}
                            </div>
                            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{id}</div>
                        </div>
                        <StatusBadge status={status} type="project" />
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                        Créé le {formatDate(created_at)}
                    </div>

                    {/* Timeline */}
                    <div style={{ borderTop: "1px solid " + C.border, paddingTop: 24, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
                            Suivi de commande
                        </div>
                        <ProjectTimeline status={status} />
                    </div>

                    {/* Brief */}
                    {brief_analysis && (
                        <>
                            <div style={sec}>Brief</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
                                {[
                                    { label: "Produit",    val: brief_analysis.product_type },
                                    { label: "Quantité",   val: brief_analysis.quantity_detected ? brief_analysis.quantity_detected + " ex." : null },
                                    { label: "Dimensions", val: brief_analysis.dimensions },
                                    { label: "Support",    val: brief_analysis.material },
                                    { label: "Finitions",  val: brief_analysis.finish },
                                    { label: "Délai",      val: brief_analysis.delivery_deadline },
                                ].filter((i) => i.val).map((item) => (
                                    <div key={item.label}>
                                        <div style={lbl}>{item.label}</div>
                                        <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{item.val}</div>
                                    </div>
                                ))}
                            </div>
                            {brief_analysis.raw_extraction && (
                                <div style={{ marginTop: 16, backgroundColor: C.bg, borderRadius: 10, padding: 16, border: "1px solid " + C.border }}>
                                    <div style={lbl}>Extraction brute du brief</div>
                                    <div style={{ fontSize: 14, color: C.dark, lineHeight: 1.6, marginTop: 6 }}>{brief_analysis.raw_extraction}</div>
                                </div>
                            )}
                            {project.brief_file_url && (() => {
                                const url = project.brief_file_url as string
                                const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
                                const isImage = ["jpg","jpeg","png","webp"].includes(ext)
                                const isSpreadsheet = ["xlsx","xls","csv"].includes(ext)
                                const isPresentation = ext === "pptx"
                                const BriefIcon = isImage ? FileImage : isSpreadsheet ? FileSpreadsheet : isPresentation ? FileType : FileText
                                const label = isImage ? "image" : isSpreadsheet ? "tableur" : isPresentation ? "présentation" : ext === "pdf" ? "PDF" : ext.toUpperCase() || "fichier"
                                return (
                                    <a
                                        href={url}
                                        target="_blank"
                                        style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "12px 24px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                                    >
                                        <BriefIcon size={16} /> Télécharger le brief ({label})
                                    </a>
                                )
                            })()}
                        </>
                    )}

                    {/* Plan de production */}
                    {brief_analysis?.production_plan && (() => {
                        const plan = brief_analysis.production_plan
                        return (
                            <>
                                <div style={{ ...sec, display: "flex", alignItems: "center", gap: 8 }}>
                                    <Route size={14} /> Plan de production
                                </div>
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                                    Optimisé par l&apos;IA — {plan.total_lots} lots
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {plan.lots?.map((lot: any) => (
                                        <div key={lot.lot_number} style={{
                                            borderLeft: `3px solid ${lot.is_amalgame ? C.yellow : C.border}`,
                                            borderRadius: 10,
                                            padding: "16px 18px",
                                            backgroundColor: C.bg,
                                            border: `1px solid ${C.border}`,
                                            borderLeftWidth: 3,
                                            borderLeftColor: lot.is_amalgame ? C.yellow : C.border,
                                        }}>
                                            {/* Lot header */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Lot {lot.lot_number}</span>
                                                    {lot.recommended_supplier && (
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: C.white, backgroundColor: C.dark, padding: "2px 8px", borderRadius: 4 }}>
                                                            {lot.recommended_supplier}
                                                        </span>
                                                    )}
                                                </div>
                                                {lot.estimated_delay_days != null && (
                                                    <span style={{ fontSize: 12, color: C.muted }}>
                                                        Délai estimé : {lot.estimated_delay_days} jours
                                                    </span>
                                                )}
                                            </div>

                                            {/* Amalgame badge */}
                                            {lot.is_amalgame && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", backgroundColor: "rgba(244,207,21,0.12)", borderRadius: 6 }}>
                                                    <Layers size={14} color={C.yellow} />
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>Amalgame</span>
                                                    {lot.amalgame_reason && (
                                                        <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>— {lot.amalgame_reason}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Products list */}
                                            {lot.products?.map((p: any, idx: number) => (
                                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: idx > 0 ? `1px solid ${C.border}` : "none" }}>
                                                    <div>
                                                        <span style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{p.name}</span>
                                                        {p.quantity && <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>× {p.quantity}</span>}
                                                    </div>
                                                    {p.estimated_price_ht != null && (
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{formatPrice(p.estimated_price_ht)} HT</span>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Lot total */}
                                            {lot.total_estimated_ht != null && (
                                                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, marginTop: 4, borderTop: `1px solid ${C.border}` }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Total : {formatPrice(lot.total_estimated_ht)} HT</span>
                                                </div>
                                            )}

                                            {/* Supplier reason */}
                                            {lot.supplier_reason && (
                                                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" }}>
                                                    {lot.supplier_reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Global total */}
                                {plan.total_estimated_ht != null && (
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Total estimé : {formatPrice(plan.total_estimated_ht)} HT</span>
                                    </div>
                                )}

                                {/* Optimization notes */}
                                {plan.optimization_notes && (
                                    <div style={{ marginTop: 12, fontSize: 13, color: C.muted, lineHeight: 1.6, backgroundColor: C.bg, borderRadius: 8, padding: 12 }}>
                                        {plan.optimization_notes}
                                    </div>
                                )}

                                {/* Risks */}
                                {plan.risks?.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                                        {plan.risks.map((risk: string, idx: number) => (
                                            <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#e67e22", backgroundColor: "rgba(230,126,34,0.1)", padding: "4px 10px", borderRadius: 6 }}>
                                                <AlertTriangle size={12} /> {risk}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    })()}

                    {/* Informations */}
                    <div style={sec}>Informations</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
                        <div>
                            <div style={lbl}>Quantité</div>
                            <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{brief_analysis?.quantity_detected ?? quantity ?? "—"} ex.</div>
                        </div>
                        {pricing && (
                            <>
                                <div>
                                    <div style={lbl}>Sous-total HT</div>
                                    <div style={{ fontSize: 16, color: C.dark, fontWeight: 500 }}>{pricing.total_net != null ? formatPrice(pricing.total_net) : "En attente"}</div>
                                </div>
                                <div>
                                    <div style={lbl}>TVA (20%)</div>
                                    <div style={{ fontSize: 16, color: C.dark, fontWeight: 500 }}>
                                        {pricing.total_net != null ? formatPrice(pricing.total_net * 0.2) : "—"}
                                    </div>
                                </div>
                                <div>
                                    <div style={lbl}>Total TTC</div>
                                    <div style={{ fontSize: 20, color: C.dark, fontWeight: 700 }}>
                                        {pricing.total_net != null ? formatPrice(pricing.total_net * 1.2) : "En attente"}
                                    </div>
                                </div>
                            </>
                        )}
                        <div>
                            <div style={lbl}>Date de création</div>
                            <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>
                                {formatDate(created_at)}
                            </div>
                        </div>
                    </div>

                    {/* Devis */}
                    {quote_url && (
                        <>
                            <div style={sec}>Devis</div>
                            {quote_number && (
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                                    Devis n° <strong>{quote_number}</strong>
                                </div>
                            )}
                            <a
                                href={quote_url}
                                target="_blank"
                                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                            >
                                <FileText size={16} /> Télécharger le devis (PDF)
                            </a>
                        </>
                    )}

                    {/* Factures */}
                    <div style={sec}>Factures</div>
                    {invoicesLoading ? (
                        <p style={{ fontSize: 13, color: C.muted }}>Chargement...</p>
                    ) : invoices.length === 0 ? (
                        <p style={{ fontSize: 13, color: C.muted }}>Aucune facture liée à ce projet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {invoices.map((inv: any) => {
                                const isSplit = inv.payment_type === "split"
                                const step = inv.payment_step
                                return (
                                    <div key={inv.id} style={{ padding: "14px 18px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{inv.invoice_number}</div>
                                            <div style={{ fontSize: 13, color: C.muted }}>{formatPrice(Number(inv.total))} TTC</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <StatusBadge status={inv.status} type="invoice" />
                                            {isSplit && step === "pending" && (
                                                <button onClick={() => handlePay(inv.id, "deposit")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer l'acompte
                                                </button>
                                            )}
                                            {isSplit && step === "deposit_paid" && (
                                                <button onClick={() => handlePay(inv.id, "balance")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer le solde
                                                </button>
                                            )}
                                            {!isSplit && inv.status === "pending" && (
                                                <button onClick={() => handlePay(inv.id, "full")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer
                                                </button>
                                            )}
                                            <a href={`/facture/${inv.id}`} style={{ fontSize: 12, color: C.dark, fontWeight: 600, textDecoration: "none" }}>Voir →</a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Messages */}
                    <div style={sec}>Messages</div>
                    <div style={{ backgroundColor: C.bg, borderRadius: 12, border: "1px solid " + C.border, overflow: "hidden" }}>
                        {/* Message list */}
                        <div style={{ maxHeight: 360, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            {messagesLoading ? (
                                <p style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Chargement...</p>
                            ) : messages.length === 0 ? (
                                <p style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Aucun message. Commencez la conversation.</p>
                            ) : (
                                messages.map((msg: any, idx: number) => {
                                    const isMe = msg.sender_id === user?.id
                                    return (
                                        <div key={msg.id || idx} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                            <div style={{
                                                maxWidth: "70%",
                                                padding: "10px 14px",
                                                borderRadius: 12,
                                                backgroundColor: isMe ? C.dark : C.white,
                                                color: isMe ? C.white : C.dark,
                                                fontSize: 14,
                                                lineHeight: 1.5,
                                                border: isMe ? "none" : "1px solid " + C.border,
                                            }}>
                                                {!isMe && msg.sender_name && (
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: isMe ? "rgba(255,255,255,0.6)" : C.muted, marginBottom: 4 }}>{msg.sender_name}</div>
                                                )}
                                                <div>{msg.content}</div>
                                                <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.5)" : C.muted, marginTop: 4, textAlign: "right" }}>
                                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ borderTop: "1px solid " + C.border, padding: 12, display: "flex", gap: 10 }}>
                            <input
                                value={msgText}
                                onChange={(e) => setMsgText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                                placeholder="Écrire un message..."
                                style={{ flex: 1, padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, color: C.dark, backgroundColor: C.white, outline: "none", fontFamily: "Inter, sans-serif" }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sending || !msgText.trim()}
                                style={{ padding: "10px 20px", backgroundColor: sending || !msgText.trim() ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending || !msgText.trim() ? "not-allowed" : "pointer" }}
                            >
                                {sending ? "..." : "Envoyer"}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
