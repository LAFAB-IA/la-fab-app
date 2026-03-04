"use client"

import { C } from "@/lib/constants"

const STEPS = [
    { key: "created",       label: "Brief reçu",        icon: "📋", desc: "Votre brief a été reçu et analysé" },
    { key: "quoted",        label: "Devis envoyé",       icon: "📄", desc: "Votre devis est prêt à télécharger" },
    { key: "validated",     label: "Commande validée",   icon: "✅", desc: "Votre commande est confirmée" },
    { key: "in_production", label: "En production",      icon: "⚙️", desc: "Votre projet est en cours de fabrication" },
    { key: "delivered",     label: "Livré",              icon: "🎉", desc: "Votre commande a été livrée" },
]

const ORDER = ["created", "quoted", "validated", "in_production", "delivered"]

const STEP_COLORS = {
    done:    { bg: "#e8f8ee", border: "#a8dbb8", color: "#1a7a3c" },
    active:  { bg: C.yellow,  border: C.yellow,  color: C.dark },
    pending: { bg: C.white,   border: C.border,  color: C.muted },
}

export default function ProjectTimeline({ status }: { status: string }) {
    const currentIdx = ORDER.indexOf(status)

    function getStepState(idx: number) {
        if (idx < currentIdx) return "done"
        if (idx === currentIdx) return "active"
        return "pending"
    }

    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
                {STEPS.map((step, idx) => {
                    const state = getStepState(idx)
                    const col = STEP_COLORS[state]
                    const isLast = idx === STEPS.length - 1
                    const nextDone = !isLast && getStepState(idx + 1) !== "pending"
                    return (
                        <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {!isLast && (
                                <div style={{ position: "absolute", top: 20, left: "50%", width: "100%", height: 2, backgroundColor: nextDone ? "#a8dbb8" : C.border, zIndex: 0 }} />
                            )}
                            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: col.bg, border: "2px solid " + col.border, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, flexShrink: 0, boxShadow: state === "active" ? "0 0 0 4px rgba(244,207,21,0.2)" : "none" }}>
                                {state === "done"
                                    ? <span style={{ fontSize: 16, color: "#1a7a3c", fontWeight: 700 }}>✓</span>
                                    : <span style={{ fontSize: 16 }}>{step.icon}</span>
                                }
                            </div>
                            <div style={{ marginTop: 10, textAlign: "center", padding: "0 4px" }}>
                                <div style={{ fontSize: 12, fontWeight: state === "active" ? 700 : 500, color: state === "pending" ? C.muted : C.dark, lineHeight: 1.3 }}>
                                    {step.label}
                                </div>
                                {state === "active" && (
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{step.desc}</div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{ marginTop: 20, padding: "12px 16px", backgroundColor: status === "delivered" ? "#e8f8ee" : "rgba(244,207,21,0.08)", borderRadius: 10, border: "1px solid " + (status === "delivered" ? "#a8dbb8" : "rgba(244,207,21,0.3)"), textAlign: "center" }}>
                <span style={{ fontSize: 13, color: status === "delivered" ? "#1a7a3c" : C.dark, fontWeight: status === "delivered" ? 600 : 500 }}>
                    {status === "created"       && "⏳ Votre brief est en cours d'analyse — un devis vous sera envoyé prochainement."}
                    {status === "quoted"        && "📄 Votre devis est disponible — téléchargez-le et validez votre commande ci-dessous."}
                    {status === "validated"     && "✅ Commande confirmée — nous allons démarrer la production très bientôt."}
                    {status === "in_production" && "⚙️ Votre projet est en production — suivez l'avancement dans l'espace fichiers."}
                    {status === "delivered"     && "🎉 Projet livré — merci pour votre confiance !"}
                </span>
            </div>
        </div>
    )
}
