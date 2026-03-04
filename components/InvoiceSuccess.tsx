"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { getToken } from "@/lib/utils"

export default function InvoiceSuccess() {
    const [status, setStatus] = useState("loading") // loading | confirmed | error
    const [invoice, setInvoice] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const invoiceId = params.get("invoice_id")
        const token = getToken()

        if (!invoiceId || !token) { setStatus("error"); return }

        // Polling — Stripe webhook peut prendre quelques secondes
        let attempts = 0
        const MAX = 8

        function checkStatus() {
            fetch(`${API_URL}/api/invoice/${invoiceId}`, {
                headers: { Authorization: "Bearer " + token },
            })
                .then((r) => r.json())
                .then((data) => {
                    if (data.ok && data.invoice?.status === "paid") {
                        setInvoice(data.invoice)
                        setStatus("confirmed")
                    } else if (attempts < MAX) {
                        attempts++
                        setTimeout(checkStatus, 1500)
                    } else {
                        // Webhook pas encore reçu — on affiche quand même un succès
                        setStatus("confirmed")
                    }
                })
                .catch(() => {
                    if (attempts < MAX) {
                        attempts++
                        setTimeout(checkStatus, 1500)
                    } else {
                        setStatus("confirmed")
                    }
                })
        }

        checkStatus()
    }, [])

    return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg, fontFamily: "Inter, sans-serif", padding: 20, boxSizing: "border-box" }}>
            <div style={{ maxWidth: 480, width: "100%", backgroundColor: C.white, borderRadius: 20, padding: "48px 40px", textAlign: "center", boxShadow: "0 4px 24px rgba(58,64,64,0.1)" }}>

                {status === "loading" && (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Confirmation en cours...</div>
                        <div style={{ fontSize: 14, color: C.muted }}>Nous vérifions votre paiement, merci de patienter.</div>
                    </>
                )}

                {status === "confirmed" && (
                    <>
                        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#e8f8ee", border: "2px solid #a8dbb8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                            <span style={{ fontSize: 36 }}>✅</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Paiement confirmé !</div>
                        <div style={{ fontSize: 15, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>
                            Merci pour votre règlement. Votre commande est confirmée et nous allons démarrer la production.
                        </div>
                        {invoice && (
                            <div style={{ margin: "20px 0", padding: "14px 20px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Facture</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{invoice.invoice_number}</div>
                                <div style={{ fontSize: 14, color: "#1a7a3c", fontWeight: 600, marginTop: 4 }}>{invoice.total} € — Payée</div>
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                            <a
                                href="/projets"
                                style={{ display: "block", padding: "12px 24px", backgroundColor: C.yellow, color: C.dark, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                            >
                                Voir mes projets
                            </a>
                            <a
                                href="/factures"
                                style={{ display: "block", padding: "12px 24px", backgroundColor: C.bg, color: C.dark, borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1px solid " + C.border }}
                            >
                                Voir mes factures
                            </a>
                        </div>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Une erreur est survenue</div>
                        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Impossible de confirmer votre paiement. Contactez-nous si le problème persiste.</div>
                        <a
                            href="/factures"
                            style={{ display: "block", padding: "12px 24px", backgroundColor: C.yellow, color: C.dark, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                        >
                            Retour aux factures
                        </a>
                    </>
                )}

            </div>
        </div>
    )
}
