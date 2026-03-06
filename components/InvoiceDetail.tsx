"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { FileText, Clock, CreditCard, Download } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    draft:   { label: "Brouillon",  bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
    pending: { label: "À payer",    bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    paid:    { label: "Payée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    overdue: { label: "En retard",  bg: "#fee",    color: "#c0392b", border: "#f5c6c6" },
}

function StatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border }}>
            {sc.label}
        </span>
    )
}

interface InvoiceDetailProps {
    invoiceId?: string
    onClose?: () => void
}

export default function InvoiceDetail({ invoiceId: propId, onClose }: InvoiceDetailProps = {}) {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const params = useParams()
    const id = propId || (params.id as string)
    const [invoice, setInvoice] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [payingStep, setPayingStep] = useState<string | null>(null)
    const [payError, setPayError] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token || !id) { setError("Non authentifié"); setLoading(false); return }

        fetch(`${API_URL}/api/invoice/${id}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.invoice) setInvoice(data.invoice)
                else setError("Facture introuvable")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading, id])

    function handlePay(step: string) {
        if (!token) return
        setPayingStep(step)
        setPayError("")

        fetch(`${API_URL}/api/stripe/create-checkout/${id}?step=${step}`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.checkout_url) {
                    window.location.href = data.checkout_url
                } else {
                    setPayError("Impossible de créer la session de paiement")
                    setPayingStep(null)
                }
            })
            .catch(() => { setPayError("Erreur réseau"); setPayingStep(null) })
    }

    async function handleDownloadPdf() {
        if (!invoice) return
        if (invoice.pdf_url) {
            window.open(invoice.pdf_url, "_blank")
            return
        }
        if (!token) return
        try {
            const res = await fetch(`${API_URL}/api/invoice/${id}/pdf-url`, {
                headers: { Authorization: "Bearer " + token },
            })
            const data = await res.json()
            if (data.ok && data.pdf_url) window.open(data.pdf_url, "_blank")
        } catch { /* ignore */ }
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    if (error || !invoice) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>✗ {error || "Facture introuvable"}</p>
        </div>
    )

    const isSplit = invoice.payment_type === "split"
    const step = invoice.payment_step
    const lineItems = invoice.line_items || []
    const subtotal = lineItems.reduce((s: number, l: any) => s + l.quantity * l.unit_price, 0)
    const tax = Math.round(subtotal * 0.2 * 100) / 100
    const total = invoice.total || Math.round((subtotal + tax) * 100) / 100

    const lbl = { fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 2 }

    return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {onClose ? (
                    <button onClick={onClose} style={{ color: C.muted, fontSize: 14, fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Fermer</button>
                ) : (
                    <a href="/factures" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Mes factures</a>
                )}

                <div style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginTop: 16 }}>

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>FACTURE</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark }}>{invoice.invoice_number}</div>
                        </div>
                        <StatusBadge status={invoice.status} />
                    </div>

                    {/* Info */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px", marginBottom: 28 }}>
                        {invoice.created_at && (
                            <div>
                                <div style={lbl}>Date d'émission</div>
                                <div style={{ fontSize: 14, color: C.dark }}>{formatDate(invoice.created_at)}</div>
                            </div>
                        )}
                        {invoice.due_at && (
                            <div>
                                <div style={lbl}>Échéance</div>
                                <div style={{ fontSize: 14, color: invoice.status === "overdue" ? "#c0392b" : C.dark }}>{formatDate(invoice.due_at)}</div>
                            </div>
                        )}
                        {invoice.client_name && (
                            <div>
                                <div style={lbl}>Client</div>
                                <div style={{ fontSize: 14, color: C.dark }}>{invoice.client_name}</div>
                            </div>
                        )}
                        {invoice.client_email && (
                            <div>
                                <div style={lbl}>Email</div>
                                <div style={{ fontSize: 14, color: C.dark }}>{invoice.client_email}</div>
                            </div>
                        )}
                    </div>

                    {/* Line items table */}
                    {lineItems.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px", gap: 0, borderBottom: "2px solid " + C.dark, paddingBottom: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8 }}>Description</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>Qté</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" }}>Prix unit. HT</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" }}>Total HT</div>
                            </div>
                            {lineItems.map((item: any, idx: number) => (
                                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px", gap: 0, padding: "10px 0", borderBottom: "1px solid " + C.border }}>
                                    <div style={{ fontSize: 14, color: C.dark }}>{item.description}</div>
                                    <div style={{ fontSize: 14, color: C.dark, textAlign: "center" }}>{item.quantity}</div>
                                    <div style={{ fontSize: 14, color: C.dark, textAlign: "right" }}>{formatPrice(item.unit_price)}</div>
                                    <div style={{ fontSize: 14, color: C.dark, textAlign: "right", fontWeight: 600 }}>{formatPrice(item.quantity * item.unit_price)}</div>
                                </div>
                            ))}

                            {/* Totals */}
                            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                <div style={{ display: "flex", gap: 32, fontSize: 14, color: C.muted }}>
                                    <span>Sous-total HT</span><span>{formatPrice(subtotal)}</span>
                                </div>
                                <div style={{ display: "flex", gap: 32, fontSize: 14, color: C.muted }}>
                                    <span>TVA 20%</span><span>{formatPrice(tax)}</span>
                                </div>
                                <div style={{ display: "flex", gap: 32, fontSize: 18, fontWeight: 700, color: C.dark, paddingTop: 8, borderTop: "2px solid " + C.dark }}>
                                    <span>Total TTC</span><span>{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Split payment section */}
                    {isSplit && (
                        <div style={{ padding: "20px", backgroundColor: C.bg, borderRadius: 12, border: "1px solid " + C.border, marginBottom: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>Paiement en 2 fois</div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: C.dark }}>
                                <span>Acompte 30% : <strong>{formatPrice(Number(invoice.deposit_amount))}</strong></span>
                                <span style={{ fontWeight: 600, color: step === "deposit_paid" || step === "fully_paid" ? "#1a7a3c" : C.muted }}>
                                    {step === "deposit_paid" || step === "fully_paid"
                                        ? `✓ Payé${invoice.deposit_paid_at ? " le " + formatDate(invoice.deposit_paid_at) : ""}`
                                        : "En attente"}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 14, color: C.dark }}>
                                <span>Solde 70% : <strong>{formatPrice(Number(invoice.balance_amount))}</strong></span>
                                <span style={{ fontWeight: 600, color: step === "fully_paid" ? "#1a7a3c" : C.muted }}>
                                    {step === "fully_paid"
                                        ? `✓ Payé${invoice.balance_paid_at ? " le " + formatDate(invoice.balance_paid_at) : ""}`
                                        : "En attente"}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    borderRadius: 4,
                                    backgroundColor: "#1a7a3c",
                                    width: step === "fully_paid" ? "100%" : step === "deposit_paid" ? "30%" : "0%",
                                    transition: "width 0.4s ease",
                                }} />
                            </div>
                        </div>
                    )}

                    {payError && (
                        <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: "#fee", border: "1px solid #f5c6c6", borderRadius: 10, fontSize: 13, color: "#c0392b" }}>
                            ✗ {payError}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button
                            onClick={handleDownloadPdf}
                            className="btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", backgroundColor: C.dark, color: C.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                        >
                            <Download size={14} />Télécharger le PDF
                        </button>

                        {/* Split: deposit pending */}
                        {isSplit && step === "pending" && (
                            <button
                                onClick={() => handlePay("deposit")}
                                disabled={!!payingStep}
                                className="btn-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", backgroundColor: payingStep ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: payingStep ? "not-allowed" : "pointer" }}
                            >
                                {payingStep === "deposit"
                                    ? <><Clock size={14} />Redirection...</>
                                    : <><CreditCard size={14} />Payer l&apos;acompte ({formatPrice(Number(invoice.deposit_amount))})</>}
                            </button>
                        )}

                        {/* Split: balance pending */}
                        {isSplit && step === "deposit_paid" && (
                            <button
                                onClick={() => handlePay("balance")}
                                disabled={!!payingStep}
                                className="btn-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", backgroundColor: payingStep ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: payingStep ? "not-allowed" : "pointer" }}
                            >
                                {payingStep === "balance"
                                    ? <><Clock size={14} />Redirection...</>
                                    : <><CreditCard size={14} />Payer le solde ({formatPrice(Number(invoice.balance_amount))})</>}
                            </button>
                        )}

                        {/* Full payment */}
                        {!isSplit && invoice.status !== "paid" && (invoice.status === "pending" || invoice.status === "overdue") && (
                            <button
                                onClick={() => handlePay("full")}
                                disabled={!!payingStep}
                                className="btn-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", backgroundColor: payingStep ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: payingStep ? "not-allowed" : "pointer" }}
                            >
                                {payingStep === "full"
                                    ? <><Clock size={14} />Redirection...</>
                                    : <><CreditCard size={14} />Payer ({formatPrice(total)})</>}
                            </button>
                        )}

                        <a
                            href="/factures"
                            className="btn-secondary"
                            style={{ padding: "12px 24px", backgroundColor: C.bg, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                        >
                            Retour aux factures
                        </a>
                    </div>

                </div>
            </div>
        </div>
    )
}
