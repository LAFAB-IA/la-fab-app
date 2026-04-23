"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import AuthGuard from "@/components/AuthGuard"
import StatusBadge from "@/components/shared/StatusBadge"
import ProjectTimeline from "@/components/client/ProjectTimeline"
import InterlocutorCard from "@/components/client/InterlocutorCard"
import ProjectDocs from "@/components/client/ProjectDocs"
import { formatPrice, formatDate, projectDisplayName } from "@/lib/format"
import { ArrowLeft } from "lucide-react"

interface Invoice {
    id: string
    invoice_number?: string
    amount: number
    status: string
    payment_type?: string
    payment_step?: string
    pdf_url?: string
    stripe_url?: string
}

function ClientProjectPage() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const params = useParams()
    const projectId = params.projectId as string

    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [invoices, setInvoices] = useState<Invoice[]>([])

    // Fetch project
    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token || !projectId) { setError("Non authentifié"); setLoading(false); return }

        fetchWithAuth(`${API_URL}/api/project/${projectId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.project) setProject(data.project)
                else setError("Projet introuvable")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading, projectId])

    // Fetch invoices
    useEffect(() => {
        if (!token || !projectId || !project) return
        fetchWithAuth(`${API_URL}/api/invoice/list?project_id=${projectId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices || [])
            })
            .catch(() => {})
    }, [token, projectId, project])

    if (loading || authLoading) {
        return <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Chargement...</div>
    }
    if (error) {
        return <div style={{ textAlign: "center", padding: 60, color: "var(--status-danger-fg)" }}>{error}</div>
    }
    if (!project) return null

    const displayName = projectDisplayName(project, "client")
    const briefUrl = project.brief_pdf_url || project.brief_url || null
    const quoteUrl = project.quote_pdf_url || project.quote_url || null
    const interlocutor = project.interlocutor || null
    const deliveryEstimate = project.delivery_estimate || project.estimated_delivery || null

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
            {/* Back link */}
            <a
                href="/projets"
                style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: C.muted, textDecoration: "none", marginBottom: 20,
                }}
                className="nav-link"
            >
                <ArrowLeft size={14} /> Retour aux projets
            </a>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12, marginBottom: 24,
            }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>
                    {displayName}
                </h1>
                <StatusBadge status={project.status} type="project" />
            </div>

            {/* Summary row */}
            {(project.total_price || project.created_at) && (
                <div style={{
                    display: "flex", gap: 24, flexWrap: "wrap",
                    marginBottom: 28, fontSize: 14, color: C.muted,
                }}>
                    {project.total_price && (
                        <span>Montant : <strong style={{ color: C.dark }}>{formatPrice(project.total_price)}</strong></span>
                    )}
                    {project.created_at && (
                        <span>Créé le : <strong style={{ color: C.dark }}>{formatDate(project.created_at)}</strong></span>
                    )}
                </div>
            )}

            {/* Timeline */}
            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 12 }}>Avancement</h2>
                <ProjectTimeline currentStatus={project.status} deliveryEstimate={deliveryEstimate} />
            </section>

            {/* Interlocutor */}
            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 12 }}>Votre interlocuteur LA FAB</h2>
                <InterlocutorCard interlocutor={interlocutor} />
            </section>

            {/* Documents */}
            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 12 }}>Documents</h2>
                <ProjectDocs
                    briefUrl={briefUrl}
                    quoteUrl={quoteUrl}
                    invoices={invoices}
                />
            </section>
        </div>
    )
}

export default function Page() {
    return (
        <AuthGuard>
            <ClientProjectPage />
        </AuthGuard>
    )
}
