"use client"

import * as React from "react"
import Link from "next/link"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { formatPrice, formatDate } from "@/lib/format"
import {
    Inbox, Clock, CheckCircle2, TrendingUp, ArrowRight,
    Upload, FileText, Loader2, X
} from "lucide-react"

const { useState, useEffect, useRef, useCallback } = React

const ACCEPTED_EXT = ".pdf,.xlsx,.xls,.csv,.pptx,.docx,.doc,.txt,.rtf,.jpg,.jpeg,.png,.webp"

export default function SupplierDashboard() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [supplier, setSupplier] = useState<any>(null)
    const [consultations, setConsultations] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)

    /* upload state */
    const [uploading, setUploading] = useState(false)
    const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const authHeaders = useCallback(
        (): HeadersInit => ({ Authorization: "Bearer " + token }),
        [token]
    )

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }
        fetch(`${API_URL}/api/supplier-portal/dashboard`, { headers: authHeaders() })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    setSupplier(data.supplier)
                    setConsultations(data.consultations || [])
                    setProducts(data.products || [])
                    setStats(data.stats || {})
                } else {
                    setError(data.error || "Erreur serveur")
                }
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading, authHeaders])

    /* upload handler */
    async function handleUpload(file: File) {
        if (!token) return
        setUploading(true)
        setUploadMsg(null)
        const form = new FormData()
        form.append("file", file)
        try {
            const r = await fetch(`${API_URL}/api/supplier-portal/upload-price-grid`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
                body: form,
            })
            const data = await r.json()
            if (data.ok) {
                setUploadMsg({ type: "ok", text: `${data.products_extracted || 0} produit(s) extraits` })
                // refresh products
                const pr = await fetch(`${API_URL}/api/supplier-portal/products`, { headers: authHeaders() })
                const pd = await pr.json()
                if (pd.ok) setProducts(pd.products || [])
            } else {
                setUploadMsg({ type: "err", text: data.error || "Erreur upload" })
            }
        } catch { setUploadMsg({ type: "err", text: "Erreur reseau" }) }
        setUploading(false)
    }

    function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (f) handleUpload(f)
        e.target.value = ""
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) handleUpload(f)
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif", padding: 40 }}>
            <p style={{ color: "#c0392b" }}>{error}</p>
        </div>
    )

    const total = stats?.total_consultations || 0
    const pending = stats?.pending || 0
    const replied = stats?.replied || 0
    const responseRate = stats?.response_rate ?? (total > 0 ? Math.round((replied / total) * 100) : 0)

    const recentConsultations = [...consultations]
        .sort((a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime())
        .slice(0, 5)

    const kpis = [
        { label: "Consultations recues", value: total, icon: Inbox, color: C.dark, bg: "#f0f0ee" },
        { label: "En attente de reponse", value: pending, icon: Clock, color: "#b89a00", bg: "#fef9e0" },
        { label: "Repondues", value: replied, icon: CheckCircle2, color: "#1a7a3c", bg: "#e8f8ee" },
        { label: "Taux de reponse", value: responseRate + "%", icon: TrendingUp, color: "#1a3c7a", bg: "#e8f0fe" },
    ]

    return (
        <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 4px 0" }}>
                    Espace fournisseur
                </h1>
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                    {supplier?.company_name || "Mon espace"}
                </p>
            </div>

            {/* KPIs */}
            <div className="supplier-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
                {kpis.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <div key={kpi.label} style={{
                            background: C.white, borderRadius: 12, padding: "20px 18px",
                            border: "1px solid " + C.border, boxShadow: "0 1px 3px rgba(58,64,64,0.06)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={18} color={kpi.color} />
                                </div>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: C.dark }}>{kpi.value}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{kpi.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Recent consultations */}
            <div style={{ background: C.white, borderRadius: 12, border: "1px solid " + C.border, padding: "20px 24px", marginBottom: 28, boxShadow: "0 1px 3px rgba(58,64,64,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, margin: 0 }}>Dernieres consultations</h2>
                    <Link href="/supplier/consultations" style={{ fontSize: 13, fontWeight: 600, color: "#b89a00", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Voir tout <ArrowRight size={14} />
                    </Link>
                </div>

                {recentConsultations.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
                        Aucune consultation pour le moment
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {["Projet", "Date", "Statut", ""].map((h) => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: "1px solid " + C.border, textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentConsultations.map((c) => (
                                <tr key={c.consultation_id || c.id}>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 13, fontWeight: 500, color: C.dark }}>
                                        {c.project_id?.slice(0, 12) || "—"}...
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 12, color: C.muted }}>
                                        {formatDate(c.sent_at || c.created_at)}
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                        {renderStatus(c.status)}
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", textAlign: "right" }}>
                                        {(c.status === "sent" || c.status === "pending") && (
                                            <Link href="/supplier/consultations" style={{
                                                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                background: C.yellow, color: C.dark, textDecoration: "none",
                                            }}>
                                                Repondre
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Products section */}
            <div style={{ background: C.white, borderRadius: 12, border: "1px solid " + C.border, padding: "20px 24px", boxShadow: "0 1px 3px rgba(58,64,64,0.06)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, margin: "0 0 16px 0" }}>Mes produits</h2>

                {products.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                        <thead>
                            <tr>
                                {["Produit", "Categorie", "Prix", "Source"].map((h) => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: "1px solid " + C.border, textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, i) => (
                                <tr key={p.id || i}>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 13, fontWeight: 500, color: C.dark }}>
                                        {p.product_name || p.name || "—"}
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 13, color: C.muted }}>
                                        {p.category || "—"}
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee", fontSize: 13, fontWeight: 600, color: C.dark }}>
                                        {p.unit_price ? formatPrice(Number(p.unit_price)) : "—"}
                                    </td>
                                    <td style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0ee" }}>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                            background: p.source === "ai" ? "#fef9e0" : "#f0f0ee",
                                            color: p.source === "ai" ? "#b89a00" : "#616161",
                                        }}>
                                            {p.source === "ai" ? "IA" : "Manuel"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {products.length === 0 && (
                    <div style={{ padding: 16, textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 16 }}>
                        Aucun produit enregistre
                    </div>
                )}

                {/* Upload zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: "2px dashed " + (dragOver ? C.yellow : C.border),
                        borderRadius: 10, padding: "28px 20px", textAlign: "center",
                        cursor: uploading ? "not-allowed" : "pointer",
                        background: dragOver ? "#fefce8" : "#fafafa",
                        transition: "border-color 0.2s, background 0.2s",
                        opacity: uploading ? 0.6 : 1,
                    }}
                >
                    <input ref={fileRef} type="file" accept={ACCEPTED_EXT} onChange={onFilePick} style={{ display: "none" }} />
                    {uploading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted }}>
                            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                            <span style={{ fontSize: 14 }}>Analyse en cours...</span>
                        </div>
                    ) : (
                        <>
                            <Upload size={24} color={C.muted} style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 4 }}>
                                Uploader une nouvelle grille tarifaire
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                                PDF, Excel, Word, images — 20 Mo max
                            </div>
                        </>
                    )}
                </div>

                {uploadMsg && (
                    <div style={{
                        marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                        background: uploadMsg.type === "ok" ? "#f0fdf4" : "#fef2f2",
                        color: uploadMsg.type === "ok" ? "#166534" : "#991b1b",
                        border: "1px solid " + (uploadMsg.type === "ok" ? "#bbf7d0" : "#fecaca"),
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        {uploadMsg.text}
                        <button onClick={() => setUploadMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 }}>
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
                @media (max-width: 768px) {
                    .supplier-kpis { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    )
}

function renderStatus(status: string) {
    const cfg: Record<string, { label: string; bg: string; color: string }> = {
        sent: { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
        pending: { label: "En attente", bg: "#fef9e0", color: "#b89a00" },
        replied: { label: "Repondue", bg: "#e8f8ee", color: "#1a7a3c" },
        responded: { label: "Repondue", bg: "#e8f8ee", color: "#1a7a3c" },
        validated: { label: "Validee", bg: "#e8f0fe", color: "#1a3c7a" },
        created: { label: "Creee", bg: "#f5f5f5", color: "#616161" },
    }
    const c = cfg[status] || { label: status, bg: "#f5f5f5", color: "#616161" }
    return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{c.label}</span>
}
