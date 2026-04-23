"use client"

import { C } from "@/lib/constants"
import { User, Mail, Phone } from "lucide-react"

export interface Interlocutor {
    name: string
    role: string
    email?: string
    phone?: string
    avatarUrl?: string
}

interface InterlocutorCardProps {
    interlocutor: Interlocutor | null
}

export default function InterlocutorCard({ interlocutor }: InterlocutorCardProps) {
    if (!interlocutor) {
        return (
            <div style={{
                padding: 20, borderRadius: 12,
                border: "1px solid " + C.border,
                backgroundColor: C.surface,
                display: "flex", alignItems: "center", gap: 14,
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    backgroundColor: "var(--status-neutral-bg)",
                    border: "1px solid var(--status-neutral-bd)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <User size={20} style={{ color: "var(--status-neutral-fg)" }} />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Votre interlocuteur</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                        Sera assigné sous peu
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            padding: 20, borderRadius: 12,
            border: "1px solid " + C.border,
            backgroundColor: C.surface,
            display: "flex", alignItems: "center", gap: 14,
        }}>
            {interlocutor.avatarUrl ? (
                <img
                    src={interlocutor.avatarUrl}
                    alt={interlocutor.name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                />
            ) : (
                <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    backgroundColor: C.yellow, color: C.dark,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 16,
                }}>
                    {interlocutor.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
            )}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{interlocutor.name}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 1 }}>{interlocutor.role}</div>
                <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                    {interlocutor.email && (
                        <a href={`mailto:${interlocutor.email}`} style={{
                            fontSize: 12, color: C.dark, textDecoration: "none",
                            display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                            <Mail size={13} /> {interlocutor.email}
                        </a>
                    )}
                    {interlocutor.phone && (
                        <a href={`tel:${interlocutor.phone}`} style={{
                            fontSize: 12, color: C.dark, textDecoration: "none",
                            display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                            <Phone size={13} /> {interlocutor.phone}
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}
