"use client"

import React from "react"
import { FileText, Zap, CheckCircle } from "lucide-react"

const STEPS = [
    {
        icon: <FileText size={20} />,
        title: "Déposez votre brief",
        desc: "Uploadez vos fichiers et spécifications",
    },
    {
        icon: <Zap size={20} />,
        title: "L'IA analyse",
        desc: "On sélectionne les meilleurs fournisseurs",
    },
    {
        icon: <CheckCircle size={20} />,
        title: "Recevez votre devis",
        desc: "En moins de 24h",
    },
]

export default function OnboardingPage() {
    function handleCTA() {
        localStorage.setItem("onboarding_done", "true")
        window.location.href = "/projet/nouveau"
    }

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#FAFFFD",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            padding: "40px 24px",
            boxSizing: "border-box",
        }}>

            {/* Logo */}
            <div style={{ marginBottom: 40 }}>
                <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        backgroundColor: "#F4CF15",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#000000", letterSpacing: "-0.5px" }}>LF</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#000000", letterSpacing: "-0.3px" }}>LA FAB</span>
                </a>
            </div>

            {/* Card */}
            <div style={{
                backgroundColor: "#FAFFFD",
                borderRadius: 16,
                border: "1px solid #e0e0de",
                boxShadow: "0 2px 8px rgba(58,64,64,0.08)",
                padding: "48px 40px",
                maxWidth: 560,
                width: "100%",
                textAlign: "center",
                boxSizing: "border-box",
            }}>

                {/* Titre */}
                <h1 style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#000000",
                    margin: "0 0 12px 0",
                    letterSpacing: "-0.5px",
                    lineHeight: 1.2,
                }}>
                    Bienvenue sur LA FAB
                </h1>

                {/* Sous-titre */}
                <p style={{
                    fontSize: 15,
                    color: "#7a8080",
                    margin: "0 0 44px 0",
                    lineHeight: 1.6,
                }}>
                    Votre plateforme d&apos;impression B2B.<br />
                    Déposez votre premier brief en 2 minutes.
                </p>

                {/* Étapes */}
                <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    marginBottom: 44,
                }}>
                    {STEPS.map((step, i) => (
                        <React.Fragment key={i}>
                            <div style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                padding: "0 8px",
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: "50%",
                                    backgroundColor: "#F4CF15",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    marginBottom: 12, flexShrink: 0,
                                }}>
                                    {step.icon}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#000000", marginBottom: 4, lineHeight: 1.3 }}>
                                    {step.title}
                                </div>
                                <div style={{ fontSize: 12, color: "#7a8080", lineHeight: 1.4 }}>
                                    {step.desc}
                                </div>
                            </div>

                            {i < STEPS.length - 1 && (
                                <div style={{
                                    width: 32, height: 1,
                                    backgroundColor: "#e0e0de",
                                    marginTop: 22,
                                    flexShrink: 0,
                                }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Bouton CTA */}
                <button
                    onClick={handleCTA}
                    style={{
                        width: "100%",
                        padding: "14px 24px",
                        backgroundColor: "#000000",
                        color: "#FAFFFD",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                        marginBottom: 16,
                        transition: "opacity 0.15s",
                        fontFamily: "Inter, sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85" }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                >
                    Déposer mon premier brief
                </button>

                {/* Lien secondaire */}
                <a
                    href="/projets"
                    style={{
                        fontSize: 13,
                        color: "#7a8080",
                        textDecoration: "none",
                        display: "inline-block",
                        transition: "color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#000000"; e.currentTarget.style.textDecoration = "underline" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#7a8080"; e.currentTarget.style.textDecoration = "none" }}
                >
                    Explorer mes projets
                </a>

            </div>

            <style>{`
                @media (max-width: 480px) {
                    .ob-card { padding: 32px 20px !important; }
                }
            `}</style>
        </div>
    )
}
