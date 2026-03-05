"use client"

import React, { useState, useRef, useCallback } from "react"
import { API_URL, C } from "@/lib/constants"
import {
    Building2, Mail, Lock, Phone, Globe, MapPin, FileText, ChevronRight,
    Printer, Hammer, Wrench, Truck, Calendar, Signpost, Package, Plus,
    Upload, CheckCircle2, XCircle, AlertTriangle, Loader2, FileUp,
} from "lucide-react"

// ─── Trades config ──────────────────────────────────────────────────────────

const TRADES = [
    { key: "impression", label: "Impression", icon: Printer },
    { key: "menuiserie", label: "Menuiserie", icon: Hammer },
    { key: "metallurgie", label: "Métallurgie", icon: Wrench },
    { key: "logistique", label: "Logistique", icon: Truck },
    { key: "evenementiel", label: "Événementiel", icon: Calendar },
    { key: "signaletique", label: "Signalétique", icon: Signpost },
    { key: "packaging", label: "Packaging", icon: Package },
    { key: "autre", label: "Autre", icon: Plus },
] as const

const STEPS = ["Entreprise", "Métiers", "Tarifs"]

// ─── Component ──────────────────────────────────────────────────────────────

export default function SupplierRegister() {
    const [step, setStep] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Step 1 fields
    const [companyName, setCompanyName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [phone, setPhone] = useState("")
    const [website, setWebsite] = useState("")
    const [city, setCity] = useState("")
    const [postalCode, setPostalCode] = useState("")
    const [address, setAddress] = useState("")
    const [description, setDescription] = useState("")

    // Step 2
    const [selectedTrades, setSelectedTrades] = useState<string[]>([])
    const [tradeSpecs, setTradeSpecs] = useState<Record<string, string>>({})

    // Step 3
    const [file, setFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [noGrid, setNoGrid] = useState(false)

    // Submission
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [productsExtracted, setProductsExtracted] = useState<number | null>(null)

    // Validation errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ── Step 1 validation ───────────────────────────────────────────────────

    function validateStep1(): boolean {
        const errs: Record<string, string> = {}
        if (!companyName.trim()) errs.companyName = "Requis"
        if (!email.trim()) errs.email = "Requis"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email invalide"
        if (!password) errs.password = "Requis"
        else if (password.length < 8) errs.password = "Minimum 8 caractères"
        setFieldErrors(errs)
        return Object.keys(errs).length === 0
    }

    // ── Step 2 validation ───────────────────────────────────────────────────

    function validateStep2(): boolean {
        if (selectedTrades.length === 0) {
            setFieldErrors({ trades: "Sélectionnez au moins 1 métier" })
            return false
        }
        setFieldErrors({})
        return true
    }

    // ── File handling ───────────────────────────────────────────────────────

    const ACCEPTED_EXT = [".pdf",".xlsx",".xls",".csv",".pptx",".docx",".doc",".txt",".rtf",".jpg",".jpeg",".png",".webp"]
    const ACCEPTED_ATTR = ACCEPTED_EXT.join(",")

    function handleFile(f: File) {
        const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "")
        if (!ACCEPTED_EXT.includes(ext)) {
            setError("Format non supporté.")
            return
        }
        if (f.size > 20 * 1024 * 1024) {
            setError("Le fichier ne doit pas dépasser 20 MB.")
            return
        }
        setError("")
        setFile(f)
        setNoGrid(false)
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }, [])

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " o"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko"
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo"
    }

    // ── Toggle trade ────────────────────────────────────────────────────────

    function toggleTrade(key: string) {
        setSelectedTrades(prev =>
            prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
        )
        setFieldErrors({})
    }

    // ── Submit ──────────────────────────────────────────────────────────────

    async function handleSubmit() {
        setSubmitting(true)
        setError("")

        try {
            // 1. Register
            const regRes = await fetch(`${API_URL}/api/supplier-portal/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    company_name: companyName.trim(),
                    phone: phone.trim() || undefined,
                    website: website.trim() || undefined,
                    city: city.trim() || undefined,
                    postal_code: postalCode.trim() || undefined,
                    address: address.trim() || undefined,
                    description: description.trim() || undefined,
                    trades: selectedTrades,
                }),
            })

            const regData = await regRes.json()
            if (!regData.ok) {
                const msg = regData.error === "EMAIL_ALREADY_EXISTS"
                    ? "Cette adresse email est déjà utilisée."
                    : regData.error === "MISSING_REQUIRED_FIELDS"
                    ? "Veuillez remplir tous les champs obligatoires."
                    : "Erreur lors de l'inscription. Veuillez réessayer."
                setError(msg)
                setSubmitting(false)
                return
            }

            // 2. Login to get token
            const loginRes = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            })
            const loginData = await loginRes.json()
            const token = loginData.ok ? loginData.session?.access_token : null

            // 3. Upload price grid if present
            if (file && token) {
                try {
                    const formData = new FormData()
                    formData.append("file", file)
                    const uploadRes = await fetch(`${API_URL}/api/supplier-portal/upload-price-grid`, {
                        method: "POST",
                        headers: { Authorization: "Bearer " + token },
                        body: formData,
                    })
                    const uploadData = await uploadRes.json()
                    if (uploadData.ok && uploadData.products_extracted) {
                        setProductsExtracted(uploadData.products_extracted)
                    }
                } catch {
                    // Non-blocking: registration succeeded even if upload fails
                }
            }

            setSuccess(true)
        } catch {
            setError("Erreur réseau. Vérifiez votre connexion et réessayez.")
        }

        setSubmitting(false)
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    function nextStep() {
        if (step === 0 && validateStep1()) setStep(1)
        else if (step === 1 && validateStep2()) setStep(2)
    }

    function prevStep() {
        if (step > 0) { setStep(step - 1); setFieldErrors({}); setError("") }
    }

    // ── Success screen ──────────────────────────────────────────────────────

    if (success) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
                <div style={{ maxWidth: 500, width: "100%", backgroundColor: C.white, borderRadius: 16, padding: "48px 40px", textAlign: "center", boxShadow: "0 2px 8px rgba(58,64,64,0.1)" }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#e8f8ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                        <CheckCircle2 size={32} color="#1a7a3c" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 12px" }}>Inscription envoyée</h2>
                    <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, margin: "0 0 24px" }}>
                        Notre équipe validera votre profil sous 24h. Vous recevrez un email de confirmation à <strong style={{ color: C.dark }}>{email}</strong>.
                    </p>
                    {productsExtracted != null && productsExtracted > 0 && (
                        <div style={{ padding: "14px 20px", backgroundColor: "#fef9e0", borderRadius: 10, border: "1px solid #f4cf1588", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <FileText size={16} color="#b89a00" />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#b89a00" }}>
                                {productsExtracted} produit{productsExtracted > 1 ? "s" : ""} détecté{productsExtracted > 1 ? "s" : ""} dans votre grille
                            </span>
                        </div>
                    )}
                    <a href="/" style={{ display: "inline-block", padding: "12px 28px", backgroundColor: C.dark, color: C.white, borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                        Retour à l'accueil
                    </a>
                </div>
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: "Inter, sans-serif", padding: "40px 20px" }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: C.dark }}>
                    LF
                </div>
                <span style={{ fontWeight: 700, fontSize: 18, color: C.dark }}>LA FAB</span>
            </div>

            <div style={{ maxWidth: 640, margin: "0 auto" }}>

                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 36 }}>
                    {STEPS.map((s, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <div style={{ width: 40, height: 2, backgroundColor: i <= step ? C.yellow : C.border }} />}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    backgroundColor: i <= step ? C.yellow : C.white,
                                    border: i <= step ? "none" : "2px solid " + C.border,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 700,
                                    color: i <= step ? C.dark : C.muted,
                                }}>
                                    {i < step ? <CheckCircle2 size={16} /> : i + 1}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: i === step ? 600 : 400, color: i <= step ? C.dark : C.muted }}>
                                    {s}
                                </span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* Card */}
                <div style={{ backgroundColor: C.white, borderRadius: 16, padding: "36px 32px", boxShadow: "0 2px 8px rgba(58,64,64,0.1)" }}>

                    {/* ═══════════ STEP 1 — Entreprise ═══════════ */}
                    {step === 0 && (
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: "0 0 24px", display: "flex", alignItems: "center", gap: 8 }}>
                                <Building2 size={20} /> Votre entreprise
                            </h2>

                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <Field label="Nom de l'entreprise" required error={fieldErrors.companyName}>
                                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Imprimerie Dupont" style={inputStyle} />
                                </Field>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <Field label="Email professionnel" required error={fieldErrors.email}>
                                        <div style={{ position: "relative" }}>
                                            <Mail size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                                            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="contact@entreprise.fr" style={{ ...inputStyle, paddingLeft: 36 }} />
                                        </div>
                                    </Field>
                                    <Field label="Mot de passe" required error={fieldErrors.password}>
                                        <div style={{ position: "relative" }}>
                                            <Lock size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                                            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min. 8 caractères" style={{ ...inputStyle, paddingLeft: 36 }} />
                                        </div>
                                    </Field>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <Field label="Téléphone">
                                        <div style={{ position: "relative" }}>
                                            <Phone size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01 23 45 67 89" style={{ ...inputStyle, paddingLeft: 36 }} />
                                        </div>
                                    </Field>
                                    <Field label="Site web">
                                        <div style={{ position: "relative" }}>
                                            <Globe size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                                            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://www.entreprise.fr" style={{ ...inputStyle, paddingLeft: 36 }} />
                                        </div>
                                    </Field>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                                    <Field label="Ville">
                                        <div style={{ position: "relative" }}>
                                            <MapPin size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                                            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={{ ...inputStyle, paddingLeft: 36 }} />
                                        </div>
                                    </Field>
                                    <Field label="Code postal">
                                        <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inputStyle} />
                                    </Field>
                                </div>

                                <Field label="Adresse complète">
                                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 rue de l'Industrie" style={inputStyle} />
                                </Field>

                                <Field label="Description de l'activité">
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez votre activité, vos spécialités, vos équipements..." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ STEP 2 — Métiers ═══════════ */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                                <Wrench size={20} /> Vos métiers
                            </h2>
                            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>Sélectionnez au moins un métier</p>

                            {fieldErrors.trades && (
                                <div style={{ fontSize: 13, color: "#c0392b", marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
                                    <AlertTriangle size={14} /> {fieldErrors.trades}
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                                {TRADES.map(trade => {
                                    const Icon = trade.icon
                                    const selected = selectedTrades.includes(trade.key)
                                    return (
                                        <div key={trade.key}>
                                            <button
                                                onClick={() => toggleTrade(trade.key)}
                                                style={{
                                                    width: "100%", padding: "14px 16px",
                                                    border: selected ? "2px solid " + C.yellow : "1px solid " + C.border,
                                                    borderRadius: 10,
                                                    backgroundColor: selected ? "#fef9e0" : C.white,
                                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 8,
                                                    backgroundColor: selected ? C.yellow : C.bg,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                }}>
                                                    <Icon size={18} color={selected ? C.dark : C.muted} />
                                                </div>
                                                <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: C.dark }}>
                                                    {trade.label}
                                                </span>
                                                {selected && <CheckCircle2 size={16} color="#b89a00" style={{ marginLeft: "auto" }} />}
                                            </button>

                                            {selected && (
                                                <input
                                                    value={tradeSpecs[trade.key] || ""}
                                                    onChange={e => setTradeSpecs(prev => ({ ...prev, [trade.key]: e.target.value }))}
                                                    placeholder="Spécialités (optionnel)"
                                                    style={{ ...inputStyle, marginTop: 6, fontSize: 12 }}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══════════ STEP 3 — Tarifs ═══════════ */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                                <FileText size={20} /> Votre grille tarifaire
                            </h2>
                            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>
                                Tous formats acceptés : PDF, Excel, Word, PowerPoint, CSV, images
                            </p>

                            {!noGrid && (
                                <>
                                    <input ref={fileInputRef} type="file" accept={ACCEPTED_ATTR} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} style={{ display: "none" }} />

                                    {!file ? (
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                border: "2px dashed " + (dragOver ? C.yellow : C.border),
                                                borderRadius: 12, padding: "48px 24px", textAlign: "center",
                                                cursor: "pointer", backgroundColor: dragOver ? "#fef9e0" : C.bg,
                                                transition: "all 0.2s", marginBottom: 20,
                                            }}
                                        >
                                            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: C.white, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>
                                                <FileUp size={24} color={C.muted} />
                                            </div>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 6 }}>
                                                Déposez votre grille tarifaire
                                            </div>
                                            <div style={{ fontSize: 13, color: C.muted }}>
                                                PDF, Excel, Word, PowerPoint, CSV, images — 20 MB max
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#fef9e0", borderRadius: 10, border: "1px solid #f4cf1588", marginBottom: 20 }}>
                                            <FileText size={20} color="#b89a00" />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{file.name}</div>
                                                <div style={{ fontSize: 12, color: C.muted }}>{formatSize(file.size)}</div>
                                            </div>
                                            <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                                                <XCircle size={18} color={C.muted} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted, cursor: "pointer", marginBottom: 20 }}>
                                <input type="checkbox" checked={noGrid} onChange={e => { setNoGrid(e.target.checked); if (e.target.checked) setFile(null) }} style={{ accentColor: C.yellow }} />
                                Je n'ai pas de grille tarifaire
                            </label>

                            <div style={{ padding: "14px 16px", backgroundColor: C.bg, borderRadius: 10, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                                <AlertTriangle size={14} color="#b89a00" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
                                Votre grille sera analysée par notre IA pour extraire automatiquement vos produits et tarifs. Vous pourrez les modifier ensuite depuis votre espace.
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                        <div style={{ marginTop: 20, fontSize: 13, color: "#c0392b", display: "flex", alignItems: "center", gap: 6 }}>
                            <XCircle size={14} /> {error}
                        </div>
                    )}

                    {/* ── Navigation buttons ── */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
                        {step > 0 ? (
                            <button onClick={prevStep} style={{
                                padding: "12px 24px", backgroundColor: C.white, color: C.dark,
                                border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                            }}>
                                Retour
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 2 ? (
                            <button onClick={nextStep} style={{
                                padding: "12px 28px", backgroundColor: C.yellow, color: C.dark,
                                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                Continuer <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={submitting} style={{
                                padding: "12px 28px",
                                backgroundColor: submitting ? C.muted : C.yellow,
                                color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                                cursor: submitting ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                {submitting ? (
                                    <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Inscription en cours...</>
                                ) : (
                                    <><Upload size={16} /> Finaliser l'inscription</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Login link */}
                <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.muted }}>
                    Déjà inscrit ?{" "}
                    <a href="/login" style={{ color: C.dark, fontWeight: 600, textDecoration: "none" }}>Se connecter</a>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}

// ─── Shared styles & components ─────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1px solid #e0e0de",
    borderRadius: 8, fontSize: 14, backgroundColor: "#FAFFFD", color: "#3A4040",
    boxSizing: "border-box", outline: "none", fontFamily: "Inter, sans-serif",
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#7a8080", marginBottom: 6 }}>
                {label}{required && <span style={{ color: "#c0392b" }}> *</span>}
            </div>
            {children}
            {error && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{error}</div>}
        </div>
    )
}
