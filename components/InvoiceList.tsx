"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const STATUS_CONFIG = {
    draft:   { label: "Brouillon",      bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
    pending: { label: "À payer",        bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    paid:    { label: "Payée",          bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    overdue: { label: "En retard",      bg: "#fee",    color: "#c0392b", border: "#f5c6c6" },
}

function StatusBadge({ status }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
            {sc.label}
        </span>
    )
}

export default function InvoiceList() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [payingId, setPayingId] = useState(null)
    const [payError, setPayError] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        fetch(`${API_URL}/api/invoice/list`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices)
                else setError("Impossible de charger vos factures")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    function handlePay(invoiceId) {
        if (!token) return
        setPayingId(invoiceId)
        setPayError("")

        fetch(`${API_URL}/api/stripe/create-checkout/${invoiceId}`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.checkout_url) {
                    window.location.href = data.checkout_url
                } else {
                    setPayError("Impossible de créer la session de paiement")
                    setPayingId(null)
                }
            })
            .catch(() => { setPayError("Erreur réseau"); setPayingId(null) })
    }

    if (loading) return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement de vos factures...</p>
        </div>
    )

    if (error) return (
        <div style={{ width: "100%", minHeight: "100vh", padding: 32, background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>✗ {error}</p>
        </div>
    )

    return (
        <div style={{ width: "100%", minHeight: "100vh", overflowY: "auto", fontFamily: "Inter, sans-serif", backgroundColor: C.bg, padding: "40px 20px", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <a href="/projets" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Mes projets</a>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: "12px 0 4px" }}>Mes factures</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{invoices.length} facture{invoices.length > 1 ? "s" : ""}</p>
                </div>

                {payError && (
                    <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: "#fee", border: "1px solid #f5c6c6", borderRadius: 10, fontSize: 13, color: "#c0392b" }}>
                        ✗ {payError}
                    </div>
                )}

                {/* Liste vide */}
                {invoices.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 16, border: "1px solid " + C.border }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🧾</div>
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Aucune facture pour l'instant</div>
                        <div style={{ fontSize: 14, color: C.muted }}>Vos factures apparaîtront ici une fois générées.</div>
                    </div>
                )}

                {/* Cartes factures */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {invoices.map((invoice) => {
                        const isPaying = payingId === invoice.id
                        const canPay = invoice.status === "pending" || invoice.status === "overdue"

                        return (
                            <div
                                key={invoice.id}
                                style={{ backgroundColor: C.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(58,64,64,0.08)", border: "1px solid " + C.border }}
                            >
                                {/* Ligne principale */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                                            {invoice.invoice_number}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>{invoice.project_id}</div>
                                    </div>
                                    <StatusBadge status={invoice.status} />
                                </div>

                                {/* Infos */}
                                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Montant TTC</div>
                                        <div style={{ fontSize: 18, color: C.dark, fontWeight: 700 }}>{invoice.total} €</div>
                                    </div>
                                    {invoice.due_at && (
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Échéance</div>
                                            <div style={{ fontSize: 13, color: invoice.status === "overdue" ? "#c0392b" : C.dark, fontWeight: 500 }}>
                                                {new Date(invoice.due_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                            </div>
                                        </div>
                                    )}
                                    {invoice.paid_at && (
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Payée le</div>
                                            <div style={{ fontSize: 13, color: "#1a7a3c", fontWeight: 500 }}>
                                                {new Date(invoice.paid_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    {invoice.pdf_url && (
                                        <a
                                            href={invoice.pdf_url}
                                            target="_blank"
                                            style={{ padding: "9px 18px", backgroundColor: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                                        >
                                            📄 Voir la facture
                                        </a>
                                    )}
                                    {canPay && (
                                        <button
                                            onClick={() => handlePay(invoice.id)}
                                            disabled={isPaying}
                                            style={{ padding: "9px 24px", backgroundColor: isPaying ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isPaying ? "not-allowed" : "pointer" }}
                                        >
                                            {isPaying ? "⏳ Redirection..." : "💳 Payer"}
                                        </button>
                                    )}
                                    {invoice.status === "paid" && (
                                        <div style={{ padding: "9px 18px", backgroundColor: "#e8f8ee", color: "#1a7a3c", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                                            ✅ Paiement reçu
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
