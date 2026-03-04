"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { getToken } from "@/lib/auth"
import { exportCSV } from "@/lib/utils"

const { useEffect, useState, useRef } = React

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    created:      { label: "En attente de devis",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:       { label: "Devis envoyé",          bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    validated:    { label: "Commande validée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    in_production:{ label: "En production",         bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:    { label: "Livré",                 bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    archived:     { label: "Archivé",               bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
}

const STATUS_FLOW = ["created", "quoted", "validated", "in_production", "delivered"]

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: sc.bg,
            color: sc.color,
            border: "1px solid " + sc.border,
            whiteSpace: "nowrap",
        }}>
            {sc.label}
        </span>
    )
}

// ─── AdminNote ────────────────────────────────────────────────────────────────

function AdminNote({ projectId, initialNote }: { projectId: string; initialNote: string }) {
    const lsKey = "admin_note_" + projectId
    const [note, setNote] = useState(initialNote || (typeof window !== "undefined" ? localStorage.getItem(lsKey) : "") || "")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function saveNote(text: string) {
        localStorage.setItem(lsKey, text)
        const token = getToken()
        if (!token) return
        setSaving(true)
        setSaved(false)
        setError(false)
        fetch(`${API_URL}/api/project/${projectId}`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ admin_note: text }),
        })
            .then((r) => r.json())
            .then((data) => {
                setSaving(false)
                if (data.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
                else setError(true)
            })
            .catch(() => { setSaving(false); setError(true) })
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const text = e.target.value
        setNote(text)
        setSaved(false)
        setError(false)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => saveNote(text), 1200)
    }

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    🔒 Note interne
                </div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                    {saving && <span style={{ color: C.muted }}>Sauvegarde...</span>}
                    {saved  && <span style={{ color: "#1a7a3c" }}>✓ Sauvegardé</span>}
                    {error  && <span style={{ color: "#c0392b" }}>✗ Erreur</span>}
                </div>
            </div>
            <textarea
                value={note}
                onChange={handleChange}
                placeholder="Instructions production, remarques client, contraintes techniques..."
                style={{
                    width: "100%",
                    minHeight: 90,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid " + (error ? "#f5c6c6" : saved ? "#a8dbb8" : C.border),
                    backgroundColor: error ? "#fff8f8" : saved ? "#f8fffe" : C.bg,
                    fontSize: 13,
                    color: C.dark,
                    fontFamily: "Inter, sans-serif",
                    resize: "vertical",
                    boxSizing: "border-box",
                    outline: "none",
                    lineHeight: 1.6,
                }}
            />
        </div>
    )
}

// ─── AdminInvoiceForm ─────────────────────────────────────────────────────────

