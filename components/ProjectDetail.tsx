"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import ProjectTimeline from "@/components/shared/ProjectTimeline"
import StatusBadge from "@/components/shared/StatusBadge"
import { FileText, Download, FileSpreadsheet, FileImage, FileType, File, Layers, AlertTriangle, Upload, Plus, CalendarDays, GripVertical, Trash2, Save, CreditCard, CheckCircle2, Clock, Eye, EyeOff, Check, MessageSquare } from "lucide-react"
import PdfViewerModal from "@/components/ui/PdfViewerModal"
import { formatPrice, formatDate, projectDisplayName } from "@/lib/format"

interface ProjectDetailProps {
    projectId?: string
    onClose?: () => void
}

export default function ProjectDetail({ projectId: propId, onClose }: ProjectDetailProps = {}) {
    const { token, isAuthenticated, isLoading: authLoading, user } = useAuth()
    const params = useParams()
    const id = propId || (params.id as string)

    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Invoices
    const [invoices, setInvoices] = useState<any[]>([])
    const [invoicesLoading, setInvoicesLoading] = useState(false)

    // Briefs
    const [briefs, setBriefs] = useState<any[]>([])
    const [briefsLoading, setBriefsLoading] = useState(false)
    const [showUpload, setShowUpload] = useState(false)
    const [showBrief, setShowBrief] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Brief PDF viewer
    const [briefPdfUrl, setBriefPdfUrl] = useState<string | null>(null)
    const [briefPdfOpen, setBriefPdfOpen] = useState(false)
    const [briefPdfTitle, setBriefPdfTitle] = useState("")

    // Toast
    const [toast, setToast] = useState<{ type: "info" | "error"; message: string; visible: boolean } | null>(null)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Pay button loading
    const [payLoading, setPayLoading] = useState(false)

    // Messages
    const [messages, setMessages] = useState<any[]>([])
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [msgText, setMsgText] = useState("")
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesSectionRef = useRef<HTMLDivElement>(null)

    // Editable product list
    const [productList, setProductList] = useState<Array<{ id: string; name: string; quantity: number; width: number; height: number; unit: string }>>([])
    const [productsDirty, setProductsDirty] = useState(false)
    const [savingProducts, setSavingProducts] = useState(false)
    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
    const [estimatedDimensions, setEstimatedDimensions] = useState<Set<string>>(new Set())

    // Fetch project
    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token || !id) { setError("Non authentifié"); setLoading(false); return }

        fetchWithAuth(`${API_URL}/api/project/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.project) setProject(data.project)
                else setError("Projet introuvable")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading, id])

    // Fetch invoices
    useEffect(() => {
        if (!token || !id || !project) return
        setInvoicesLoading(true)
        fetchWithAuth(`${API_URL}/api/invoice/list?project_id=${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices || [])
                setInvoicesLoading(false)
            })
            .catch(() => setInvoicesLoading(false))
    }, [token, id, project])

    // Fetch messages
    useEffect(() => {
        if (!token || !id || !project) return
        setMessagesLoading(true)
        fetchWithAuth(`${API_URL}/api/project/${id}/messages`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setMessages(data.messages || [])
                setMessagesLoading(false)
            })
            .catch(() => setMessagesLoading(false))
    }, [token, id, project])

    // Fetch briefs
    const fetchBriefs = React.useCallback(() => {
        if (!token || !id) return
        setBriefsLoading(true)
        fetchWithAuth(`${API_URL}/api/project/${id}/briefs`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setBriefs(data.briefs || [])
                setBriefsLoading(false)
            })
            .catch(() => setBriefsLoading(false))
    }, [token, id])

    useEffect(() => {
        if (!project) return
        fetchBriefs()
    }, [project, fetchBriefs])

    // Scroll to bottom of messages only after sending a new message
    function scrollMessagesToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }

    function handleSendMessage() {
        if (!token || !msgText.trim() || sending) return
        setSending(true)
        fetchWithAuth(`${API_URL}/api/project/${id}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: msgText.trim() }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.message) {
                    setMessages((prev) => [...prev, data.message])
                    setMsgText("")
                    setTimeout(scrollMessagesToBottom, 100)
                }
                setSending(false)
            })
            .catch(() => setSending(false))
    }

    function handlePay(invoiceId: string, step: string) {
        if (!token) return
        fetchWithAuth(`${API_URL}/api/stripe/create-checkout/${invoiceId}?step=${step}`, {
            method: "POST",
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.checkout_url) window.location.href = data.checkout_url
            })
            .catch(() => {})
    }

    function handleUploadBrief(file: globalThis.File) {
        if (!token || !id || uploading) return
        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        fetchWithAuth(`${API_URL}/api/project/${id}/upload-brief`, {
            method: "POST",
            body: formData,
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    fetchBriefs()
                    setShowUpload(false)
                }
                setUploading(false)
            })
            .catch(() => setUploading(false))
    }

    function showToast(type: "info" | "error", message: string, duration = 4000) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ type, message, visible: true })
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => prev ? { ...prev, visible: false } : null)
            setTimeout(() => setToast(null), 400)
        }, duration)
    }

    async function handleOpenBrief(briefId: string, title?: string) {
        try {
            const url = `${API_URL}/api/project/brief/signed-url?project_id=${id}&brief_id=${briefId}`
            const res = await fetchWithAuth(url)
            const data = await res.json()
            if (data.ok && data.file_url) {
                setBriefPdfUrl(data.file_url)
                setBriefPdfTitle(title || "Brief")
                setBriefPdfOpen(true)
            }
        } catch (e) {
            console.error("[handleOpenBrief] error:", e)
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleUploadBrief(file)
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) handleUploadBrief(file)
    }

    function getBriefIcon(url: string) {
        const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
        if (["jpg", "jpeg", "png", "webp"].includes(ext)) return { Icon: FileImage, label: "image" }
        if (["xlsx", "xls", "csv"].includes(ext)) return { Icon: FileSpreadsheet, label: "tableur" }
        if (ext === "pptx") return { Icon: FileType, label: "présentation" }
        if (ext === "pdf") return { Icon: FileText, label: "PDF" }
        return { Icon: File, label: ext.toUpperCase() || "fichier" }
    }

    // Initialize product list from brief_analysis
    useEffect(() => {
        const analysis = briefs?.[0]?.brief_analysis ?? project?.brief_analysis
        if (!analysis?.products || !Array.isArray(analysis.products)) return
        const estimated = new Set<string>()
        const products = analysis.products.map((p: any, i: number) => {
            const dims = p.dimensions || ""
            let w = 0, h = 0, unit = "mm"
            const dimMatch = dims.match(/(\d+)\s*[x×]\s*(\d+)\s*(mm|cm)?/i)
            if (dimMatch) { w = parseInt(dimMatch[1]); h = parseInt(dimMatch[2]); unit = dimMatch[3] || "mm" }
            const name = p.product_type || p.name || ""
            const prodId = `prod_${i}_${Date.now()}`
            // Auto-fill dimensions from format detection
            if (w === 0 && h === 0) {
                const fmt = detectFormat(name)
                if (fmt) { w = fmt.w; h = fmt.h; estimated.add(prodId) }
            }
            return {
                id: prodId,
                name,
                quantity: parseInt(p.quantity || p.quantity_detected || "0") || 0,
                width: w, height: h, unit,
            }
        })
        setProductList(products)
        setEstimatedDimensions(estimated)
        setProductsDirty(false)
    }, [briefs, project])

    const FORMAT_MAP: Record<string, { w: number; h: number }> = {
        "a0": { w: 841, h: 1189 }, "a1": { w: 594, h: 841 }, "a2": { w: 420, h: 594 },
        "a3": { w: 297, h: 420 }, "a4": { w: 210, h: 297 }, "a5": { w: 148, h: 210 }, "a6": { w: 105, h: 148 },
        "carte de visite": { w: 85, h: 55 }, "cartes de visite": { w: 85, h: 55 },
        "flyer": { w: 148, h: 210 }, "flyer a5": { w: 148, h: 210 },
        "affiche": { w: 420, h: 594 }, "poster": { w: 420, h: 594 },
        "kakemono": { w: 800, h: 2000 },
        "banderole": { w: 3000, h: 1000 },
        "roll-up": { w: 850, h: 2000 }, "rollup": { w: 850, h: 2000 },
        "bache": { w: 3000, h: 2000 }, "bâche": { w: 3000, h: 2000 },
    }

    function detectFormat(name: string): { w: number; h: number } | null {
        const lower = name.toLowerCase().trim()
        // Check A-formats first (exact word match)
        const aMatch = lower.match(/\b(a[0-6])\b/)
        if (aMatch && FORMAT_MAP[aMatch[1]]) return FORMAT_MAP[aMatch[1]]
        // Check product type keywords
        for (const key of Object.keys(FORMAT_MAP)) {
            if (key.length > 2 && lower.includes(key)) return FORMAT_MAP[key]
        }
        return null
    }

    function applyAutoFormat(name: string, current: { width: number; height: number; unit: string }) {
        const fmt = detectFormat(name)
        if (fmt) return { width: fmt.w, height: fmt.h, unit: "mm" }
        return current
    }

    function updateProduct(idx: number, field: string, value: any) {
        setProductList(prev => prev.map((p, i) => {
            if (i !== idx) return p
            const updated = { ...p, [field]: value }
            if (field === "name") {
                const fmt = detectFormat(value)
                if (fmt) {
                    updated.width = fmt.w
                    updated.height = fmt.h
                    updated.unit = "mm"
                    setEstimatedDimensions(prev => new Set(prev).add(p.id))
                }
            }
            return updated
        }))
        setProductsDirty(true)
    }

    function removeProduct(idx: number) {
        setProductList(prev => prev.filter((_, i) => i !== idx))
        setProductsDirty(true)
    }

    function addProduct() {
        setProductList(prev => [...prev, { id: `prod_new_${Date.now()}`, name: "", quantity: 1, width: 0, height: 0, unit: "mm" }])
        setProductsDirty(true)
    }

    async function saveProducts() {
        if (!token || !id || savingProducts) return
        setSavingProducts(true)
        try {
            const r = await fetchWithAuth(`${API_URL}/api/project/${id}/products`, {
                method: "PATCH",
                body: JSON.stringify({ products: productList }),
            })
            const data = await r.json()
            if (data.ok) setProductsDirty(false)
        } catch {}
        setSavingProducts(false)
    }

    function handleProductDragStart(idx: number) { setDragIdx(idx) }
    function handleProductDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx) }
    function handleProductDrop(idx: number) {
        if (dragIdx == null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
        setProductList(prev => {
            const items = [...prev]
            const [moved] = items.splice(dragIdx, 1)
            items.splice(idx, 0, moved)
            return items
        })
        setProductsDirty(true)
        setDragIdx(null)
        setDragOverIdx(null)
    }

    const lbl = { fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 2 }
    const sec = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: "1px solid " + C.border }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    if (error || !project) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>{error || "Projet introuvable"}</p>
        </div>
    )

    const { status, product, quantity, pricing, brief_analysis: _projectBriefAnalysis, created_at, quote_url, quote_number } = project
    // Prefer brief_analysis from fetched briefs (richer data with production_plan) over project-level one
    const brief_analysis = briefs?.[0]?.brief_analysis ?? _projectBriefAnalysis

    return (<>
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {!onClose && (
                    <a href="/projets" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Mes projets</a>
                )}

                <div style={{ backgroundColor: C.white, borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", marginTop: 16 }}>

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark }}>
                                {projectDisplayName(project, user?.role)}
                            </div>
                            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{id}</div>
                        </div>
                        <StatusBadge status={status} type="project" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <div style={{ fontSize: 13, color: C.muted }}>
                            Créé le {formatDate(created_at)}
                        </div>
                        <a href={`/projet/${id}/planning`} style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                            backgroundColor: C.bg, color: "#000000", textDecoration: "none",
                            border: `1px solid ${C.border}`,
                        }}>
                            <CalendarDays size={14} /> Planning partagé
                        </a>
                    </div>

                    {/* Timeline */}
                    <div style={{ borderTop: "1px solid " + C.border, paddingTop: 24, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
                            Suivi de commande
                        </div>
                        <ProjectTimeline status={status} />
                    </div>

                    {/* Project content */}
                    <div style={{ borderTop: "1px solid " + C.border, marginTop: 24 }}>

                    {/* Briefs - toggle viewer */}
                    <div style={sec}>Briefs</div>
                    {briefsLoading ? (
                        <p style={{ fontSize: 13, color: C.muted }}>Chargement des briefs...</p>
                    ) : (briefs.length > 0 || project.brief_file_url) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {/* Toggle button */}
                            <button
                                onClick={() => setShowBrief(!showBrief)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid " + C.border, borderRadius: 8, background: C.bg, fontSize: 13, fontWeight: 600, color: C.dark, cursor: "pointer", alignSelf: "flex-start" }}
                            >
                                {showBrief ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showBrief ? "Masquer le brief" : "Voir le brief"}
                                {briefs.length > 1 && ` (${briefs.length})`}
                            </button>

                            {/* Brief viewer (conditional) */}
                            {showBrief && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {briefs.length > 0 ? briefs.map((brief: any, bIdx: number) => {
                                        const fileUrl = brief.file_url || brief.brief_file_url
                                        const { Icon: BriefIcon } = fileUrl ? getBriefIcon(fileUrl) : { Icon: File }
                                        const ext = fileUrl ? fileUrl.split("?")[0].split(".").pop()?.toLowerCase() || "" : ""
                                        const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext)
                                        const isPdf = ext === "pdf"
                                        const briefId = brief.id || brief.brief_id || brief.upload_id || ""
                                        if (bIdx === 0) console.log('[Briefs] brief object keys:', Object.keys(brief), 'briefId resolved:', briefId)
                                        return (
                                            <div key={briefId || bIdx} style={{ padding: "14px 16px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: fileUrl && (isImage || isPdf) ? 12 : 0 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <BriefIcon size={16} color={C.dark} />
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                                                            {brief.file_name || brief.original_filename || `Brief ${bIdx + 1}`}
                                                        </span>
                                                        {brief.created_at && (
                                                            <span style={{ fontSize: 12, color: C.muted }}>{formatDate(brief.created_at)}</span>
                                                        )}
                                                    </div>
                                                    {fileUrl && (
                                                        <button
                                                            onClick={() => handleOpenBrief(briefId)}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", backgroundColor: C.dark, color: C.white, borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
                                                        >
                                                            <Download size={13} /> Telecharger
                                                        </button>
                                                    )}
                                                </div>
                                                {fileUrl && isImage && (
                                                    <img src={fileUrl} alt={brief.file_name || "Brief"} style={{ width: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white }} />
                                                )}
                                                {fileUrl && isPdf && (
                                                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                        <button
                                                            onClick={() => handleOpenBrief(briefId, brief.file_name || `Brief ${bIdx + 1}`)}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid " + C.border, borderRadius: 6, background: C.white, fontSize: 12, fontWeight: 600, color: C.dark, cursor: "pointer" }}
                                                        >
                                                            <FileText size={14} /> Ouvrir le PDF
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }) : project.brief_file_url ? (() => {
                                        const ext = project.brief_file_url.split("?")[0].split(".").pop()?.toLowerCase() || ""
                                        const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext)
                                        const isPdf = ext === "pdf"
                                        const { Icon: BIcon, label: bLabel } = getBriefIcon(project.brief_file_url)
                                        return (
                                            <div style={{ padding: "14px 16px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isImage || isPdf ? 12 : 0 }}>
                                                    <button
                                                        onClick={() => handleOpenBrief("legacy")}
                                                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
                                                    >
                                                        <BIcon size={14} /> Telecharger ({bLabel})
                                                    </button>
                                                </div>
                                                {isImage && (
                                                    <img src={project.brief_file_url} alt="Brief" style={{ width: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 8, border: "1px solid " + C.border, backgroundColor: C.white }} />
                                                )}
                                                {isPdf && (
                                                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                        <button
                                                            onClick={() => handleOpenBrief("legacy", "Brief")}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid " + C.border, borderRadius: 6, background: C.white, fontSize: 12, fontWeight: 600, color: C.dark, cursor: "pointer" }}
                                                        >
                                                            <FileText size={14} /> Ouvrir le PDF
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })() : null}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ fontSize: 13, color: C.muted }}>Aucun brief uploade.</p>
                    )}

                    {/* Add brief button + upload zone */}
                    <div style={{ marginTop: 12 }}>
                        {!showUpload ? (
                            <button
                                onClick={() => setShowUpload(true)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px dashed " + C.border, borderRadius: 8, background: "none", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer" }}
                            >
                                <Plus size={14} /> Ajouter un brief
                            </button>
                        ) : (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: 32, borderRadius: 10,
                                    border: `2px dashed ${dragOver ? C.yellow : C.border}`,
                                    backgroundColor: dragOver ? "rgba(244,207,21,0.06)" : C.bg,
                                    textAlign: "center", cursor: "pointer",
                                    transition: "border-color 0.2s, background-color 0.2s",
                                }}
                            >
                                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />
                                <Upload size={24} color={C.muted} style={{ marginBottom: 8 }} />
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                                    {uploading ? "Upload en cours..." : "Glissez un fichier ou cliquez pour selectionner"}
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>PDF, image, tableur...</div>
                            </div>
                        )}
                    </div>

                    {/* Editable product list */}
                    <div style={sec}>Produits</div>
                    {productList.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {productList.map((p, idx) => {
                                const isEstimated = estimatedDimensions.has(p.id)
                                return (
                                <div
                                    key={p.id}
                                    draggable
                                    onDragStart={() => handleProductDragStart(idx)}
                                    onDragOver={(e) => handleProductDragOver(e, idx)}
                                    onDrop={() => handleProductDrop(idx)}
                                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        padding: "10px 12px", backgroundColor: dragOverIdx === idx ? "rgba(244,207,21,0.08)" : C.bg,
                                        borderRadius: 8, border: "1px solid " + C.border,
                                        opacity: dragIdx === idx ? 0.5 : 1,
                                    }}
                                >
                                    <GripVertical size={16} color={C.muted} style={{ cursor: "grab", flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                        <input
                                            value={p.name}
                                            onChange={(e) => updateProduct(idx, "name", e.target.value)}
                                            placeholder="Nom du produit"
                                            style={{ flex: 1, padding: "6px 10px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", minWidth: 0, width: "100%" }}
                                        />
                                        {isEstimated && (
                                            <span title={`Largeur estimee : ${p.width}mm | Hauteur estimee : ${p.height}mm`} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", whiteSpace: "nowrap", flexShrink: 0 }}>Estime</span>
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        value={p.quantity || ""}
                                        onChange={(e) => updateProduct(idx, "quantity", parseInt(e.target.value) || 0)}
                                        placeholder="Qte"
                                        min={0}
                                        style={{ width: 72, minWidth: 72, padding: "6px 8px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", textAlign: "center" }}
                                    />
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <input
                                            type="number"
                                            value={p.width || ""}
                                            onChange={(e) => updateProduct(idx, "width", parseInt(e.target.value) || 0)}
                                            placeholder="L"
                                            min={0}
                                            style={{ width: 80, minWidth: 80, padding: "6px 6px", border: isEstimated ? "2px solid #ef4444" : "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", textAlign: "center" }}
                                        />
                                        <span style={{ fontSize: 12, color: C.muted }}>x</span>
                                        <input
                                            type="number"
                                            value={p.height || ""}
                                            onChange={(e) => updateProduct(idx, "height", parseInt(e.target.value) || 0)}
                                            placeholder="H"
                                            min={0}
                                            style={{ width: 80, minWidth: 80, padding: "6px 6px", border: isEstimated ? "2px solid #ef4444" : "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: C.dark, outline: "none", textAlign: "center" }}
                                        />
                                        <select
                                            value={p.unit}
                                            onChange={(e) => updateProduct(idx, "unit", e.target.value)}
                                            style={{ padding: "6px 4px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 12, color: C.dark, outline: "none", background: C.white }}
                                        >
                                            <option value="mm">mm</option>
                                            <option value="cm">cm</option>
                                        </select>
                                    </div>
                                    {isEstimated && (
                                        <button
                                            onClick={() => setEstimatedDimensions(prev => { const next = new Set(prev); next.delete(p.id); return next })}
                                            title="Valider les dimensions"
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "none", cursor: "pointer", color: "#16a34a", flexShrink: 0 }}
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeProduct(idx)}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "none", cursor: "pointer", color: "#c0392b", flexShrink: 0 }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p style={{ fontSize: 13, color: C.muted }}>Aucun produit.</p>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <button
                            onClick={addProduct}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px dashed " + C.border, borderRadius: 8, background: "none", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer" }}
                        >
                            <Plus size={14} /> Ajouter un produit
                        </button>
                        {productsDirty && (
                            <button
                                onClick={saveProducts}
                                disabled={savingProducts}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: savingProducts ? "not-allowed" : "pointer", opacity: savingProducts ? 0.6 : 1 }}
                            >
                                <Save size={14} /> {savingProducts ? "Sauvegarde..." : "Sauvegarder les modifications"}
                            </button>
                        )}
                    </div>

                    {/* Plan de production — grid view, parallel lots */}
                    {brief_analysis?.production_plan && (() => {
                        const plan = brief_analysis.production_plan
                        const isAdmin = user?.role === "admin"
                        const effectiveRole = user?.role || "client"
                        const isClient = effectiveRole === "client"
                        const lotStatusCfg: Record<string, { label: string; bg: string; color: string }> = {
                            pending: { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
                            in_progress: { label: "En cours", bg: "#fff3e0", color: "#e65100" },
                            completed: { label: "Termine", bg: "#e8f8ee", color: "#1a7a3c" },
                        }
                        return (
                            <>
                                <div style={sec}>Plan de production</div>
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                                    {plan.lots?.length || plan.total_lots} lot{(plan.lots?.length || plan.total_lots) > 1 ? "s" : ""} de production
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    {plan.lots?.map((lot: any) => {
                                        const lotStatus = lot.status || "pending"
                                        const sc = lotStatusCfg[lotStatus] || lotStatusCfg.pending
                                        const lotName = lot.products?.length > 0
                                            ? lot.products.map((p: any) => p.name).filter(Boolean).join(", ")
                                            : (lot.recommended_supplier || `Lot ${lot.lot_number}`)
                                        return (
                                            <div key={lot.lot_number} style={{
                                                padding: "16px 18px", backgroundColor: C.bg, borderRadius: 10,
                                                border: "1px solid " + C.border,
                                                display: "flex", flexDirection: "column", gap: 10,
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, flex: 1 }}>
                                                        {lotName}
                                                    </span>
                                                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                                                        {sc.label}
                                                    </span>
                                                </div>
                                                {lot.is_amalgame && (
                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: C.dark, backgroundColor: "rgba(244,207,21,0.15)", padding: "3px 8px", borderRadius: 6, alignSelf: "flex-start" }}>
                                                        <Layers size={12} /> Amalgame
                                                    </div>
                                                )}
                                                {isAdmin && (lot.supplier_name || lot.recommended_supplier) && (
                                                    <div style={{ fontSize: 12, color: C.muted }}>
                                                        Fournisseur : <strong style={{ color: C.dark }}>{lot.supplier_name || lot.recommended_supplier}</strong>
                                                    </div>
                                                )}
                                                {lot.total_estimated_ht != null && (
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                                                        {formatPrice(lot.total_estimated_ht)} HT
                                                    </div>
                                                )}
                                                {isClient && (
                                                    <div style={{ fontSize: 12, color: C.muted }}>
                                                        MAD souhaitee : <strong style={{ color: C.dark }}>
                                                            {project.wished_delivery_date ? formatDate(project.wished_delivery_date) : "A definir"}
                                                        </strong>
                                                    </div>
                                                )}
                                                {!isClient && lot.estimated_delay_days != null && (
                                                    <div style={{ fontSize: 12, color: C.muted }}>
                                                        Delai estime : {lot.estimated_delay_days}j
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Global total */}
                                {plan.total_estimated_ht != null && (
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Total estime : {formatPrice(plan.total_estimated_ht)} HT</span>
                                    </div>
                                )}

                                {/* Risks */}
                                {plan.risks?.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                                        {plan.risks.map((risk: string, idx: number) => (
                                            <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#e67e22", backgroundColor: "rgba(230,126,34,0.1)", padding: "4px 10px", borderRadius: 6 }}>
                                                <AlertTriangle size={12} /> {risk}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    })()}

                    {/* Informations */}
                    {(() => {
                        const products = brief_analysis?.products
                        const hasProducts = Array.isArray(products) && products.length > 0
                        const plan = brief_analysis?.production_plan
                        const estimatedHT = plan?.total_estimated_ht
                        const hasRealPricing = pricing?.total_net != null && Number(pricing.total_net) > 0
                        const showEstimate = !hasRealPricing && estimatedHT != null

                        // Build product recap lines
                        const productLines: Array<{ name: string; qty: string }> = []
                        if (hasProducts) {
                            for (const p of products) {
                                const name = p.product_type || p.name || "Produit"
                                const qty = p.quantity || p.quantity_detected || ""
                                productLines.push({ name, qty: qty ? `${qty} ex.` : "—" })
                            }
                        } else if (brief_analysis?.product_type) {
                            productLines.push({
                                name: brief_analysis.product_type,
                                qty: brief_analysis.quantity_detected ? `${brief_analysis.quantity_detected} ex.` : (quantity ? `${quantity} ex.` : "—"),
                            })
                        }

                        return (
                            <>
                                <div style={{ ...sec, display: "flex", alignItems: "center", gap: 8 }}>
                                    {showEstimate ? "Notre estimation" : "Informations"}
                                    {showEstimate && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: C.dark, backgroundColor: C.yellow, padding: "2px 8px", borderRadius: 4 }}>
                                            Estimation
                                        </span>
                                    )}
                                </div>

                                {/* Product recap — line by line */}
                                {productLines.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={lbl}>Produits</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                            {productLines.map((pl, i) => (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.dark }}>
                                                    <span style={{ fontWeight: 500 }}>{pl.name}</span>
                                                    <span style={{ color: C.muted }}>{pl.qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {hasRealPricing ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
                                        <div>
                                            <div style={lbl}>Sous-total HT</div>
                                            <div style={{ fontSize: 16, color: C.dark, fontWeight: 600 }}>{formatPrice(pricing.total_net)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>TVA (20%)</div>
                                            <div style={{ fontSize: 16, color: C.dark, fontWeight: 500 }}>{formatPrice(pricing.total_net * 0.2)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>Total TTC</div>
                                            <div style={{ fontSize: 20, color: C.dark, fontWeight: 700 }}>{formatPrice(pricing.total_net * 1.2)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>Date de creation</div>
                                            <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{formatDate(created_at)}</div>
                                        </div>
                                    </div>
                                ) : showEstimate ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
                                        <div>
                                            <div style={lbl}>Estimation HT</div>
                                            <div style={{ fontSize: 16, color: C.dark, fontWeight: 600 }}>{formatPrice(estimatedHT)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>TVA estimee (20%)</div>
                                            <div style={{ fontSize: 16, color: C.dark, fontWeight: 500 }}>{formatPrice(estimatedHT * 0.2)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>Total TTC estime</div>
                                            <div style={{ fontSize: 20, color: C.dark, fontWeight: 700 }}>{formatPrice(estimatedHT * 1.2)}</div>
                                        </div>
                                        <div>
                                            <div style={lbl}>Date de creation</div>
                                            <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{formatDate(created_at)}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
                                        {productLines.length === 0 && (
                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic" }}>En attente de devis</div>
                                            </div>
                                        )}
                                        <div>
                                            <div style={lbl}>Date de creation</div>
                                            <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{formatDate(created_at)}</div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    })()}

                    {/* Devis */}
                    {quote_url && (
                        <>
                            <div style={sec}>Devis</div>
                            {quote_number && (
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                                    Devis n° <strong>{quote_number}</strong>
                                </div>
                            )}
                            <a
                                href={quote_url}
                                target="_blank"
                                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                            >
                                <FileText size={16} /> Télécharger le devis (PDF)
                            </a>
                        </>
                    )}

                    {/* Factures */}
                    <div style={sec}>Factures</div>
                    {invoicesLoading ? (
                        <p style={{ fontSize: 13, color: C.muted }}>Chargement...</p>
                    ) : invoices.length === 0 ? (
                        <p style={{ fontSize: 13, color: C.muted }}>Aucune facture liée à ce projet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {invoices.map((inv: any) => {
                                const isSplit = inv.payment_type === "split"
                                const step = inv.payment_step
                                return (
                                    <div key={inv.id} style={{ padding: "14px 18px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{inv.invoice_number}</div>
                                            <div style={{ fontSize: 13, color: C.muted }}>{formatPrice(Number(inv.total))} TTC</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <StatusBadge status={inv.status} type="invoice" />
                                            {isSplit && step === "pending" && (
                                                <button onClick={() => handlePay(inv.id, "deposit")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer l'acompte
                                                </button>
                                            )}
                                            {isSplit && step === "deposit_paid" && (
                                                <button onClick={() => handlePay(inv.id, "balance")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer le solde
                                                </button>
                                            )}
                                            {!isSplit && inv.status === "pending" && (
                                                <button onClick={() => handlePay(inv.id, "full")} style={{ padding: "6px 14px", backgroundColor: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                    Payer
                                                </button>
                                            )}
                                            <a href={`/facture/${inv.id}`} style={{ fontSize: 12, color: C.dark, fontWeight: 600, textDecoration: "none" }}>Voir →</a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Messages */}
                    <div ref={messagesSectionRef} data-section="messages" style={sec}>Messages</div>
                    <div style={{ backgroundColor: C.bg, borderRadius: 12, border: "1px solid " + C.border, overflow: "hidden" }}>
                        {/* Message list */}
                        <div style={{ maxHeight: 360, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            {messagesLoading ? (
                                <p style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Chargement...</p>
                            ) : messages.length === 0 ? (
                                <p style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Aucun message. Commencez la conversation.</p>
                            ) : (
                                messages.map((msg: any, idx: number) => {
                                    const isMe = msg.sender_id === user?.id
                                    return (
                                        <div key={msg.id || idx} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                            <div style={{
                                                maxWidth: "70%",
                                                padding: "10px 14px",
                                                borderRadius: 12,
                                                backgroundColor: isMe ? C.dark : C.white,
                                                color: isMe ? C.white : C.dark,
                                                fontSize: 14,
                                                lineHeight: 1.5,
                                                border: isMe ? "none" : "1px solid " + C.border,
                                            }}>
                                                {!isMe && msg.sender_name && (
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: isMe ? "rgba(255,255,255,0.6)" : C.muted, marginBottom: 4 }}>{msg.sender_name}</div>
                                                )}
                                                <div>{msg.content}</div>
                                                <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.5)" : C.muted, marginTop: 4, textAlign: "right" }}>
                                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ borderTop: "1px solid " + C.border, padding: 12, display: "flex", gap: 10 }}>
                            <input
                                value={msgText}
                                onChange={(e) => setMsgText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                                placeholder="Écrire un message..."
                                style={{ flex: 1, padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, color: C.dark, backgroundColor: C.white, outline: "none", fontFamily: "Inter, sans-serif" }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sending || !msgText.trim()}
                                style={{ padding: "10px 20px", backgroundColor: sending || !msgText.trim() ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending || !msgText.trim() ? "not-allowed" : "pointer" }}
                            >
                                {sending ? "..." : "Envoyer"}
                            </button>
                        </div>
                    </div>

                    {/* Prochaines etapes — rendered LAST, after Messages */}
                    {(() => {
                        const effectiveRole = user?.role || "client"
                        if (effectiveRole !== "client") return null

                        if (["pending", "created", "analysed", "analyzed", "brief_recu", "en_analyse"].includes(status)) {
                            const products = brief_analysis?.products
                            const hasProducts = Array.isArray(products) && products.length > 0
                            return (
                                <div style={{ padding: "18px 22px", backgroundColor: "#fef9e0", borderRadius: 10, border: "1px solid #f4cf1588", marginTop: 16, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <Clock size={16} color="#b89a00" />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#b89a00" }}>Brief recu et analyse</span>
                                    </div>
                                    <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, margin: "0 0 12px" }}>
                                        Votre brief est en cours de traitement. Notre equipe interroge les fournisseurs partenaires.
                                    </p>
                                    {hasProducts && (
                                        <div style={{ backgroundColor: C.white, borderRadius: 8, padding: 12, border: "1px solid " + C.border, marginBottom: 12 }}>
                                            <div style={lbl}>Produits detectes</div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                                {products.map((p: any, i: number) => (
                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dark }}>
                                                        <span>{p.product_type || p.name || "Produit"}</span>
                                                        <span style={{ color: C.muted }}>{p.quantity || p.quantity_detected || ""}{(p.quantity || p.quantity_detected) ? " ex." : ""}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => messagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.dark, background: C.white, cursor: "pointer" }}
                                    >
                                        <MessageSquare size={14} /> Contacter notre equipe
                                    </button>
                                </div>
                            )
                        }

                        if (["quoted", "devis_envoye", "en_attente_validation", "sent"].includes(status)) {
                            console.log('[CTA] status match:', status)
                            const quotedInvoice = invoices.find((inv: any) => inv.status === "pending")
                            return (
                                <div style={{ padding: "18px 22px", backgroundColor: "#e8f8ee", borderRadius: 10, border: "1px solid #a8dbb8", marginTop: 16, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <CheckCircle2 size={16} color="#1a7a3c" />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1a7a3c" }}>Votre devis est pret</span>
                                    </div>
                                    {pricing?.total_net != null && (
                                        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
                                            <div>
                                                <div style={lbl}>Total HT</div>
                                                <div style={{ fontSize: 16, fontWeight: 600, color: C.dark }}>{formatPrice(pricing.total_net)}</div>
                                            </div>
                                            <div>
                                                <div style={lbl}>Total TTC</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{formatPrice(pricing.total_net * 1.2)}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        <button
                                            disabled={payLoading}
                                            onClick={() => {
                                                if (payLoading) return
                                                if (quotedInvoice) {
                                                    setPayLoading(true)
                                                    handlePay(quotedInvoice.id, quotedInvoice.payment_type === "split" ? "deposit" : "full")
                                                } else {
                                                    setPayLoading(true)
                                                    fetchWithAuth(`${API_URL}/api/invoice/list?project_id=${id}`)
                                                        .then(r => r.json())
                                                        .then(data => {
                                                            const inv = data.invoices?.find((i: any) => i.status === "pending")
                                                            if (inv) handlePay(inv.id, inv.payment_type === "split" ? "deposit" : "full")
                                                            else {
                                                                showToast("info", "Votre facture est en cours de generation, veuillez patienter...")
                                                                setPayLoading(false)
                                                            }
                                                        })
                                                        .catch(() => {
                                                            showToast("error", "Erreur lors de la recuperation de la facture.")
                                                            setPayLoading(false)
                                                        })
                                                }
                                            }}
                                            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", backgroundColor: payLoading ? "#e0dcc0" : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: payLoading ? "not-allowed" : "pointer", opacity: payLoading ? 0.7 : 1, transition: "all 150ms ease" }}
                                        >
                                            {payLoading ? <Clock size={16} className="landing-badge-pulse" /> : <CreditCard size={16} />}
                                            {payLoading ? "Chargement..." : "Valider et payer"}
                                        </button>
                                        {quote_url && (
                                            <a
                                                href={quote_url}
                                                target="_blank"
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 20px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.dark, textDecoration: "none", background: C.white }}
                                            >
                                                <FileText size={14} /> Telecharger le devis PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        if (["in_production", "en_production", "validated", "ordered"].includes(status)) {
                            const plan = brief_analysis?.production_plan
                            const lotStatusCfg: Record<string, { label: string; bg: string; color: string }> = {
                                pending: { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
                                in_progress: { label: "En cours", bg: "#fff3e0", color: "#e65100" },
                                completed: { label: "Termine", bg: "#e8f8ee", color: "#1a7a3c" },
                            }
                            return (
                                <div style={{ padding: "18px 22px", backgroundColor: "#e8f0fe", borderRadius: 10, border: "1px solid #a8b8db", marginTop: 16, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <Clock size={16} color="#1a3c7a" />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1a3c7a" }}>Commande en cours de production</span>
                                    </div>
                                    {plan?.lots?.length > 0 ? (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                                            {plan.lots.map((lot: any) => {
                                                const sc = lotStatusCfg[lot.status || "pending"] || lotStatusCfg.pending
                                                const lotName = lot.products?.length > 0
                                                    ? lot.products.map((p: any) => p.name).filter(Boolean).join(", ")
                                                    : (lot.recommended_supplier || `Lot ${lot.lot_number}`)
                                                return (
                                                    <div key={lot.lot_number} style={{ padding: "12px 14px", backgroundColor: C.white, borderRadius: 8, border: "1px solid " + C.border }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{lotName}</span>
                                                            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: C.muted }}>
                                                            MAD souhaitee : {project.wished_delivery_date ? formatDate(project.wished_delivery_date) : "A definir"}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px" }}>Votre commande est en cours de fabrication.</p>
                                    )}
                                </div>
                            )
                        }

                        if (["delivered", "termine", "completed"].includes(status)) {
                            const paidInvoice = invoices.find((inv: any) => inv.status === "paid") || invoices[invoices.length - 1]
                            return (
                                <div style={{ padding: "18px 22px", backgroundColor: "#e8f8ee", borderRadius: 10, border: "1px solid #a8dbb8", marginTop: 16, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <CheckCircle2 size={16} color="#1a7a3c" />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1a7a3c" }}>Projet termine</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        {paidInvoice && (
                                            <a
                                                href={`/facture/${paidInvoice.id}`}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                                            >
                                                <Download size={14} /> Telecharger la facture finale
                                            </a>
                                        )}
                                        <a
                                            href="/projet/nouveau"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.dark, textDecoration: "none", background: C.white }}
                                        >
                                            <Plus size={14} /> Nouveau projet
                                        </a>
                                    </div>
                                </div>
                            )
                        }

                        return null
                    })()}

                    {/* Contacter LA FAB — all client statuses */}
                    {(user?.role || "client") === "client" && (
                        <div style={{ marginTop: 12, marginBottom: 8 }}>
                            <button
                                onClick={() => messagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.dark, background: C.white, cursor: "pointer" }}
                            >
                                <MessageSquare size={14} /> Contacter LA FAB
                            </button>
                        </div>
                    )}
                    </div>

                </div>
            </div>
        </div>

        {briefPdfUrl && (
            <PdfViewerModal
                url={briefPdfUrl}
                isOpen={briefPdfOpen}
                onClose={() => { setBriefPdfOpen(false); setBriefPdfUrl(null) }}
                title={briefPdfTitle}
            />
        )}

        {toast && (
            <div style={{
                position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
                zIndex: 900, display: "flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 12,
                backgroundColor: toast.type === "error" ? "#c0392b" : C.dark,
                color: "#fff", fontSize: 14, fontWeight: 600,
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                opacity: toast.visible ? 1 : 0,
                transition: "opacity 0.35s ease",
                pointerEvents: "none",
            }}>
                {toast.type === "info" && <Clock size={16} />}
                {toast.message}
            </div>
        )}
    </>)
}
