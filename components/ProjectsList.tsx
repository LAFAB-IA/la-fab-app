"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const STATUS_CONFIG = {
    created:       { label: "En attente de devis",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:        { label: "Devis envoyé",          bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    validated:     { label: "Commande validée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    ordered:       { label: "Commande validée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    in_production: { label: "En production",         bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:     { label: "Livré",                 bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    archived:      { label: "Archivé",               bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
}

function StatusBadge({ status }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
            {sc.label}
        </span>
    )
}

export default function ProjectsList() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [accountId, setAccountId] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        const storedAccountId = localStorage.getItem("account_id") || ""
        setAccountId(storedAccountId)

        fetch(`${API_URL}/api/project`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects(data.projects)
                else setError("Impossible de charger vos projets")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    if (loading) return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement de vos projets...</p>
        </div>
    )

    if (error) return (
        <div style={{ width: "100%", minHeight: "100vh", padding: 32, background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>✗ {error}</p>
        </div>
    )

    return (
        <div style={{ width: "100%", minHeight: "100vh", overflowY: "auto", fontFamily: "Inter, sans-serif", backgroundColor: C.bg, padding: "40px 20px", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Mes projets</h1>
                        <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>{projects.length} projet{projects.length > 1 ? "s" : ""}</p>
                    </div>
                    <a
                        href="/nouveau-projet"
                        style={{ padding: "10px 20px", backgroundColor: C.yellow, color: C.dark, borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                        + Nouveau projet
                    </a>
                </div>

                {/* Liste vide */}
                {projects.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 16, border: "1px solid " + C.border }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Aucun projet pour l'instant</div>
                        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Déposez votre premier brief pour obtenir un devis.</div>
                        <a
                            href="/nouveau-projet"
                            style={{ padding: "12px 24px", backgroundColor: C.yellow, color: C.dark, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                        >
                            Déposer un brief
                        </a>
                    </div>
                )}

                {/* Cartes projets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {projects.map((project) => {
                        const sc = STATUS_CONFIG[project.status] || { color: C.muted }
                        const hasPrice = project.pricing?.total_net != null

                        return (
                            <a
                                key={project.project_id}
                                href={`/dashboard?project_id=${project.project_id}&account_id=${accountId}`}
                                style={{ display: "block", backgroundColor: C.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(58,64,64,0.08)", border: "1px solid " + C.border, textDecoration: "none" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                                            {project.product?.label || project.brief_analysis?.product_type || "Brief uploadé"}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>{project.project_id}</div>
                                    </div>
                                    <StatusBadge status={project.status} />
                                </div>

                                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                    {project.quantity && (
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Quantité</div>
                                            <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{project.quantity} ex.</div>
                                        </div>
                                    )}
                                    {hasPrice && (
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Total HT</div>
                                            <div style={{ fontSize: 13, color: C.dark, fontWeight: 700 }}>{project.pricing.total_net} {project.pricing.currency}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Date</div>
                                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>
                                            {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 14, fontSize: 12, color: sc.color, fontWeight: 600 }}>
                                    Voir le projet →
                                </div>
                            </a>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
