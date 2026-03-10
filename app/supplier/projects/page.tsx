"use client"

import React, { useEffect, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { FolderOpen, Clock, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/format"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    created:       { label: "En attente de devis",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:        { label: "Devis envoye",          bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    validated:     { label: "Commande validee",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    ordered:       { label: "Commande validee",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    in_production: { label: "En production",         bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:     { label: "Livre",                  bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    archived:      { label: "Archive",                bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
}

function SupplierProjects() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }

        fetchWithAuth(`${API_URL}/api/supplier/projects`)
            .then((r) => {
                if (!r.ok) throw new Error("not_found")
                return r.json()
            })
            .then((data) => {
                if (data.ok) setProjects(data.projects || [])
                else setError("endpoint_unavailable")
                setLoading(false)
            })
            .catch(() => { setError("endpoint_unavailable"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Mes projets</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>Projets auxquels vous etes assigne</p>
                </div>

                {error === "endpoint_unavailable" ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 12, border: "1px solid " + C.border }}>
                        <FolderOpen size={40} style={{ color: C.muted, opacity: 0.4, marginBottom: 16 }} />
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Projets en cours d'integration</div>
                        <div style={{ fontSize: 14, color: C.muted }}>Cette fonctionnalite sera bientot disponible.</div>
                    </div>
                ) : error ? (
                    <p style={{ color: "#c0392b" }}>{error}</p>
                ) : projects.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 12, border: "1px solid " + C.border }}>
                        <FolderOpen size={40} style={{ color: C.muted, opacity: 0.4, marginBottom: 16 }} />
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Aucun projet assigne</div>
                        <div style={{ fontSize: 14, color: C.muted }}>Vos projets apparaitront ici une fois assignes.</div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {projects.map((project: any) => {
                            const sc = STATUS_CONFIG[project.status] || { label: project.status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
                            return (
                                <div
                                    key={project.project_id || project.id}
                                    style={{
                                        display: "block", backgroundColor: C.white, borderRadius: 12,
                                        padding: "20px 24px", boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
                                        border: "1px solid " + C.border,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>
                                            {project.product?.label || project.brief_analysis?.product_type || "Projet"}
                                        </div>
                                        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
                                            {sc.label}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>{project.project_id || project.id}</div>
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{formatDate(project.created_at)}</div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <AuthGuard requiredRole="supplier">
            <SupplierProjects />
        </AuthGuard>
    )
}
