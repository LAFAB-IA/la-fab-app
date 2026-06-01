"use client"
import React from "react"
import { C } from "@/lib/constants"

export interface StatItem {
    icon: React.ElementType
    label: string
    value: string
    sub?: string
}

interface StatsCardsProps {
    items: StatItem[]
    loading?: boolean
}

export function StatsCards({ items, loading = false }: StatsCardsProps) {
    if (loading) {
        return (
            <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(items.length || 4, 4)}, 1fr)`,
                gap: 12,
                marginBottom: 28,
            }}>
                {Array.from({ length: items.length || 4 }).map((_, i) => (
                    <div key={i} style={{
                        background: C.white,
                        borderRadius: 12,
                        padding: "18px 20px",
                        border: "1px solid " + C.border,
                        boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
                        height: 88,
                        animation: "pulse 1.5s ease-in-out infinite",
                    }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
            </div>
        )
    }

    const cols = Math.min(items.length, 4)

    return (
        <>
            <div
                className="stats-cards-grid"
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 12,
                    marginBottom: 28,
                }}
            >
                {items.map((item, i) => {
                    const Icon = item.icon
                    return (
                        <div key={i} style={{
                            background: C.white,
                            borderRadius: 12,
                            padding: "18px 20px",
                            border: "1px solid " + C.border,
                            boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <div style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
                                    backgroundColor: C.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <Icon size={15} color={C.muted} />
                                </div>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: C.muted,
                                    textTransform: "uppercase" as const,
                                    letterSpacing: 0.4,
                                }}>
                                    {item.label}
                                </span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 2 }}>
                                {item.value}
                            </div>
                            {item.sub && (
                                <div style={{ fontSize: 12, color: C.muted }}>{item.sub}</div>
                            )}
                        </div>
                    )
                })}
            </div>
            <style>{`
                @media (max-width: 900px) { .stats-cards-grid { grid-template-columns: 1fr 1fr !important; } }
                @media (max-width: 540px) { .stats-cards-grid { grid-template-columns: 1fr !important; } }
            `}</style>
        </>
    )
}
