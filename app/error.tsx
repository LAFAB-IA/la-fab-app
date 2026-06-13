"use client"

import { RefreshCw, Home } from "lucide-react"

interface ErrorPageProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function ErrorPage({ error: _error, reset }: ErrorPageProps) {
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

                    {/* Icône d'erreur */}
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        backgroundColor: "#f0f0ee",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 28px",
                    }}>
                        <span style={{ fontSize: 28 }}>!</span>
                    </div>

                    {/* Titre */}
                    <h1 style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#000000",
                        margin: "0 0 12px 0",
                        letterSpacing: "-0.3px",
                    }}>
                        Une erreur est survenue
                    </h1>

                    {/* Description */}
                    <p style={{
                        fontSize: 15,
                        color: "#7a8080",
                        margin: "0 0 40px 0",
                        lineHeight: 1.6,
                    }}>
                        Quelque chose s&apos;est mal passé. Nos équipes ont été notifiées.
                    </p>

                    {/* Bouton principal */}
                    <button
                        onClick={reset}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "12px 28px", borderRadius: 10,
                            backgroundColor: "#000000", color: "#FAFFFD",
                            fontSize: 14, fontWeight: 600, cursor: "pointer",
                            border: "none", marginBottom: 20,
                            transition: "opacity 0.15s",
                            fontFamily: "Inter, sans-serif",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85" }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                    >
                        <RefreshCw size={15} />
                        Réessayer
                    </button>

                    {/* Lien secondaire */}
                    <div>
                        <a
                            href="/"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                fontSize: 14, color: "#7a8080", textDecoration: "none",
                                transition: "color 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#000000" }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#7a8080" }}
                        >
                            <Home size={14} />
                            Retour à l&apos;accueil
                        </a>
                    </div>

                </div>
            </div>

        </div>
    )
}
