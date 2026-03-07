"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import ProjectTimeline from "@/components/shared/ProjectTimeline"
import { Clock, XCircle, FileText, CheckCircle, ClipboardList, Link2, FolderOpen, MessageSquare, Eye, Loader2 } from "lucide-react"
import PdfViewerModal from "@/components/ui/PdfViewerModal"
import { formatPrice, formatDate, formatDateShort } from "@/lib/format"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Quote {
    quote_number: string
    version: number
    validated: boolean
    quote_url: string
    created_at?: string
    generated_at?: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [project, setProject] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [clientValidateLoading, setClientValidateLoading] = useState(false)
    const [clientValidated, setClientValidated] = useState(false)
    const [clientValidateError, setClientValidateError] = useState<string | null>(null)
    const [confirmQuote, setConfirmQuote] = useState<Quote | null>(null)
    const [pdfModal, setPdfModal] = useState<{ url: string; title: string } | null>(null)

    const searchParams = useSearchParams()
    const projectId = searchParams.get("project_id")
    const accountId = searchParams.get("account_id") || (typeof window !== "undefined" ? localStorage.getItem("account_id") : "") || ""

    function fetchProject() {
        if (!projectId || !token) return
        fetch(`${API_URL}/api/project/${projectId}?account_id=${accountId}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.project) {
                    setProject(data.project)
                    setQuotes(data.project.quotes || [])
                } else {
                    setError("Projet introuvable")
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }
        if (!projectId) { setError("project_id manquant"); setLoading(false); return }
        fetchProject()
    }, [token, isAuthenticated, authLoading])

    function handleClientValidateQuote(quote: Quote) {
        if (!projectId || !token) return
        setClientValidateLoading(true)
        setClientValidateError(null)
        fetch(`${API_URL}/api/project/${projectId}/client-validate-quote`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ quote_number: quote.quote_number }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setClientValidated(true)
                    setConfirmQuote(null)
                    fetchProject()
                    if (data.checkout_url) {
                        window.open(data.checkout_url, "_blank")
                    }
                } else {
                    setClientValidateError(data.error || "Échec de la validation")
                }
                setClientValidateLoading(false)
            })
            .catch(() => { setClientValidateError("Erreur réseau"); setClientValidateLoading(false) })
    }

    // ─── Styles communs ───────────────────────────────────────────────────────

    const cs   = { fontFamily: "Inter, sans-serif" } as React.CSSProperties
    const card = { maxWidth: 720, margin: "0 auto", backgroundColor: C.white, borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }
    const lbl  = { fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }
    const val  = { fontSize: 16, color: C.dark, fontWeight: 500 }
    const sec  = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: "1px solid " + C.border }
    const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }

    function statusConfig(s: string) {
        if (s === "quoted")       return { label: "Devis disponible",   bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" }
        if (s === "validated")    return { label: "Commande validée",   bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" }
        if (s === "in_production")return { label: "En production",      bg: "#fff3e0", color: "#e65100", border: "#ffcc80" }
        if (s === "delivered")    return { label: "Livré",              bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" }
        return                           { label: "En attente de devis",bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" }
    }

    // ─── États de chargement / erreur ─────────────────────────────────────────

    if (loading) return (
        <div style={cs}>
            <div style={{ ...card, textAlign: "center", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Clock size={16} /> Chargement...
            </div>
        </div>
    )

    if (error) return (
        <div style={cs}>
            <div style={{ ...card, textAlign: "center", color: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <XCircle size={16} /> {error}
            </div>
        </div>
    )

    const { status, product, quantity, pricing, brief_analysis, created_at } = project
    const sc = statusConfig(status)

    // Devis logic
    const adminValidatedQuote = quotes.find((q: Quote) => q.validated)
    const hasQuotes = quotes.length > 0
    const alreadyClientValidated = clientValidated || status === "validated" || status === "in_production" || status === "delivered"

    return (
        <div style={cs}>

            {/* Retour */}
            <div style={{ maxWidth: 720, margin: "0 auto 16px auto" }}>
                <a href="/projets" className="nav-link" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
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
                    <div style={{ backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                        {sc.label}
                    </div>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                    Créé le {formatDate(created_at)}
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
                            {brief_analysis.special_requirements.map((req: string, i: number) => (
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
                        <div style={val}>{pricing?.unit_net != null ? formatPrice(pricing.unit_net) : "En attente"}</div>
                    </div>
                    <div>
                        <div style={lbl}>Total HT</div>
                        <div style={{ ...val, fontSize: 20, fontWeight: 700 }}>
                            {pricing?.total_net != null ? formatPrice(pricing.total_net) : "En attente"}
                        </div>
                    </div>
                </div>

                {/* ── Devis client ── */}
                <div style={sec}>Votre devis</div>
                <div style={{ marginTop: 0 }}>
                    {/* Cas 1 : Devis validé par l'admin → le client peut valider */}
                    {adminValidatedQuote ? (
                        <div>
                            <div style={{
                                padding: "16px 20px", borderRadius: 10,
                                border: "1px solid #bbf7d0", background: "#f0fdf4",
                                marginBottom: 14,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <CheckCircle size={16} style={{ color: "#166534" }} />
                                    <span style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>
                                        Devis {adminValidatedQuote.quote_number}
                                    </span>
                                    <span style={{
                                        padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        background: "#e8f8ee", color: "#166534", marginLeft: 4,
                                    }}>
                                        Validé
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.muted }}>
                                    {pricing?.total_net != null && (
                                        <span>Montant : <strong style={{ color: C.dark }}>{formatPrice(pricing.total_net)}</strong></span>
                                    )}
                                    <span>Date : {formatDateShort(adminValidatedQuote.generated_at || adminValidatedQuote.created_at || "")}</span>
                                </div>
                            </div>

                            {/* Bouton Voir le devis */}
                            <button
                                onClick={() => setPdfModal({ url: adminValidatedQuote.quote_url, title: `Devis ${adminValidatedQuote.quote_number}` })}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    width: "100%", padding: "12px 24px", borderRadius: 8,
                                    border: "1px solid " + C.border, background: C.white, color: C.dark,
                                    fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10,
                                }}
                            >
                                <Eye size={16} /> Voir le devis
                            </button>

                            {/* Bouton Valider + payer */}
                            {!alreadyClientValidated && (
                                <button
                                    onClick={() => setConfirmQuote(adminValidatedQuote)}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                        width: "100%", padding: "14px 24px", borderRadius: 8,
                                        border: "none", background: "#F4CF15", color: "#000000",
                                        fontSize: 15, fontWeight: 700, cursor: "pointer",
                                    }}
                                >
                                    <CheckCircle size={16} /> Valider ce devis et procéder au paiement
                                </button>
                            )}

                            {/* Déjà validé par le client */}
                            {alreadyClientValidated && (
                                <div style={{
                                    marginTop: 4, textAlign: "center",
                                    backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8", borderRadius: 8,
                                    padding: "14px 24px", fontSize: 15, color: "#1a7a3c", fontWeight: 600,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}>
                                    <CheckCircle size={16} /> Devis validé — nous revenons vers vous rapidement.
                                </div>
                            )}

                            {clientValidateError && (
                                <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    <XCircle size={14} /> {clientValidateError}
                                </div>
                            )}
                        </div>
                    ) : hasQuotes ? (
                        /* Cas 2 : Des devis existent mais aucun validé par l'admin */
                        <div style={{
                            padding: "16px 20px", borderRadius: 10,
                            border: "1px solid #fde68a", background: "#fef9e0",
                            textAlign: "center",
                        }}>
                            <Clock size={18} style={{ color: "#b89a00", marginBottom: 6 }} />
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#b89a00" }}>
                                Devis en cours de préparation
                            </div>
                            <div style={{ fontSize: 13, color: "#b89a00", marginTop: 4 }}>
                                Votre devis est en cours de validation par notre équipe. Vous serez notifié dès qu'il sera prêt.
                            </div>
                        </div>
                    ) : (
                        /* Cas 3 : Aucun devis */
                        <div style={{
                            padding: "16px 20px", borderRadius: 10,
                            border: "1px dashed " + C.border, background: C.bg,
                            textAlign: "center",
                        }}>
                            <FileText size={18} style={{ color: C.muted, marginBottom: 6 }} />
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>
                                En attente de votre devis
                            </div>
                            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                                Notre équipe prépare votre devis à partir de l'analyse du brief.
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Liens actions ── */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <a
                        href={"/quote-validation?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, color: C.dark, textDecoration: "none", fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        <ClipboardList size={16} /> Devis à valider →
                    </a>
                    <a
                        href={"/consultations?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500, padding: "10px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        <Link2 size={16} /> Voir les consultations fournisseurs →
                    </a>
                    <a
                        href={"/production?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500, padding: "10px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        <FolderOpen size={16} /> Fichiers & suivi production →
                    </a>
                    <a
                        href={"/messages?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, color: C.dark, textDecoration: "none", fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.bg }}
                    >
                        <MessageSquare size={16} /> Messages →
                    </a>
                </div>

            </div>

            {/* ── Modale confirmation validation devis ── */}
            {confirmQuote && (
                <>
                    <div onClick={() => setConfirmQuote(null)} style={{
                        position: "fixed", inset: 0, zIndex: 1500,
                        backgroundColor: "rgba(0,0,0,0.5)",
                    }} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)", zIndex: 1501,
                        background: "#FAFFFD", borderRadius: 12, padding: 28,
                        boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
                        maxWidth: 440, width: "90vw", fontFamily: "Inter, sans-serif",
                    }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#000000", marginBottom: 12 }}>
                            Confirmer la validation
                        </div>
                        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>
                            En validant le devis <strong style={{ color: "#000000" }}>{confirmQuote.quote_number}</strong>, vous confirmez votre commande.
                        </div>
                        <div style={{
                            padding: "10px 14px", borderRadius: 8,
                            background: "#fef9e0", border: "1px solid #fde68a",
                            fontSize: 13, color: "#b89a00", marginBottom: 20, lineHeight: 1.5,
                        }}>
                            Un acompte de 30% sera demandé.
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setConfirmQuote(null)}
                                style={{
                                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                                    border: "1px solid " + C.border, background: "#FAFFFD", color: "#000000",
                                    cursor: "pointer",
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleClientValidateQuote(confirmQuote)}
                                disabled={clientValidateLoading}
                                style={{
                                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                                    border: "none", background: "#F4CF15", color: "#000000",
                                    cursor: clientValidateLoading ? "wait" : "pointer",
                                    opacity: clientValidateLoading ? 0.7 : 1,
                                    display: "flex", alignItems: "center", gap: 6,
                                }}
                            >
                                {clientValidateLoading ? (
                                    <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Validation...</>
                                ) : (
                                    <><CheckCircle size={14} /> Confirmer</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {pdfModal && (
                <PdfViewerModal
                    url={pdfModal.url}
                    isOpen={true}
                    onClose={() => setPdfModal(null)}
                    title={pdfModal.title}
                />
            )}
        </div>
    )
}
