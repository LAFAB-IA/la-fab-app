"use client"

import React, { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { API_URL } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import ProjectTimeline from "@/components/shared/ProjectTimeline"
import { Clock, XCircle, FileText, CheckCircle, ClipboardList, Link2, FolderOpen, MessageSquare, Eye, Loader2 } from "lucide-react"
import PdfViewerModal from "@/components/ui/PdfViewerModal"
import useFocusTrap from "@/hooks/useFocusTrap"
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

// ─── Shared className strings ─────────────────────────────────────────────

const lbl = "text-xs text-[#7a8080] font-semibold uppercase tracking-[1px] mb-1"
const val = "text-base text-black font-medium"
const sec = "text-[11px] font-bold text-[#7a8080] uppercase tracking-[1px] mb-4 mt-8 pb-2 border-b border-[#e0e0de]"
const grid = "dash-grid grid grid-cols-2 gap-x-8 gap-y-5"
const card = "dash-card max-w-[720px] mx-auto bg-[#FAFFFD] rounded-xl p-8 shadow-[0_1px_3px_rgba(58,64,64,0.08)]"

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
    const confirmModalRef = useRef<HTMLDivElement>(null)
    useFocusTrap(!!confirmQuote, confirmModalRef, () => setConfirmQuote(null))

    const searchParams = useSearchParams()
    const projectId = searchParams.get("project_id")
    const accountId = searchParams.get("account_id") || (typeof window !== "undefined" ? localStorage.getItem("account_id") : "") || ""

    function fetchProject() {
        if (!projectId || !token) return
        fetchWithAuth(`${API_URL}/api/project/${projectId}?account_id=${accountId}`)
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
        fetchWithAuth(`${API_URL}/api/project/${projectId}/client-validate-quote`, {
            method: "POST",
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

    function statusConfig(s: string) {
        if (s === "quoted")        return { label: "Devis disponible",    className: "bg-[#e8f8ee] text-[#1a7a3c] border-[#a8dbb8]" }
        if (s === "validated")     return { label: "Commande validée",    className: "bg-[#e8f0fe] text-[#1a3c7a] border-[#a8b8db]" }
        if (s === "in_production") return { label: "En production",       className: "bg-[#fff3e0] text-[#e65100] border-[#ffcc80]" }
        if (s === "delivered")     return { label: "Livré",               className: "bg-[#e0f2f1] text-[#004d40] border-[#80cbc4]" }
        return                            { label: "En attente de devis", className: "bg-[#fef9e0] text-[#b89a00] border-[#f4cf1588]" }
    }

    // ─── États de chargement / erreur ─────────────────────────────────────────

    if (loading) return (
        <div className="font-[Inter,_sans-serif]">
            <div className={`${card} text-center text-[#7a8080] flex items-center justify-center gap-2`}>
                <Clock size={16} /> Chargement...
            </div>
        </div>
    )

    if (error) return (
        <div className="font-[Inter,_sans-serif]">
            <div className={`${card} text-center text-[#c0392b] flex items-center justify-center gap-2`}>
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
        <div className="font-[Inter,_sans-serif]">

            {/* Retour */}
            <div className="max-w-[720px] mx-auto mb-4">
                <a href="/projets" className="nav-link text-[#7a8080] text-sm no-underline font-medium">
                    ← Mes projets
                </a>
            </div>

            <div className={card}>

                {/* ── En-tête ── */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="dash-heading text-[22px] font-bold text-black">
                            {brief_analysis?.product_type || product?.label || "Projet"}
                        </div>
                        <div className="text-[13px] text-[#7a8080] mt-1">{projectId}</div>
                    </div>
                    <div className={`border rounded-md px-2.5 py-1 text-xs font-semibold ${sc.className}`}>
                        {sc.label}
                    </div>
                </div>
                <div className="text-[13px] text-[#7a8080] mb-6">
                    Créé le {formatDate(created_at)}
                </div>

                {/* ── Timeline ── */}
                <div className="border-t border-[#e0e0de] pt-6 mb-2">
                    <div className="text-[11px] font-bold text-[#7a8080] uppercase tracking-[1px] mb-5">
                        Suivi de commande
                    </div>
                    <ProjectTimeline status={status} />
                </div>

                {/* ── Résumé commande ── */}
                <div className={sec}>Résumé de la commande</div>
                <div className={grid}>
                    <div>
                        <div className={lbl}>Produit</div>
                        <div className={val}>{product?.label || "—"}</div>
                    </div>
                    <div>
                        <div className={lbl}>Quantité détectée</div>
                        <div className={val}>{brief_analysis?.quantity_detected ?? quantity ?? "—"} ex.</div>
                    </div>
                    <div>
                        <div className={lbl}>Dimensions</div>
                        <div className={val}>{brief_analysis?.dimensions || "—"}</div>
                    </div>
                    <div>
                        <div className={lbl}>Délai livraison</div>
                        <div className={val}>{brief_analysis?.delivery_deadline || "Non précisé"}</div>
                    </div>
                </div>

                {/* ── Spécifications ── */}
                <div className={sec}>Spécifications techniques</div>
                <div className={grid}>
                    <div>
                        <div className={lbl}>Support</div>
                        <div className={val}>{brief_analysis?.material || "—"}</div>
                    </div>
                    <div>
                        <div className={lbl}>Finitions</div>
                        <div className={val}>{brief_analysis?.finish || "—"}</div>
                    </div>
                </div>

                {/* Extraction brute */}
                {brief_analysis?.raw_extraction && (
                    <div className="mt-5 bg-[#f0f0ee] rounded-[10px] p-4 border border-[#e0e0de]">
                        <div className={lbl}>Extraction brute du brief</div>
                        <div className="text-sm text-black leading-relaxed mt-1.5">{brief_analysis.raw_extraction}</div>
                    </div>
                )}

                {/* Exigences spéciales */}
                {brief_analysis?.special_requirements?.length > 0 && (
                    <>
                        <div className={sec}>Exigences spéciales</div>
                        <ul className="m-0 pl-5">
                            {brief_analysis.special_requirements.map((req: string, i: number) => (
                                <li key={i} className="text-sm text-black mb-1.5 leading-normal">{req}</li>
                            ))}
                        </ul>
                    </>
                )}

                {/* ── Tarification ── */}
                <div className={sec}>Tarification</div>
                <div className={grid}>
                    <div>
                        <div className={lbl}>Prix unitaire HT</div>
                        <div className={val}>{pricing?.unit_net != null ? formatPrice(pricing.unit_net) : "En attente"}</div>
                    </div>
                    <div>
                        <div className={lbl}>Total HT</div>
                        <div className="text-xl font-bold text-black">
                            {pricing?.total_net != null ? formatPrice(pricing.total_net) : "En attente"}
                        </div>
                    </div>
                </div>

                {/* ── Devis client ── */}
                <div className={sec}>Votre devis</div>
                <div>
                    {/* Cas 1 : Devis validé par l'admin → le client peut valider */}
                    {adminValidatedQuote ? (
                        <div>
                            <div className="px-5 py-4 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] mb-3.5">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={16} className="text-[#166534]" />
                                    <span className="text-[15px] font-bold text-[#166534]">
                                        Devis {adminValidatedQuote.quote_number}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f8ee] text-[#166534] ml-1">
                                        Validé
                                    </span>
                                </div>
                                <div className="flex gap-4 text-[13px] text-[#7a8080]">
                                    {pricing?.total_net != null && (
                                        <span>Montant : <strong className="text-black">{formatPrice(pricing.total_net)}</strong></span>
                                    )}
                                    <span>Date : {formatDateShort(adminValidatedQuote.generated_at || adminValidatedQuote.created_at || "")}</span>
                                </div>
                            </div>

                            {/* Bouton Voir le devis */}
                            <button
                                onClick={() => setPdfModal({ url: adminValidatedQuote.quote_url, title: `Devis ${adminValidatedQuote.quote_number}` })}
                                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg border border-[#e0e0de] bg-[#FAFFFD] text-black text-sm font-semibold cursor-pointer mb-2.5"
                            >
                                <Eye size={16} /> Voir le devis
                            </button>

                            {/* Bouton Valider + payer */}
                            {!alreadyClientValidated && (
                                <button
                                    onClick={() => setConfirmQuote(adminValidatedQuote)}
                                    className="btn-primary flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-lg border-0 bg-[#F4CF15] text-black text-[15px] font-bold cursor-pointer"
                                >
                                    <CheckCircle size={16} /> Valider ce devis et procéder au paiement
                                </button>
                            )}

                            {/* Déjà validé par le client */}
                            {alreadyClientValidated && (
                                <div className="mt-1 text-center bg-[#e8f8ee] border border-[#a8dbb8] rounded-lg px-6 py-3.5 text-[15px] text-[#1a7a3c] font-semibold flex items-center justify-center gap-2">
                                    <CheckCircle size={16} /> Devis validé — nous revenons vers vous rapidement.
                                </div>
                            )}

                            {clientValidateError && (
                                <div className="mt-3 text-center text-sm text-[#c0392b] flex items-center justify-center gap-2">
                                    <XCircle size={14} /> {clientValidateError}
                                </div>
                            )}
                        </div>
                    ) : hasQuotes ? (
                        /* Cas 2 : Des devis existent mais aucun validé par l'admin */
                        <div className="px-5 py-4 rounded-[10px] border border-[#fde68a] bg-[#fef9e0] text-center">
                            <Clock size={18} className="text-[#b89a00] mb-1.5 block mx-auto" />
                            <div className="text-sm font-semibold text-[#b89a00]">
                                Devis en cours de préparation
                            </div>
                            <div className="text-[13px] text-[#b89a00] mt-1">
                                Votre devis est en cours de validation par notre équipe. Vous serez notifié dès qu'il sera prêt.
                            </div>
                        </div>
                    ) : (
                        /* Cas 3 : Aucun devis */
                        <div className="px-5 py-4 rounded-[10px] border border-dashed border-[#e0e0de] bg-[#f0f0ee] text-center">
                            <FileText size={18} className="text-[#7a8080] mb-1.5 block mx-auto" />
                            <div className="text-sm font-semibold text-[#7a8080]">
                                En attente de votre devis
                            </div>
                            <div className="text-[13px] text-[#7a8080] mt-1">
                                Notre équipe prépare votre devis à partir de l'analyse du brief.
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Liens actions ── */}
                <div className="mt-5 flex flex-col gap-2.5">
                    <a
                        href={"/quote-validation?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm text-black no-underline font-semibold px-4 py-2.5 rounded-lg border border-[#e0e0de] bg-[#f0f0ee]"
                    >
                        <ClipboardList size={16} /> Devis à valider →
                    </a>
                    <a
                        href={"/consultations?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm text-[#7a8080] no-underline font-medium px-2.5 py-2.5 rounded-lg border border-[#e0e0de] bg-[#f0f0ee]"
                    >
                        <Link2 size={16} /> Voir les consultations fournisseurs →
                    </a>
                    <a
                        href={"/production?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm text-[#7a8080] no-underline font-medium px-2.5 py-2.5 rounded-lg border border-[#e0e0de] bg-[#f0f0ee]"
                    >
                        <FolderOpen size={16} /> Fichiers & suivi production →
                    </a>
                    <a
                        href={"/messages?project_id=" + projectId + "&account_id=" + accountId}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm text-black no-underline font-semibold px-4 py-2.5 rounded-lg border border-[#e0e0de] bg-[#f0f0ee]"
                    >
                        <MessageSquare size={16} /> Messages →
                    </a>
                </div>

            </div>

            {/* ── Modale confirmation validation devis ── */}
            {confirmQuote && (
                <>
                    <div onClick={() => setConfirmQuote(null)} className="fixed inset-0 z-[1500] bg-black/50" />
                    <div ref={confirmModalRef} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1501] bg-[#FAFFFD] rounded-xl p-7 shadow-[0_16px_48px_rgba(0,0,0,0.25)] max-w-[440px] w-[90vw] font-[Inter,_sans-serif]">
                        <div id="confirm-modal-title" className="text-[17px] font-bold text-black mb-3">
                            Confirmer la validation
                        </div>
                        <div className="text-sm text-[#7a8080] leading-relaxed mb-2">
                            En validant le devis <strong className="text-black">{confirmQuote.quote_number}</strong>, vous confirmez votre commande.
                        </div>
                        <div className="px-3.5 py-2.5 rounded-lg bg-[#fef9e0] border border-[#fde68a] text-[13px] text-[#b89a00] mb-5 leading-normal">
                            Un acompte de 30% sera demandé.
                        </div>
                        <div className="dash-confirm-btns flex gap-2.5 justify-end">
                            <button
                                onClick={() => setConfirmQuote(null)}
                                className="btn-secondary px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#e0e0de] bg-[#FAFFFD] text-black cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleClientValidateQuote(confirmQuote)}
                                disabled={clientValidateLoading}
                                className={`btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-0 bg-[#F4CF15] text-black text-sm font-bold ${clientValidateLoading ? "cursor-wait opacity-70" : "cursor-pointer"}`}
                            >
                                {clientValidateLoading ? (
                                    <><Loader2 size={14} className="animate-spin" /> Validation...</>
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

            <style>{`
                @media (max-width: 768px) {
                    .dash-grid { grid-template-columns: 1fr !important; gap: 12px 0 !important; }
                    .dash-card { padding: 20px 16px !important; }
                    .dash-heading { font-size: 18px !important; }
                    .dash-confirm-btns { flex-direction: column !important; }
                    .dash-confirm-btns button { width: 100% !important; justify-content: center; }
                }
                @media (max-width: 375px) {
                    .dash-card { padding: 16px 12px !important; }
                    .dash-heading { font-size: 16px !important; }
                }
            `}</style>
        </div>
    )
}
