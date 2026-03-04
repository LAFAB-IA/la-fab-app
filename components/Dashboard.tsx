"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import ProjectTimeline from "@/components/shared/ProjectTimeline"

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [project, setProject] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [quoteLoading, setQuoteLoading] = useState(false)
    const [quoteUrl, setQuoteUrl] = useState(null)
    const [quoteNumber, setQuoteNumber] = useState(null)
    const [quoteError, setQuoteError] = useState(null)
    const [orderLoading, setOrderLoading] = useState(false)
    const [orderConfirmed, setOrderConfirmed] = useState(false)
    const [orderError, setOrderError] = useState(null)

    const searchParams = useSearchParams()
    const projectId = searchParams.get("project_id")
    const accountId = searchParams.get("account_id") || (typeof window !== "undefined" ? localStorage.getItem("account_id") : "") || ""

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }
        if (!projectId) { setError("project_id manquant"); setLoading(false); return }

        fetch(`${API_URL}/api/project/${projectId}?account_id=${accountId}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.project) {
                    setProject(data.project)
                    if (data.project.quote_url)    setQuoteUrl(data.project.quote_url)
                    if (data.project.quote_number) setQuoteNumber(data.project.quote_number)
                } else {
                    setError("Projet introuvable")
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    function handleGenerateQuote() {
        if (!projectId || !token) return
        setQuoteLoading(true)
        setQuoteError(null)
        fetch(`${API_URL}/api/project/${projectId}/generate-quote`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({}),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.quote_url) {
                    setQuoteUrl(data.quote_url)
                    setQuoteNumber(data.quote_number)
                } else {
                    setQuoteError("Échec de la génération du devis")
                }
                setQuoteLoading(false)
            })
            .catch(() => { setQuoteError("Erreur réseau"); setQuoteLoading(false) })
    }

    function handleValidateOrder() {
        if (!projectId || !token) return
        setOrderLoading(true)
        setOrderError(null)
        fetch(`${API_URL}/api/project/${projectId}/status`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "validated" }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setOrderConfirmed(true)
                    setProject((prev) => ({ ...prev, status: "validated" }))
                } else {
                    setOrderError("Échec de la validation")
                }
                setOrderLoading(false)
            })
            .catch(() => { setOrderError("Erreur réseau"); setOrderLoading(false) })
    }

    // ─── Styles communs ───────────────────────────────────────────────────────

    const cs   = { fontFamily: "Inter, sans-serif" } as React.CSSProperties
    const card = { maxWidth: 720, margin: "0 auto", backgroundColor: C.white, borderRadius: 16, padding: 32, boxShadow: "0 2px 12px rgba(58,64,64,0.1)" }
    const lbl  = { fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }
    const val  = { fontSize: 16, color: C.dark, fontWeight: 500 }
    const sec  = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: "1px solid " + C.border }
    const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }

    function statusConfig(s) {
        if (s === "quoted")       return { label: "Devis disponible",   bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" }
        if (s === "validated")    return { label: "Commande validée",   bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" }
        if (s === "in_production")return { label: "En production",      bg: "#fff3e0", color: "#e65100", border: "#ffcc80" }
        if (s === "delivered")    return { label: "Livré",              bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" }
        return                           { label: "En attente de devis",bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" }
    }

    // ─── États de chargement / erreur ─────────────────────────────────────────

    if (loading) return (
        <div style={cs}>
            <div style={{ ...card, textAlign: "center", color: C.muted }}>⏳ Chargement...</div>
        </div>
    )

    if (error) return (
        <div style={cs}>
            <div style={{ ...card, textAlign: "center", color: "#c0392b" }}>✗ {error}</div>
        </div>
    )

    const { status, product, quantity, pricing, brief_analysis, created_at } = project
    const sc = statusConfig(status)

    return (
        <div style={cs}>

            {/* Retour */}
            <div style={{ maxWidth: 720, margin: "0 auto 16px auto" }}>
                <a href="/projets" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
                    ← Mes projets
                </a>
            </div>

            <div style={card}>

                {/* ── En-tête ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark }}>
                            {brief_analysis?.product_type || product?.label || "Projet"}
                        </div>
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{projectId}</div>
                    </div>
                    <div style={{ backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
                        {sc.label}
                    </div>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                    Créé le {new Date(created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </div>

                {/* ── Timeline ── */}
                <div style={{ borderTop: "1px solid " + C.border, paddingTop: 24, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
                        Suivi de commande
                    </div>
                    <ProjectTimeline status={status} />
                </div>

                {/* ── Résumé commande ── */}
                <div style={sec}>Résumé de la commande</div>
                <div style={grid}>
                    <div>
                        <div style={lbl}>Produit</div>
                        <div style={val}>{product?.label || "—"}</div>
                    </div>
                    <div>
                        <div style={lbl}>Quantité détectée</div>
                        <div style={val}>{brief_analysis?.quantity_detected ?? quantity ?? "—"} ex.</div>
                    </div>
                    <div>
                        <div style={lbl}>Dimensions</div>
                        <div style={val}>{brief_analysis?.dimensions || "—"}</div>
                    </div>
                    <div>
                        <div style={lbl}>Délai livraison</div>
                        <div style={val}>{brief_analysis?.delivery_deadline || "Non précisé"}</div>
                    </div>
                </div>

                {/* ── Spécifications ── */}
                <div style={sec}>Spécifications techniques</div>
                <div style={grid}>
                    <div>
                        <div style={lbl}>Support</div>
                        <div style={val}>{brief_analysis?.material || "—"}</div>
                    </div>
                    <div>
                        <div style={lbl}>Finitions</div>
                        <div style={val}>{brief_analysis?.finish || "—"}</div>
                    </div>
                </div>

                {/* Extraction brute */}
                {brief_analysis?.raw_extraction && (
                    <div style={{ marginTop: 20, backgroundColor: C.bg, borderRadius: 10, padding: 16, border: "1px solid " + C.border }}>
                        <div style={lbl}>Extraction brute du brief</div>
                        <div style={{ fontSize: 14, color: C.dark, lineHeight: 1.6, marginTop: 6 }}>{brief_analysis.raw_extraction}</div>
                    </div>
                )}

                {/* Exigences spéciales */}
                {brief_analysis?.special_requirements?.length > 0 && (
                    <>
                        <div style={sec}>Exigences spéciales</div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {brief_analysis.special_requirements.map((req, i) => (
                                <li key={i} style={{ fontSize: 14, color: C.dark, marginBottom: 6, lineHeight: 1.5 }}>{req}</li>
                            ))}
                        </ul>
                    </>
                )}

                {/* ── Tarification ── */}
                <div style={sec}>Tarification</div>
                <div style={grid}>
                    <div>
                        <div style={lbl}>Prix unitaire HT</div>
                        <div style={val}>{pricing?.unit_net != null ? pricing.unit_net + " " + (pricing.currency || "EUR") : "En attente"}</div>
                    </div>
                    <div>
                        <div style={lbl}>Total HT</div>
                        <div style={{ ...val, fontSize: 20, fontWeight: 700 }}>
                            {pricing?.total_net != null ? pricing.total_net + " " + (pricing.currency || "EUR") : "En attente"}
                        </div>
                    </div>
                </div>

                {/* ── Devis & validation ── */}
                <div style={{ marginTop: 32 }}>
                    {quoteUrl ? (
                        <div>
                            {quoteNumber && (
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, textAlign: "center" }}>
                                    Devis n° <strong>{quoteNumber}</strong>
                                </div>
                            )}
                            <a
                                href={quoteUrl}
                                target="_blank"
                                style={{ display: "block", textAlign: "center", backgroundColor: C.dark, color: C.white, borderRadius: 10, padding: "14px 24px", fontWeight: 600, fontSize: 15, textDecoration: "none", marginBottom: 12 }}
                            >
                                📄 Télécharger le devis
                            </a>
                            {!orderConfirmed && status !== "validated" && status !== "in_production" && status !== "delivered" && (
                                <button
                                    onClick={handleValidateOrder}
                                    disabled={orderLoading}
                                    style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: orderLoading ? C.muted : C.yellow, color: C.dark, borderRadius: 10, padding: "14px 24px", fontWeight: 700, fontSize: 15, border: "none", cursor: orderLoading ? "not-allowed" : "pointer" }}
                                >
                                    {orderLoading ? "⏳ Validation en cours..." : "✅ Valider la commande"}
                                </button>
                            )}
                            {orderConfirmed && (
                                <div style={{ marginTop: 12, textAlign: "center", backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8", borderRadius: 10, padding: "14px 24px", fontSize: 15, color: "#1a7a3c", fontWeight: 600 }}>
                                    ✅ Commande validée — nous revenons vers vous rapidement.
                                </div>
                            )}
                            {orderError && (
                                <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#c0392b" }}>✗ {orderError}</div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={handleGenerateQuote}
                                disabled={quoteLoading}
                                style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: quoteLoading ? C.muted : C.yellow, color: C.dark, borderRadius: 10, padding: "14px 24px", fontWeight: 700, fontSize: 15, border: "none", cursor: quoteLoading ? "not-allowed" : "pointer" }}
                            >
                                {quoteLoading ? "⏳ Génération en cours..." : "Générer le devis"}
                            </button>
                            {quoteError && (
                                <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#c0392b" }}>✗ {quoteError}</div>
                            )}
                            {!quoteLoading && !quoteError && (
                                <div style={{ marginTop: 12, textAlign: "center", backgroundColor: C.bg, border: "1px dashed " + C.border, borderRadius: 10, padding: "12px 24px", fontSize: 13, color: C.muted }}>
                                    Le devis sera généré à partir de l'analyse du brief.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Liens actions ── */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <a
                        href={"/quote-validation?project_id=" + projectId + "&account_id=" + accountId}
                        style={{ display: "block", textAlign: "center", fontSize: 14, color: C.dark, textDecoration: "none", fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        📋 Devis à valider →
                    </a>
                    <a
                        href={"/consultations?project_id=" + projectId + "&account_id=" + accountId}
                        style={{ display: "block", textAlign: "center", fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500, padding: "10px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        🔗 Voir les consultations fournisseurs →
                    </a>
                    <a
                        href={"/production?project_id=" + projectId + "&account_id=" + accountId}
                        style={{ display: "block", textAlign: "center", fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500, padding: "10px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        📁 Fichiers & suivi production →
                    </a>
                    <a
                        href={"/messages?project_id=" + projectId + "&account_id=" + accountId}
                        style={{ display: "block", textAlign: "center", fontSize: 14, color: C.dark, textDecoration: "none", fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        💬 Messages →
                    </a>
                </div>

            </div>
        </div>
    )
}
