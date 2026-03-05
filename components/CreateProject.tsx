"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { FileUp, PenLine, FileText, X } from "lucide-react"

interface CatalogProduct {
    id: string
    catalog_item_id?: string
    name: string
    dimensions?: string
    category?: string
}

export default function CreateProject() {
    const router = useRouter()
    const { token } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const fileInputRefB = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<HTMLDivElement>(null)

    // Mode
    const [mode, setMode] = useState<"brief" | "describe">("brief")

    // Catalog
    const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
    const [catalogLoaded, setCatalogLoaded] = useState(false)

    // Mode A — brief upload
    const [briefFile, setBriefFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [briefError, setBriefError] = useState("")

    // Mode B — describe
    const [productQuery, setProductQuery] = useState("")
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [quantity, setQuantity] = useState("")
    const [specs, setSpecs] = useState("")
    const [descFile, setDescFile] = useState<File | null>(null)
    const [descDragOver, setDescDragOver] = useState(false)
    const [descFileError, setDescFileError] = useState("")
    const [descError, setDescError] = useState("")

    // Submit
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [success, setSuccess] = useState(false)

    const MAX_FILE_SIZE = 20 * 1024 * 1024
    const ACCEPTED_EXT = [".pdf",".xlsx",".xls",".csv",".pptx",".docx",".doc",".txt",".rtf",".jpg",".jpeg",".png",".webp"]
    const ACCEPTED_ATTR = ACCEPTED_EXT.join(",")

    // Fetch catalog on mount
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/api/catalog/products`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && Array.isArray(data.products)) {
                    setCatalogProducts(data.products)
                }
                setCatalogLoaded(true)
            })
            .catch(() => setCatalogLoaded(true))
    }, [token])

    // Close autocomplete on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    // File validation
    function validateFile(f: File): string | null {
        const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "")
        if (!ACCEPTED_EXT.includes(ext)) return "Format non supporté. Formats acceptés : PDF, Excel, Word, PowerPoint, images, texte."
        if (f.size > MAX_FILE_SIZE) return "Le fichier ne doit pas dépasser 20 MB."
        return null
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " o"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko"
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo"
    }

    // Mode A handlers
    function handleBriefFile(f: File) {
        const err = validateFile(f)
        if (err) { setBriefError(err); return }
        setBriefError("")
        setBriefFile(f)
    }

    const handleBriefDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleBriefFile(f)
    }, [])

    // Mode B handlers
    function handleDescFile(f: File) {
        const err = validateFile(f)
        if (err) { setDescFileError(err); return }
        setDescFileError("")
        setDescFile(f)
    }

    const handleDescDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDescDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleDescFile(f)
    }, [])

    // Autocomplete filtering
    const suggestions = productQuery.trim().length > 0
        ? catalogProducts.filter((p) => {
              const q = productQuery.toLowerCase()
              return (
                  p.name.toLowerCase().includes(q) ||
                  (p.category || "").toLowerCase().includes(q) ||
                  (p.dimensions || "").toLowerCase().includes(q)
              )
          }).slice(0, 8)
        : []

    function selectProduct(p: CatalogProduct) {
        setSelectedProduct(p)
        setProductQuery(p.name + (p.dimensions ? ` — ${p.dimensions}` : ""))
        setShowSuggestions(false)
    }

    // Submit Mode A
    async function submitBrief() {
        if (!briefFile) { setBriefError("Déposez un fichier."); return }
        setSubmitting(true)
        setSubmitError("")

        try {
            // 1. Create project
            const res = await fetch(`${API_URL}/api/project/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ product_id: "BRIEF-UPLOAD", qty: 1, spec: "Brief uploadé" }),
            })
            const data = await res.json()
            if (!data.ok && !data.project_id) {
                setSubmitError(data.error || "Erreur lors de la création du projet.")
                setSubmitting(false)
                return
            }
            const projectId = data.project_id

            // 2. Upload brief
            const formData = new FormData()
            formData.append("file", briefFile)
            const uploadRes = await fetch(`${API_URL}/api/project/${projectId}/upload-brief`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
                body: formData,
            })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok && !uploadData.ok) {
                setSubmitError(uploadData.message || "Erreur lors de l'upload du brief.")
                setSubmitting(false)
                return
            }

            setSuccess(true)
            setTimeout(() => router.push(`/projet/${projectId}`), 2000)
        } catch {
            setSubmitError("Erreur réseau. Veuillez réessayer.")
            setSubmitting(false)
        }
    }

    // Submit Mode B
    async function submitDescribe() {
        setDescError("")
        if (!productQuery.trim()) { setDescError("Le produit est requis."); return }
        if (!quantity || parseInt(quantity) < 1) { setDescError("La quantité doit être d'au moins 1."); return }

        setSubmitting(true)
        setSubmitError("")

        try {
            const productId = selectedProduct
                ? (selectedProduct.id || selectedProduct.catalog_item_id || "custom")
                : "custom"
            const specText = selectedProduct
                ? (specs.trim() || undefined)
                : (productQuery.trim() + (specs.trim() ? "\n" + specs.trim() : ""))

            // 1. Create project
            const res = await fetch(`${API_URL}/api/project/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({
                    product_id: productId,
                    qty: parseInt(quantity),
                    spec: specText,
                }),
            })
            const data = await res.json()
            if (!data.ok && !data.project_id) {
                setSubmitError(data.error || "Erreur lors de la création du projet.")
                setSubmitting(false)
                return
            }
            const projId = data.project_id

            // 2. Upload brief if file selected
            if (descFile && projId) {
                const formData = new FormData()
                formData.append("file", descFile)
                await fetch(`${API_URL}/api/project/${projId}/upload-brief`, {
                    method: "POST",
                    headers: { Authorization: "Bearer " + token },
                    body: formData,
                })
            }

            setSuccess(true)
            setTimeout(() => router.push(`/projet/${projId}`), 2000)
        } catch {
            setSubmitError("Erreur réseau. Veuillez réessayer.")
            setSubmitting(false)
        }
    }

    // Success screen
    if (success) {
        return (
            <div style={{ fontFamily: "Inter, sans-serif", display: "flex", justifyContent: "center", padding: "60px 16px" }}>
                <div style={{
                    backgroundColor: C.white, borderRadius: 12, padding: "48px 32px",
                    maxWidth: 640, width: "100%", textAlign: "center",
                    boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border,
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%", backgroundColor: "#e8f8ee",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px", fontSize: 32, animation: "checkPop 0.4s ease",
                    }}>
                        ✓
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, margin: "0 0 8px" }}>
                        Projet créé avec succès !
                    </h2>
                    <p style={{ color: C.muted, fontSize: 14 }}>Redirection en cours...</p>
                    <style>{`
                        @keyframes checkPop {
                            0% { transform: scale(0); opacity: 0; }
                            60% { transform: scale(1.2); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                </div>
            </div>
        )
    }

    return (
        <div style={{ fontFamily: "Inter, sans-serif", display: "flex", justifyContent: "center", padding: "40px 16px" }}>
            <div style={{
                backgroundColor: C.white, borderRadius: 12, padding: "32px",
                maxWidth: 640, width: "100%",
                boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border,
            }}>
                {/* Mode tabs */}
                <div style={{ display: "flex", gap: 0, marginBottom: 28, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border }}>
                    <button
                        onClick={() => setMode("brief")}
                        style={{
                            flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                            border: "none", transition: "all 0.2s",
                            backgroundColor: mode === "brief" ? C.yellow : C.white,
                            color: C.dark,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                    >
                        <FileUp size={14} />Déposer un brief
                    </button>
                    <button
                        onClick={() => setMode("describe")}
                        style={{
                            flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                            border: "none", borderLeft: "1px solid " + C.border, transition: "all 0.2s",
                            backgroundColor: mode === "describe" ? C.yellow : C.white,
                            color: C.dark,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                    >
                        <PenLine size={14} />Décrire mon projet
                    </button>
                </div>

                {/* ═══ MODE A — Brief Upload ═══ */}
                {mode === "brief" && (
                    <div>
                        <p style={{ fontSize: 15, color: C.dark, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>
                            Déposez votre brief et notre IA s'occupe du reste
                        </p>
                        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", textAlign: "center" }}>
                            L'analyse automatique extrait les spécifications de votre document
                        </p>

                        {/* Drop zone */}
                        {!briefFile ? (
                            <div
                                onDrop={handleBriefDrop}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? C.yellow : C.border}`,
                                    borderRadius: 16, padding: "60px 20px",
                                    textAlign: "center", cursor: "pointer",
                                    backgroundColor: dragOver ? "#fef9e0" : C.bg,
                                    transition: "all 0.2s", marginBottom: 16,
                                    minHeight: 220, display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center",
                                }}
                            >
                                <div style={{ marginBottom: 16 }}><FileUp size={56} style={{ color: C.muted, opacity: 0.7 }} /></div>
                                <p style={{ fontSize: 16, color: C.dark, fontWeight: 600, margin: "0 0 8px" }}>
                                    Glissez votre brief ici ou cliquez pour sélectionner
                                </p>
                                <div style={{
                                    padding: "8px 20px", borderRadius: 8, backgroundColor: C.yellow,
                                    color: C.dark, fontSize: 13, fontWeight: 700, display: "inline-block",
                                }}>
                                    Parcourir les fichiers
                                </div>
                                <p style={{ fontSize: 11, color: C.muted, margin: "12px 0 0" }}>PDF, Excel, Word, PowerPoint, images, texte — 20 MB max</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED_ATTR}
                                    style={{ display: "none" }}
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBriefFile(f) }}
                                />
                            </div>
                        ) : (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "16px 18px", borderRadius: 12,
                                backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8",
                                marginBottom: 16,
                            }}>
                                <div><FileText size={32} style={{ color: "#1a7a3c" }} /></div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {briefFile.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>{formatSize(briefFile.size)}</div>
                                </div>
                                <button
                                    onClick={() => { setBriefFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                                    style={{
                                        padding: "6px 14px", borderRadius: 6, border: "1px solid " + C.border,
                                        backgroundColor: C.white, color: "#c0392b", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    }}
                                >
                                    Supprimer
                                </button>
                            </div>
                        )}

                        {briefError && <p style={errorStyle}>{briefError}</p>}
                        {submitError && <p style={errorStyle}>{submitError}</p>}

                        <button
                            onClick={submitBrief}
                            disabled={submitting || !briefFile}
                            style={{
                                ...primaryBtnStyle,
                                opacity: submitting || !briefFile ? 0.6 : 1,
                                cursor: submitting || !briefFile ? "not-allowed" : "pointer",
                                marginTop: 8,
                            }}
                        >
                            {submitting ? "Création en cours..." : "Créer le projet"}
                        </button>
                    </div>
                )}

                {/* ═══ MODE B — Describe Project ═══ */}
                {mode === "describe" && (
                    <div>
                        {/* Product autocomplete */}
                        <div style={{ marginBottom: 16, position: "relative" }} ref={autocompleteRef}>
                            <label style={labelStyle}>Produit</label>
                            <input
                                type="text"
                                value={productQuery}
                                onChange={(e) => {
                                    setProductQuery(e.target.value)
                                    setSelectedProduct(null)
                                    setShowSuggestions(true)
                                }}
                                onFocus={() => { if (productQuery.trim()) setShowSuggestions(true) }}
                                placeholder="Tapez pour rechercher... Ex: Roll-up, Kakémono, Flyer"
                                style={inputStyle}
                                autoComplete="off"
                            />

                            {/* Suggestions dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div style={{
                                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                                    backgroundColor: C.white, border: "1px solid " + C.border,
                                    borderRadius: 10, boxShadow: "0 8px 24px rgba(58,64,64,0.12)",
                                    maxHeight: 320, overflowY: "auto", marginTop: 4,
                                }}>
                                    {suggestions.map((p) => (
                                        <div
                                            key={p.id || p.catalog_item_id}
                                            onClick={() => selectProduct(p)}
                                            style={{
                                                padding: "10px 14px", cursor: "pointer",
                                                borderBottom: "1px solid " + C.border,
                                                transition: "background-color 0.15s",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9e0")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.white)}
                                        >
                                            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                                                {p.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                                {[p.dimensions, p.category].filter(Boolean).join(" · ") || "—"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected indicator */}
                            {selectedProduct && (
                                <div style={{ fontSize: 12, color: "#1a7a3c", marginTop: 4, fontWeight: 600 }}>
                                    ✓ Produit sélectionné : {selectedProduct.name}
                                </div>
                            )}
                            {!selectedProduct && productQuery.trim() && catalogLoaded && (
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                                    Produit personnalisé — sera traité comme un brief libre
                                </div>
                            )}
                        </div>

                        {/* Quantity */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Quantité</label>
                            <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="1"
                                style={inputStyle}
                            />
                        </div>

                        {/* Specs */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>
                                Détails / spécifications <span style={{ color: C.muted, fontWeight: 400 }}>(optionnel)</span>
                            </label>
                            <textarea
                                value={specs}
                                onChange={(e) => setSpecs(e.target.value)}
                                placeholder="Finitions, format, matériaux, délai souhaité..."
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical" }}
                            />
                        </div>

                        {/* Optional brief upload (smaller) */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>
                                Brief <span style={{ color: C.muted, fontWeight: 400 }}>(optionnel)</span>
                            </label>
                            {!descFile ? (
                                <div
                                    onDrop={handleDescDrop}
                                    onDragOver={(e) => { e.preventDefault(); setDescDragOver(true) }}
                                    onDragLeave={() => setDescDragOver(false)}
                                    onClick={() => fileInputRefB.current?.click()}
                                    style={{
                                        border: `2px dashed ${descDragOver ? C.yellow : C.border}`,
                                        borderRadius: 10, padding: "20px 16px",
                                        textAlign: "center", cursor: "pointer",
                                        backgroundColor: descDragOver ? "#fef9e0" : C.bg,
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <p style={{ fontSize: 13, color: C.muted, margin: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <FileUp size={14} />Glissez un fichier ici ou cliquez — 20 MB max
                                    </p>
                                    <input
                                        ref={fileInputRefB}
                                        type="file"
                                        accept={ACCEPTED_ATTR}
                                        style={{ display: "none" }}
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDescFile(f) }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "10px 14px", borderRadius: 10,
                                    backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8",
                                }}>
                                    <div><FileText size={20} style={{ color: "#1a7a3c" }} /></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {descFile.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: C.muted }}>{formatSize(descFile.size)}</div>
                                    </div>
                                    <button
                                        onClick={() => { setDescFile(null); if (fileInputRefB.current) fileInputRefB.current.value = "" }}
                                        style={{
                                            padding: "4px 10px", borderRadius: 6, border: "1px solid " + C.border,
                                            backgroundColor: C.white, color: "#c0392b", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            {descFileError && <p style={{ ...errorStyle, marginTop: 4 }}>{descFileError}</p>}
                        </div>

                        {descError && <p style={errorStyle}>{descError}</p>}
                        {submitError && <p style={errorStyle}>{submitError}</p>}

                        <button
                            onClick={submitDescribe}
                            disabled={submitting}
                            style={{
                                ...primaryBtnStyle,
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? "not-allowed" : "pointer",
                            }}
                        >
                            {submitting ? "Création en cours..." : "Créer le projet"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// Shared styles
const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600, color: "#3A4040",
    marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid #e0e0de", fontSize: 14, fontFamily: "Inter, sans-serif",
    color: "#3A4040", backgroundColor: "#FAFFFD", outline: "none",
    boxSizing: "border-box",
}

const primaryBtnStyle: React.CSSProperties = {
    padding: "12px 24px", borderRadius: 8, border: "none",
    backgroundColor: "#F4CF15", color: "#3A4040", fontSize: 14,
    fontWeight: 700, cursor: "pointer", width: "100%",
}

const errorStyle: React.CSSProperties = {
    color: "#c0392b", fontSize: 13, margin: "0 0 12px",
}
