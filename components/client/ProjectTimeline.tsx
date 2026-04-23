"use client"

import { C } from "@/lib/constants"
import { ClipboardList, FileText, CheckCircle2, Cog, PackageCheck, Clock, CreditCard, Truck } from "lucide-react"

interface Step {
    key: string
    label: string
    icon: React.ReactNode
    desc: string
}

const STEPS: Step[] = [
    { key: "created",       label: "Brief reçu",        icon: <ClipboardList size={16} />, desc: "Votre brief a été reçu et analysé" },
    { key: "quoted",        label: "Devis envoyé",       icon: <FileText size={16} />,      desc: "Votre devis est prêt à consulter" },
    { key: "validated",     label: "Commande validée",   icon: <CheckCircle2 size={16} />,  desc: "Votre commande est confirmée" },
    { key: "in_production", label: "En production",      icon: <Cog size={16} />,           desc: "Votre projet est en cours de fabrication" },
    { key: "delivered",     label: "Livré",              icon: <PackageCheck size={16} />,   desc: "Votre commande a été livrée" },
]

const ORDER = STEPS.map((s) => s.key)

const STEP_COLORS = {
    done:    { bg: "var(--status-success-bg)", border: "var(--status-success-bd)", color: "var(--status-success-fg)" },
    active:  { bg: C.yellow,  border: C.yellow,  color: C.dark },
    pending: { bg: C.white,   border: C.border,  color: C.muted },
}

const CONTEXT_NOTES: Record<string, { icon: React.ReactNode; text: string }> = {
    created:        { icon: <Clock size={14} />,         text: "Votre brief est en cours d'analyse — un devis vous sera envoyé prochainement." },
    quoted:         { icon: <FileText size={14} />,      text: "Votre devis est disponible — consultez-le et validez votre commande ci-dessous." },
    validated:      { icon: <CheckCircle2 size={14} />,  text: "Commande confirmée — nous allons démarrer la production très bientôt." },
    paid:           { icon: <CreditCard size={14} />,    text: "Paiement reçu — votre projet va entrer en production." },
    in_production:  { icon: <Cog size={14} />,           text: "Votre projet est en production — nous vous tenons informé de l'avancement." },
    shipped:        { icon: <Truck size={14} />,         text: "Votre commande a été expédiée — livraison en cours." },
    delivered:      { icon: <PackageCheck size={14} />,  text: "Projet livré — merci pour votre confiance !" },
}

interface ProjectTimelineProps {
    steps?: Step[]
    currentStatus: string
    deliveryEstimate?: string
}

export default function ProjectTimeline({ currentStatus, deliveryEstimate }: ProjectTimelineProps) {
    const currentIdx = ORDER.indexOf(currentStatus)

    function getStepState(idx: number) {
        if (idx < currentIdx) return "done"
        if (idx === currentIdx) return "active"
        return "pending"
    }

    const note = CONTEXT_NOTES[currentStatus]
    const isDelivered = currentStatus === "delivered"

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
                                <div style={{
                                    position: "absolute", top: 20, left: "50%", width: "100%", height: 2,
                                    backgroundColor: nextDone ? "var(--status-success-bd)" : C.border, zIndex: 0,
                                }} />
                            )}
                            <div style={{
                                width: 40, height: 40, borderRadius: "50%",
                                backgroundColor: col.bg, border: "2px solid " + col.border,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                position: "relative", zIndex: 1, flexShrink: 0,
                                boxShadow: state === "active" ? "0 0 0 4px rgba(244,207,21,0.2)" : "none",
                            }}>
                                {state === "done"
                                    ? <span style={{ fontSize: 16, color: "var(--status-success-fg)", fontWeight: 700 }}>✓</span>
                                    : <span style={{ fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{step.icon}</span>
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

            {note && (
                <div style={{
                    marginTop: 20, padding: "12px 16px",
                    backgroundColor: isDelivered ? "var(--status-success-bg)" : "rgba(244,207,21,0.08)",
                    borderRadius: 10,
                    border: "1px solid " + (isDelivered ? "var(--status-success-bd)" : "rgba(244,207,21,0.3)"),
                    textAlign: "center",
                }}>
                    <span style={{
                        fontSize: 13,
                        color: isDelivered ? "var(--status-success-fg)" : C.dark,
                        fontWeight: isDelivered ? 600 : 500,
                        display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                        {note.icon}
                        {note.text}
                    </span>
                </div>
            )}

            {deliveryEstimate && !isDelivered && (
                <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: C.muted }}>
                    Livraison estimée : {deliveryEstimate}
                </div>
            )}
        </div>
    )
}
