"use client"

import React from "react"
import { C } from "@/lib/constants"
import { Undo2, CreditCard } from "lucide-react"

export default function InvoiceCancel() {
    return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg, fontFamily: "Inter, sans-serif", padding: 20, boxSizing: "border-box" }}>
            <div style={{ maxWidth: 480, width: "100%", backgroundColor: C.white, borderRadius: 12, padding: "48px 40px", textAlign: "center", boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>

                <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#fef9e0", border: "2px solid #f4cf15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                    <Undo2 size={36} style={{ color: C.dark }} />
                </div>

                <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 12 }}>
                    Paiement annulé
                </div>
                <div style={{ fontSize: 15, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>
                    Vous avez annulé le paiement. Votre commande est toujours en attente — vous pouvez régler à tout moment depuis vos factures.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <a
                        href="/factures"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 24px", backgroundColor: C.yellow, color: C.dark, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                    >
                        <CreditCard size={14} />Réessayer le paiement
                    </a>
                    <a
                        href="/projets"
                        style={{ display: "block", padding: "12px 24px", backgroundColor: C.bg, color: C.dark, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1px solid " + C.border }}
                    >
                        Retour à mes projets
                    </a>
                </div>

            </div>
        </div>
    )
}
