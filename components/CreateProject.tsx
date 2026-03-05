"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

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

    // Catalog
    const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
    const [catalogLoading, setCatalogLoading] = useState(true)
    const [catalogError, setCatalogError] = useState(false)

    // Steps
    const [step, setStep] = useState(1)

    // Step 1 fields
    const [selectedProductId, setSelectedProductId] = useState("")
    const [customProductType, setCustomProductType] = useState("")
    const [quantity, setQuantity] = useState("")
    const [specs, setSpecs] = useState("")
    const [step1Error, setStep1Error] = useState("")

    // Fetch catalog products on mount
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/api/catalog/products`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && Array.isArray(data.products) && data.products.length > 0) {
                    setCatalogProducts(data.products)
                } else {
                    setCatalogError(true)
                }
                setCatalogLoading(false)
            })
            .catch(() => { setCatalogError(true); setCatalogLoading(false) })
    }, [token])

    // Step 2 fields
    const [file, setFile] = useState<File | null>(null)
    const [skipFile, setSkipFile] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const [fileError, setFileError] = useState("")

    // Submit state
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [success, setSuccess] = useState(false)

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

    const useCatalog = catalogProducts.length > 0 && !catalogError

    // Step 1 validation
    const handleNext = () => {
        setStep1Error("")
        const hasProduct = useCatalog ? !!selectedProductId : !!customProductType.trim()
        if (!hasProduct) { setStep1Error("Le type de produit est requis."); return }
        if (!quantity || parseInt(quantity) < 1) { setStep1Error("La quantité doit être d'au moins 1."); return }
        setStep(2)
    }

    const resolvedProductId = useCatalog ? selectedProductId : customProductType.trim()

    // File handling
    const validateFile = (f: File): boolean => {
        if (!f.name.toLowerCase().endsWith(".pdf")) {
            setFileError("Seuls les fichiers PDF sont acceptés.")
            return false
        }
        if (f.size > MAX_FILE_SIZE) {
            setFileError("Le fichier ne doit pas dépasser 10 MB.")
            return false
        }
        setFileError("")
        return true
    }

    const handleFileSelect = (f: File) => {
        if (validateFile(f)) {
            setFile(f)
            setSkipFile(false)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFileSelect(f)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }, [])

    const handleDragLeave = useCallback(() => setDragOver(false), [])

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " o"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko"
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo"
    }

    // Submit
    const handleSubmit = async () => {
        if (!file && !skipFile) {
            setFileError("Uploadez un brief ou cochez \"Passer cette étape\".")
            return
        }
        setSubmitting(true)
        setSubmitError("")

        try {
            // 1. Create project
            const res = await fetch(`${API_URL}/api/project/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
                body: JSON.stringify({
                    product_id: resolvedProductId,
                    qty: parseInt(quantity),
                    spec: specs.trim() || undefined,
                }),
            })
            const data = await res.json()
            if (!data.ok && !data.project_id) {
                setSubmitError(data.message || data.error || "Erreur lors de la création du projet.")
                setSubmitting(false)
                return
            }
            const projectId = data.project_id || data.project?.project_id

            // 2. Upload brief if file selected
            if (file && projectId) {
                const formData = new FormData()
                formData.append("file", file)
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
            }

            // 3. Success
            setSuccess(true)
            setTimeout(() => {
                router.push(`/projet/${projectId}`)
            }, 2000)
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
                    backgroundColor: C.white, borderRadius: 16, padding: "48px 32px",
                    maxWidth: 640, width: "100%", textAlign: "center",
                    boxShadow: "0 4px 24px rgba(58,64,64,0.10)", border: "1px solid " + C.border,
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

    const steps = [
        { num: 1, label: "Brief" },
        { num: 2, label: "Fichier" },
    ]

    return (
        <div style={{ fontFamily: "Inter, sans-serif", display: "flex", justifyContent: "center", padding: "40px 16px" }}>
            <div style={{
                backgroundColor: C.white, borderRadius: 16, padding: "32px",
                maxWidth: 640, width: "100%",
                boxShadow: "0 4px 24px rgba(58,64,64,0.10)", border: "1px solid " + C.border,
            }}>
                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                    {steps.map((s, i) => (
                        <React.Fragment key={s.num}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: "50%",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, fontWeight: 700,
                                    backgroundColor: step > s.num ? "#1a7a3c" : step === s.num ? C.yellow : C.border,
                                    color: step > s.num ? "#fff" : C.dark,
                                    transition: "all 0.3s",
                                }}>
                                    {step > s.num ? "✓" : s.num}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: step >= s.num ? C.dark : C.muted }}>
                                    {s.num}. {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2, maxWidth: 120, margin: "0 16px",
                                    backgroundColor: step > 1 ? "#1a7a3c" : C.border,
                                    marginBottom: 22, transition: "background-color 0.3s",
                                }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step 1 */}
                {step === 1 && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: "0 0 24px" }}>
                            Décrivez votre projet
                        </h2>

                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Type de produit</label>
                            {catalogLoading ? (
                                <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: C.muted }}>
                                    Chargement du catalogue...
                                </div>
                            ) : useCatalog ? (
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">— Sélectionnez un produit —</option>
                                    {catalogProducts.map((p) => (
                                        <option key={p.id || p.catalog_item_id} value={p.id || p.catalog_item_id}>
                                            {p.name}{p.dimensions ? ` — ${p.dimensions}` : ""}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={customProductType}
                                        onChange={(e) => setCustomProductType(e.target.value)}
                                        placeholder="Ex: Roll-up 85x200, Cartes de visite, Kakémono"
                                        style={inputStyle}
                                    />
                                    <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
                                        Catalogue indisponible — décrivez votre produit manuellement.
                                    </p>
                                </>
                            )}
                        </div>

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

                        <div style={{ marginBottom: 24 }}>
                            <label style={labelStyle}>
                                Spécifications <span style={{ color: C.muted, fontWeight: 400 }}>(optionnel)</span>
                            </label>
                            <textarea
                                value={specs}
                                onChange={(e) => setSpecs(e.target.value)}
                                placeholder="Finitions, format, matériaux, délai souhaité..."
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical" }}
                            />
                        </div>

                        {step1Error && <p style={errorStyle}>{step1Error}</p>}

                        <button onClick={handleNext} style={primaryBtnStyle}>
                            Suivant →
                        </button>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: "0 0 24px" }}>
                            Uploadez votre brief
                        </h2>

                        {/* Drop zone */}
                        {!file && (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? C.yellow : C.border}`,
                                    borderRadius: 12, padding: "40px 20px",
                                    textAlign: "center", cursor: "pointer",
                                    backgroundColor: dragOver ? "#fef9e0" : C.white,
                                    transition: "all 0.2s", marginBottom: 16,
                                }}
                            >
                                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                                <p style={{ fontSize: 14, color: C.dark, fontWeight: 500, margin: "0 0 4px" }}>
                                    Glissez votre brief PDF ici ou cliquez pour sélectionner
                                </p>
                                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>PDF uniquement — 10 MB max</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) handleFileSelect(f)
                                    }}
                                />
                            </div>
                        )}

                        {/* File preview */}
                        {file && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "14px 16px", borderRadius: 10,
                                backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8",
                                marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 28 }}>📕</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {file.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>{formatSize(file.size)}</div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                                    style={{
                                        padding: "6px 14px", borderRadius: 6, border: "1px solid " + C.border,
                                        backgroundColor: C.white, color: "#c0392b", fontSize: 12, fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Supprimer
                                </button>
                            </div>
                        )}

                        {/* Skip checkbox */}
                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, cursor: "pointer", fontSize: 14, color: C.dark }}>
                            <input
                                type="checkbox"
                                checked={skipFile}
                                onChange={(e) => { setSkipFile(e.target.checked); if (e.target.checked) { setFile(null); setFileError("") } }}
                                style={{ accentColor: C.yellow, width: 16, height: 16 }}
                            />
                            Passer cette étape
                        </label>

                        {fileError && <p style={errorStyle}>{fileError}</p>}
                        {submitError && <p style={errorStyle}>{submitError}</p>}

                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={() => setStep(1)}
                                disabled={submitting}
                                style={{
                                    padding: "12px 24px", borderRadius: 8, border: "1px solid " + C.border,
                                    backgroundColor: C.white, color: C.dark, fontSize: 14, fontWeight: 600,
                                    cursor: "pointer", opacity: submitting ? 0.5 : 1,
                                }}
                            >
                                ← Retour
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{
                                    ...primaryBtnStyle,
                                    flex: 1,
                                    opacity: submitting ? 0.7 : 1,
                                }}
                            >
                                {submitting ? "Création en cours..." : "Créer le projet"}
                            </button>
                        </div>
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
    color: "#c0392b", fontSize: 13, marginBottom: 12, margin: "0 0 12px",
}
