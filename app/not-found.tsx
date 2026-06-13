"use client"

import { Home, FolderKanban } from "lucide-react"

export default function NotFound() {
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#FAFFFD",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter, sans-serif",
        }}>

            {/* ── Logo ── */}
            <div style={{ padding: "28px 40px" }}>
                <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 6,
                        backgroundColor: "#F4CF15",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#000000", letterSpacing: "-0.5px" }}>LF</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#000000", letterSpacing: "-0.2px" }}>LA FAB</span>
                </a>
            </div>

            {/* ── Main content ── */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
            }}>
                <div style={{ textAlign: "center", maxWidth: 480 }}>

                    {/* 404 */}
                    <div style={{
                        fontSize: 120,
                        fontWeight: 800,
                        color: "#000000",
                        lineHeight: 1,
                        letterSpacing: "-6px",
                        marginBottom: 24,
                    }}>
                        404
                    </div>

                    {/* Subtitle */}
                    <h1 style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#000000",
                        margin: "0 0 12px 0",
                        letterSpacing: "-0.3px",
                    }}>
                        Page introuvable
                    </h1>

                    {/* Description */}
                    <p style={{
                        fontSize: 15,
                        color: "#7a8080",
                        margin: "0 0 40px 0",
                        lineHeight: 1.6,
                    }}>
                        La page que vous cherchez n&apos;existe pas ou a été déplacée.
                    </p>

                    {/* Buttons */}
                    <div style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                        flexWrap: "wrap",
                    }}>
                        <a
                            href="/"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                padding: "12px 24px", borderRadius: 10,
                                backgroundColor: "#000000", color: "#FAFFFD",
                                fontSize: 14, fontWeight: 600, textDecoration: "none",
                                border: "1px solid #000000",
                            }}
                        >
                            <Home size={15} />
                            Retour à l&apos;accueil
                        </a>
                        <a
                            href="/projets"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                padding: "12px 24px", borderRadius: 10,
                                backgroundColor: "#FAFFFD", color: "#000000",
                                fontSize: 14, fontWeight: 600, textDecoration: "none",
                                border: "1px solid #000000",
                            }}
                        >
                            <FolderKanban size={15} />
                            Mes projets
                        </a>
                    </div>

                </div>
            </div>

        </div>
    )
}
