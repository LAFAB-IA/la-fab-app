"use client"

import React from "react"

// ─── Animation ────────────────────────────────────────────────────────────────

const PULSE_STYLE = `
@keyframes sk-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
}
.sk-block {
    background-color: #e0e0de;
    border-radius: 6px;
    animation: sk-pulse 1.5s ease-in-out infinite;
}
`

function SkeletonStyles() {
    return <style>{PULSE_STYLE}</style>
}

// ─── SkeletonBlock ────────────────────────────────────────────────────────────

export interface SkeletonBlockProps {
    width?: string | number
    height?: string | number
    style?: React.CSSProperties
    delay?: number
}

export function SkeletonBlock({ width = "100%", height = 16, style, delay = 0 }: SkeletonBlockProps) {
    return (
        <>
            <SkeletonStyles />
            <div
                className="sk-block"
                style={{
                    width,
                    height,
                    animationDelay: delay ? `${delay}s` : undefined,
                    ...style,
                }}
            />
        </>
    )
}

// ─── SkeletonText ─────────────────────────────────────────────────────────────

export interface SkeletonTextProps {
    lines?: number
    gap?: number
}

export function SkeletonText({ lines = 3, gap = 10 }: SkeletonTextProps) {
    return (
        <>
            <SkeletonStyles />
            <div style={{ display: "flex", flexDirection: "column", gap }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className="sk-block"
                        style={{
                            height: 14,
                            width: i === lines - 1 && lines > 1 ? "65%" : "100%",
                            animationDelay: `${i * 0.1}s`,
                        }}
                    />
                ))}
            </div>
        </>
    )
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export function SkeletonCard() {
    return (
        <>
            <SkeletonStyles />
            <div style={{
                backgroundColor: "#FAFFFD",
                borderRadius: 12,
                border: "1px solid #e0e0de",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}>
                {/* Header row : avatar + titre */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="sk-block" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, animationDelay: "0s" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="sk-block" style={{ height: 14, width: "60%", animationDelay: "0.05s" }} />
                        <div className="sk-block" style={{ height: 11, width: "40%", animationDelay: "0.1s" }} />
                    </div>
                </div>
                {/* Body lines */}
                <div className="sk-block" style={{ height: 13, width: "100%", animationDelay: "0.15s" }} />
                <div className="sk-block" style={{ height: 13, width: "85%",  animationDelay: "0.2s" }} />
                <div className="sk-block" style={{ height: 13, width: "55%",  animationDelay: "0.25s" }} />
            </div>
        </>
    )
}

// ─── SkeletonTable ────────────────────────────────────────────────────────────

export interface SkeletonTableProps {
    rows?: number
    cols?: number
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
    return (
        <>
            <SkeletonStyles />
            <div style={{
                backgroundColor: "#FAFFFD",
                borderRadius: 12,
                border: "1px solid #e0e0de",
                overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 12,
                    padding: "14px 18px",
                    backgroundColor: "#f0f0ee",
                    borderBottom: "1px solid #e0e0de",
                }}>
                    {Array.from({ length: cols }).map((_, i) => (
                        <div
                            key={i}
                            className="sk-block"
                            style={{ height: 11, width: i === 0 ? "70%" : "50%", animationDelay: `${i * 0.05}s` }}
                        />
                    ))}
                </div>
                {/* Rows */}
                {Array.from({ length: rows }).map((_, r) => (
                    <div
                        key={r}
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gap: 12,
                            padding: "14px 18px",
                            borderBottom: r < rows - 1 ? "1px solid #f0f0ee" : "none",
                        }}
                    >
                        {Array.from({ length: cols }).map((_, c) => (
                            <div
                                key={c}
                                className="sk-block"
                                style={{
                                    height: 13,
                                    width: c === cols - 1 ? "40%" : c === 0 ? "80%" : "65%",
                                    animationDelay: `${(r * cols + c) * 0.03}s`,
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </>
    )
}
