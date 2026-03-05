"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import AuthGuard from "@/components/AuthGuard"
import { FileText, Download, ChevronDown, Search } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format"
import StatusBadge from "@/components/shared/StatusBadge"

const STATUS_LABELS: Record<string, string> = {
    draft: "Brouillon",
    pending: "À payer",
    sent: "Envoyée",
    paid: "Payée",
    overdue: "En retard",
    cancelled: "Annulée",
}

function AdminInvoices() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        fetch(`${API_URL}/api/invoice/list`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices || [])
                else setError("Impossible de charger les factures")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    const filtered = invoices.filter((inv) => {
        const matchStatus = filterStatus === "all" || inv.status === filterStatus
        const matchSearch =
            search === "" ||
            (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.client_email || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.project_id || "").toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    const totalTTC = filtered.reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0)
    const paidCount = invoices.filter((i) => i.status === "paid").length
    const overdueCount = invoices.filter((i) => i.status === "overdue").length

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement des factures...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>{error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 960, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{invoices.length} facture{invoices.length > 1 ? "s" : ""} au total</p>
                    </div>
                    <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Dashboard</a>
                </div>

                {/* KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
                    {[
                        { label: "Total TTC", value: formatPrice(totalTTC), color: C.dark },
                        { label: "Factures", value: invoices.length, color: C.dark },
                        { label: "Payées", value: paidCount, color: "#1a7a3c" },
                        { label: "En retard", value: overdueCount, color: "#c0392b" },
                    ].map((s) => (
                        <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: "12px 10px", textAlign: "center", border: "1px solid " + C.border }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher par n° facture, client, projet..."
                            style={{ width: "100%", padding: "12px 16px 12px 40px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 14, backgroundColor: C.white, color: C.dark, boxSizing: "border-box", outline: "none" }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: "10px 14px", paddingRight: 32, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none", appearance: "none" as const, cursor: "pointer" }}
                        >
                            <option value="all">Tous les statuts</option>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                    </div>
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    {filtered.length} facture{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
                </div>

                {/* Invoice list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map((invoice) => (
                        <div key={invoice.id} style={{ backgroundColor: C.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(58,64,64,0.08)", border: "1px solid " + C.border }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                                        {invoice.invoice_number}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted }}>
                                        {invoice.client_name || invoice.client_email || "—"} · {invoice.project_id}
                                    </div>
                                </div>
                                <StatusBadge status={invoice.status} type="invoice" />
                            </div>

                            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
                                <div>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Montant TTC</div>
                                    <div style={{ fontSize: 18, color: C.dark, fontWeight: 700 }}>{formatPrice(Number(invoice.total))}</div>
                                </div>
                                {invoice.due_at && (
                                    <div>
                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Echeance</div>
                                        <div style={{ fontSize: 13, color: invoice.status === "overdue" ? "#c0392b" : C.dark, fontWeight: 500 }}>
                                            {formatDate(invoice.due_at)}
                                        </div>
                                    </div>
                                )}
                                {invoice.issued_at && (
                                    <div>
                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Emise le</div>
                                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>
                                            {formatDate(invoice.issued_at)}
                                        </div>
                                    </div>
                                )}
                                {invoice.payment_type === "split" && (
                                    <div>
                                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Paiement</div>
                                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>
                                            Scinde — {invoice.payment_step === "fully_paid" ? "Solde" : invoice.payment_step === "deposit_paid" ? "Acompte paye" : "En attente"}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <a href={`/facture/${invoice.id}`} style={{ padding: "9px 18px", backgroundColor: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <FileText size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />Voir la facture
                                </a>
                                {invoice.pdf_url && (
                                    <a href={invoice.pdf_url} target="_blank" style={{ padding: "9px 18px", backgroundColor: C.dark, color: C.white, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <Download size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />Telecharger PDF
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            Aucune facture trouvee
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminInvoices />
        </AuthGuard>
    )
}