function AdminInvoiceForm({ projectId }: { projectId: string }) {
    const [lines, setLines] = useState([{ description: "", quantity: 1, unit_price: 0 }])
    const [notes, setNotes] = useState("Merci pour votre confiance.")
    const [dueDays, setDueDays] = useState(30)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState("")

    function addLine() {
        setLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])
    }

    function removeLine(idx: number) {
        setLines((prev) => prev.filter((_, i) => i !== idx))
    }

    function updateLine(idx: number, field: string, value: string) {
        setLines((prev) =>
            prev.map((l, i) =>
                i === idx ? { ...l, [field]: field === "description" ? value : Number(value) } : l
            )
        )
    }

    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
    const tax      = Math.round(subtotal * 0.2 * 100) / 100
    const total    = Math.round((subtotal + tax) * 100) / 100

    function handleGenerate() {
        const token = getToken()
        if (!token) return
        const invalid = lines.some((l) => !l.description.trim() || l.quantity <= 0 || l.unit_price <= 0)
        if (invalid) { setError("Tous les champs de ligne sont obligatoires"); return }
        setLoading(true)
        setError("")
        setResult(null)
        fetch(`${API_URL}/api/invoice/generate`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: projectId, line_items: lines, notes, due_days: dueDays }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setResult(data.invoice)
                else setError(data.message || "Erreur génération")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }

    return (
        <div style={{ marginTop: 24, padding: 20, backgroundColor: C.bg, borderRadius: 12, border: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
                🧾 Générer une facture
            </div>

            {/* Lignes */}
            {lines.map((line, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 32px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input
                        value={line.description}
                        onChange={(e) => updateLine(idx, "description", e.target.value)}
                        placeholder="Description"
                        style={{ padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                    />
                    <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                        min={1}
                        placeholder="Qté"
                        style={{ padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", textAlign: "center" }}
                    />
                    <input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
                        min={0}
                        step={0.01}
                        placeholder="Prix HT"
                        style={{ padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", textAlign: "right" }}
                    />
                    <button
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        style={{ width: 32, height: 32, border: "1px solid " + C.border, borderRadius: 8, background: C.white, color: C.muted, cursor: lines.length === 1 ? "not-allowed" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        ×
                    </button>
                </div>
            ))}

            <button
                onClick={addLine}
                style={{ padding: "6px 14px", background: "none", border: "1px dashed " + C.border, borderRadius: 8, fontSize: 12, color: C.muted, cursor: "pointer", marginBottom: 16 }}
            >
                + Ajouter une ligne
            </button>

            {/* Notes + délai */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12, marginBottom: 16 }}>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optionnel)"
                    rows={2}
                    style={{ padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif" }}
                />
                <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Délai paiement</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="number"
                            value={dueDays}
                            onChange={(e) => setDueDays(Number(e.target.value))}
                            min={1}
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none" }}
                        />
                        <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>jours</span>
                    </div>
                </div>
            </div>

            {/* Totaux */}
            <div style={{ backgroundColor: C.white, borderRadius: 10, padding: "12px 16px", marginBottom: 16, border: "1px solid " + C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}>
                    <span>Sous-total HT</span><span>{subtotal.toFixed(2)} €</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}>
                    <span>TVA 20%</span><span>{tax.toFixed(2)} €</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: C.dark, paddingTop: 8, borderTop: "1px solid " + C.border }}>
                    <span>Total TTC</span><span>{total.toFixed(2)} €</span>
                </div>
            </div>

            {error && <div style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>✗ {error}</div>}

            {result ? (
                <div style={{ backgroundColor: "#e8f8ee", border: "1px solid #a8dbb8", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7a3c", marginBottom: 8 }}>
                        ✅ Facture {result.invoice_number} générée
                    </div>
                    <div style={{ fontSize: 13, color: C.dark, marginBottom: 12 }}>
                        Total : {result.total} € · Échéance : {new Date(result.due_at).toLocaleDateString("fr-FR")}
                    </div>
                    <a
                        href={result.pdf_url}
                        target="_blank"
                        style={{ padding: "8px 16px", background: C.dark, color: C.white, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block" }}
                    >
                        📄 Voir le PDF
                    </a>
                </div>
            ) : (
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    style={{ width: "100%", padding: "11px 24px", background: loading ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
                >
                    {loading ? "⏳ Génération..." : "🧾 Générer la facture"}
                </button>
            )}
        </div>
    )
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [expandedId, setExpandedId] = useState(null)
    const [statusChanging, setStatusChanging] = useState(null)
    const [uploadingId, setUploadingId] = useState(null)
    const [uploadSuccess, setUploadSuccess] = useState(null)
    const [clientInfo, setClientInfo] = useState({})
    const [loadingClient, setLoadingClient] = useState(null)
    const fileInputRef = useRef(null)
    const uploadTargetRef = useRef(null)

    useEffect(() => {
        const token = getToken()
        if (!token) { setError("Non authentifié"); setLoading(false); return }
        fetch(API_URL + "/api/admin/projects", { headers: { Authorization: "Bearer " + token } })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects(data.projects)
                else setError("Accès refusé ou erreur serveur")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [])

    function loadClientInfo(projectId: string) {
        if (clientInfo[projectId]) return
        const token = getToken()
        if (!token) return
        setLoadingClient(projectId)
        fetch(`${API_URL}/api/admin/projects/${projectId}`, { headers: { Authorization: "Bearer " + token } })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.client) setClientInfo((prev) => ({ ...prev, [projectId]: data.client }))
                setLoadingClient(null)
            })
            .catch(() => setLoadingClient(null))
    }

    function handleStatusChange(projectId: string, newStatus: string) {
        const token = getToken()
        if (!token) return
        setStatusChanging(projectId)
        fetch(`${API_URL}/api/project/${projectId}/status`, {
            method: "PATCH",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects((prev) => prev.map((p) => p.project_id === projectId ? { ...p, status: newStatus } : p))
                setStatusChanging(null)
            })
            .catch(() => setStatusChanging(null))
    }

    function handleUploadQuote(projectId: string) {
        uploadTargetRef.current = projectId
        fileInputRef.current?.click()
    }

    function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        const projectId = uploadTargetRef.current
        if (!file || !projectId) return
        const token = getToken()
        if (!token) return
        setUploadingId(projectId)
        const formData = new FormData()
        formData.append("file", file)
        fetch(`${API_URL}/api/project/${projectId}/upload-quote`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body: formData,
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) { setUploadSuccess(projectId); setTimeout(() => setUploadSuccess(null), 3000) }
                setUploadingId(null)
            })
            .catch(() => setUploadingId(null))
        e.target.value = ""
    }

    const filtered = projects.filter((p) => {
        const matchStatus = filterStatus === "all" || p.status === filterStatus
        const matchSearch =
            search === "" ||
            p.project_id.toLowerCase().includes(search.toLowerCase()) ||
            p.account_id.toLowerCase().includes(search.toLowerCase()) ||
            (p.brief_analysis?.product_type || "").toLowerCase().includes(search.toLowerCase()) ||
            (clientInfo[p.project_id]?.email || "").toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    function handleExportProjects() {
        const rows = filtered.map((p) => ({
            "ID Projet":     p.project_id,
            "ID Client":     p.account_id,
            "Email Client":  clientInfo[p.project_id]?.email || "",
            Statut:          STATUS_CONFIG[p.status]?.label || p.status,
            "Type Produit":  p.brief_analysis?.product_type || "",
            Quantité:        p.brief_analysis?.quantity_detected || "",
            Dimensions:      p.brief_analysis?.dimensions || "",
            Support:         p.brief_analysis?.material || "",
            Finition:        p.brief_analysis?.finish || "",
            Délai:           p.brief_analysis?.delivery_deadline || "",
            "Total HT":      p.pricing?.total_net || "",
            Devise:          p.pricing?.currency || "",
            "Date Création": new Date(p.created_at).toLocaleDateString("fr-FR"),
            "Note Admin":    (typeof window !== "undefined" ? localStorage.getItem("admin_note_" + p.project_id) : "") || p.admin_note || "",
        }))
        exportCSV(rows, "lafab_projets")
    }

    const counts = Object.fromEntries(
        Object.keys(STATUS_CONFIG).map((s) => [s, projects.filter((p) => p.status === s).length])
    )
    const pending48h = projects.filter(
        (p) => p.status === "created" && Date.now() - new Date(p.created_at).getTime() > 48 * 3600 * 1000
    ).length

    if (loading) return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement admin...</p>
        </div>
    )

    if (error) return (
        <div style={{ width: "100%", minHeight: "100vh", padding: 32, background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>❌ {error}</p>
        </div>
    )

    return (
        <div style={{ width: "100%", minHeight: "100vh", overflowY: "auto", padding: 32, fontFamily: "Inter, sans-serif", boxSizing: "border-box", background: C.bg }}>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelected} style={{ display: "none" }} />

            <div style={{ maxWidth: 960, margin: "0 auto" }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: "bold", marginBottom: 4, color: C.dark }}>Admin — La Fab</h1>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{projects.length} projets au total</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <button onClick={handleExportProjects} style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            ↓ Export CSV
                        </button>
                        <a href="/admin/catalogue" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🗂 Catalogue</a>
                        <a href="/admin/analytics" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>📊 Analytics</a>
                        <a href="/admin/users"     style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>👥 Utilisateurs</a>
                        <a href="/admin/factures"  style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🧾 Factures</a>
                        {pending48h > 0 && (
                            <div style={{ background: "#fee", border: "1px solid #f5c6c6", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#c0392b", fontWeight: 600 }}>
                                ⚠️ {pending48h} projet{pending48h > 1 ? "s" : ""} sans devis depuis +48h
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Compteurs statuts ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
                    {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
                        <div
                            key={key}
                            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                            style={{ background: filterStatus === key ? sc.bg : C.white, borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid " + (filterStatus === key ? sc.border : C.border), cursor: "pointer" }}
                        >
                            <div style={{ fontSize: 22, fontWeight: 700, color: sc.color }}>{counts[key] || 0}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{sc.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Recherche ── */}
                <div style={{ marginBottom: 20 }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par ID, client, email, type de produit..."
                        style={{ width: "100%", padding: "12px 16px", border: "1px solid " + C.border, borderRadius: 10, fontSize: 14, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                    />
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    {filtered.length} projet{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                </div>

                {/* ── Liste projets ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.map((project) => {
                        const isExpanded  = expandedId === project.project_id
                        const isChanging  = statusChanging === project.project_id
                        const isUploading = uploadingId === project.project_id
                        const wasUploaded = uploadSuccess === project.project_id
                        const hasNote     = !!(project.admin_note || (typeof window !== "undefined" && localStorage.getItem("admin_note_" + project.project_id)))

                        return (
                            <div key={project.project_id} style={{ background: C.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(58,64,64,0.08)" }}>

                                {/* ── Ligne cliquable ── */}
                                <div
                                    onClick={() => { const next = isExpanded ? null : project.project_id; setExpandedId(next); if (next) loadClientInfo(next) }}
                                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                                                {project.brief_analysis?.product_type || "Brief uploadé"}
                                            </span>
                                            <StatusBadge status={project.status} />
                                            {project.status === "created" && Date.now() - new Date(project.created_at).getTime() > 48 * 3600 * 1000 && (
                                                <span style={{ fontSize: 11, color: "#c0392b", fontWeight: 600 }}>⚠️ +48h</span>
                                            )}
                                            {hasNote && (
                                                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, padding: "2px 8px", border: "1px solid " + C.border, borderRadius: 10 }}>🔒 Note</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            {project.project_id} · {clientInfo[project.project_id]?.email || project.account_id.slice(0, 8) + "..."}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 18, color: C.muted }}>{isExpanded ? "▲" : "▼"}</div>
                                </div>

                                {/* ── Panneau expandé ── */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid " + C.border, padding: 20 }}>

                                        {/* Client */}
                                        <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Client</div>
                                                {loadingClient === project.project_id ? (
                                                    <div style={{ fontSize: 13, color: C.muted }}>Chargement...</div>
                                                ) : clientInfo[project.project_id] ? (
                                                    <div>
                                                        <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>{clientInfo[project.project_id].email}</div>
                                                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                                            Inscrit le {new Date(clientInfo[project.project_id].created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 13, color: C.muted }}>{project.account_id.slice(0, 8)}...</div>
                                                )}
                                            </div>
                                            {clientInfo[project.project_id] && (
                                                <a href={"mailto:" + clientInfo[project.project_id].email} style={{ padding: "8px 14px", background: C.dark, color: C.white, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                                                    ✉️ Contacter
                                                </a>
                                            )}
                                        </div>

                                        {/* Brief */}
                                        {project.brief_analysis && (
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", marginBottom: 20, backgroundColor: C.bg, borderRadius: 10, padding: 16 }}>
                                                {[
                                                    { label: "Type",       val: project.brief_analysis.product_type },
                                                    { label: "Quantité",   val: project.brief_analysis.quantity_detected ? project.brief_analysis.quantity_detected + " ex." : null },
                                                    { label: "Dimensions", val: project.brief_analysis.dimensions },
                                                    { label: "Support",    val: project.brief_analysis.material },
                                                    { label: "Finition",   val: project.brief_analysis.finish },
                                                    { label: "Délai",      val: project.brief_analysis.delivery_deadline },
                                                ].filter((i) => i.val).map((item, idx) => (
                                                    <div key={idx}>
                                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{item.label}</div>
                                                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{item.val}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Note interne */}
                                        <AdminNote projectId={project.project_id} initialNote={project.admin_note} />

                                        {/* Changement statut */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                                                Changer le statut
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {STATUS_FLOW.map((s, idx) => {
                                                    const sc = STATUS_CONFIG[s]
                                                    const isCurrent = project.status === s
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => !isCurrent && handleStatusChange(project.project_id, s)}
                                                            disabled={isCurrent || isChanging}
                                                            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: isCurrent ? "2px solid " + sc.color : "1px solid " + C.border, backgroundColor: isCurrent ? sc.bg : C.white, color: isCurrent ? sc.color : C.muted, cursor: isCurrent ? "default" : "pointer", opacity: isChanging ? 0.5 : 1 }}
                                                        >
                                                            {idx + 1}. {sc.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                            <button
                                                onClick={() => handleUploadQuote(project.project_id)}
                                                disabled={isUploading}
                                                style={{ padding: "9px 18px", background: isUploading ? C.muted : wasUploaded ? "#e8f8ee" : C.yellow, color: wasUploaded ? "#1a7a3c" : C.dark, border: wasUploaded ? "1px solid #a8dbb8" : "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isUploading ? "not-allowed" : "pointer" }}
                                            >
                                                {isUploading ? "⏳ Upload..." : wasUploaded ? "✅ Devis uploadé !" : "📄 Uploader un devis PDF"}
                                            </button>
                                            <a href={"/admin/quote-validation?project_id=" + project.project_id} style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>📋 Devis</a>
                                            <a href={"/messages?project_id=" + project.project_id + "&account_id=" + project.account_id} style={{ padding: "9px 18px", background: C.dark, color: C.white, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>💬 Messages</a>
                                            <a href={"/consultations?project_id=" + project.project_id + "&account_id=" + project.account_id} style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>🔗 Consultations</a>
                                            <a href={"/production?project_id=" + project.project_id + "&account_id=" + project.account_id} style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>📁 Fichiers</a>
                                            <button onClick={() => navigator.clipboard.writeText(project.account_id)} style={{ padding: "9px 18px", background: "none", color: C.muted, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                                                📋 Copier ID
                                            </button>
                                        </div>

                                        {/* Génération facture */}
                                        <AdminInvoiceForm projectId={project.project_id} />

                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}