"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { FileText, Clock, CreditCard, CheckCircle2, ExternalLink, SearchX } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format"
import Drawer from "@/components/shared/Drawer"
import InvoiceDetail from "@/components/InvoiceDetail"
import useListView from "@/hooks/useListView"
import ListToolbar from "@/components/ListToolbar"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    draft:   { label: "Brouillon",      bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
    pending: { label: "À payer",        bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    paid:    { label: "Payée",          bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    overdue: { label: "En retard",      bg: "#fee",    color: "#c0392b", border: "#f5c6c6" },
}

const STATUS_ORDER = ["draft", "pending", "overdue", "paid"]

function StatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
            {sc.label}
        </span>
    )
}

function SplitBadge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: color === "green" ? "#e8f8ee" : "#fef9e0", color: color === "green" ? "#1a7a3c" : "#b89a00", border: "1px solid " + (color === "green" ? "#a8dbb8" : "#f4cf1588"), whiteSpace: "nowrap" }}>
            {label}
        </span>
    )
}

function InvoiceGridCard({ invoice, onClick }: { invoice: any; onClick: () => void }) {
    const sc = STATUS_CONFIG[invoice.status] || { label: invoice.status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }

    return (
        <div
            onClick={onClick}
            className="row-hover"
            style={{
                backgroundColor: C.white, borderRadius: 12, padding: "16px 18px",
                boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border,
                cursor: "pointer", transition: "box-shadow 0.15s", position: "relative",
            }}
        >
            <span style={{
                position: "absolute", top: 12, right: 12,
                padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border,
            }}>
                {sc.label}
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4, paddingRight: 80 }}>
                {invoice.invoice_number}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{invoice.project_id}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 6 }}>
                {formatPrice(Number(invoice.total))}
            </div>
            {invoice.due_at && (
                <div style={{ fontSize: 12, color: invoice.status === "overdue" ? "#c0392b" : C.muted }}>
                    Échéance : {formatDate(invoice.due_at)}
                </div>
            )}
        </div>
    )
}

export default function InvoiceList() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [payingId, setPayingId] = useState<string | null>(null)
    const [payError, setPayError] = useState("")
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const lv = useListView(invoices, {
        storageKey: "invoices_view_mode",
        defaultViewMode: "list",
        searchFields: (inv) => [inv.invoice_number, inv.project_id],
        statusOptions: STATUS_ORDER.map((s, i) => ({ value: s, label: STATUS_CONFIG[s]?.label || s, order: i })),
        getItemStatus: (inv) => inv.status || "draft",
        getItemDate: (inv) => inv.due_at || inv.created_at,
        getItemPrice: (inv) => inv.total != null ? Number(inv.total) : null,
        sortOptions: [
            { key: "date", label: "Date" },
            { key: "amount", label: "Montant" },
            { key: "status", label: "Statut" },
        ],
        getSortValue: (inv, key) => {
            switch (key) {
                case "date": return new Date(inv.due_at || inv.created_at).getTime()
                case "amount": return Number(inv.total) || 0
                case "status": return STATUS_ORDER.indexOf(inv.status) === -1 ? 99 : STATUS_ORDER.indexOf(inv.status)
                default: return 0
            }
        },
        defaultSortKey: "date",
        defaultSortDir: "desc",
    })

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifié"); setLoading(false); return }

        fetchWithAuth(`${API_URL}/api/invoice/list`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setInvoices(data.invoices)
                else setError("Impossible de charger vos factures")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    function handlePay(invoiceId: string, step: string) {
        if (!token) return
        setPayingId(invoiceId)
        setPayError("")

        fetchWithAuth(`${API_URL}/api/stripe/create-checkout/${invoiceId}?step=${step}`, {
            method: "POST",
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok && data.checkout_url) {
                    window.location.href = data.checkout_url
                } else {
                    setPayError("Impossible de créer la session de paiement")
                    setPayingId(null)
                }
            })
            .catch(() => { setPayError("Erreur réseau"); setPayingId(null) })
    }

    function openInvoice(id: string) {
        setSelectedInvoiceId(id)
        setDrawerOpen(true)
    }

    function closeDrawer() {
        setDrawerOpen(false)
        setSelectedInvoiceId(null)
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement de vos factures...</p>
        </div>
    )

    if (error) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}>{error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <a href="/projets" style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>← Mes projets</a>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: "12px 0 4px" }}>Mes factures</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{invoices.length} facture{invoices.length > 1 ? "s" : ""}</p>
                </div>

                {/* Toolbar */}
                <ListToolbar
                    search={lv.search}
                    onSearchChange={lv.setSearch}
                    placeholder="Rechercher une facture..."
                    viewModes={["list", "grid"]}
                    viewMode={lv.viewMode}
                    onViewModeChange={lv.setViewMode}
                    filters={lv.filters}
                    onFiltersChange={lv.setFilters}
                    onFiltersReset={lv.resetFilters}
                    activeFilterCount={lv.activeFilterCount}
                    statusOptions={STATUS_ORDER.map((s, i) => ({ value: s, label: STATUS_CONFIG[s]?.label || s, order: i }))}
                    showDateFilter
                    showPriceFilter
                    sortOptions={[
                        { key: "date", label: "Date" },
                        { key: "amount", label: "Montant" },
                        { key: "status", label: "Statut" },
                    ]}
                    sortKey={lv.sortKey}
                    sortDir={lv.sortDir}
                    onSortKeyChange={lv.setSortKey}
                    onSortDirToggle={() => lv.setSortDir(lv.sortDir === "asc" ? "desc" : "asc")}
                />

                {payError && (
                    <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: "#fee", border: "1px solid #f5c6c6", borderRadius: 10, fontSize: 13, color: "#c0392b" }}>
                        {payError}
                    </div>
                )}

                {/* Liste vide */}
                {invoices.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 16, border: "1px solid " + C.border }}>
                        <div style={{ marginBottom: 16 }}><FileText size={40} style={{ color: C.muted, opacity: 0.4 }} /></div>
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Aucune facture pour l'instant</div>
                        <div style={{ fontSize: 14, color: C.muted }}>Vos factures apparaîtront ici une fois générées.</div>
                    </div>
                )}

                {/* No search results */}
                {invoices.length > 0 && lv.filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                        <SearchX size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Aucune facture ne correspond a votre recherche</div>
                    </div>
                )}

                {/* Grid view */}
                {lv.viewMode === "grid" && lv.filtered.length > 0 && (
                    <div className="list-grid-3col">
                        {lv.filtered.map((invoice: any) => (
                            <InvoiceGridCard key={invoice.id} invoice={invoice} onClick={() => openInvoice(invoice.id)} />
                        ))}
                    </div>
                )}

                {/* List view - Cartes factures */}
                {lv.viewMode === "list" && lv.filtered.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {lv.filtered.map((invoice: any) => {
                            const isPaying = payingId === invoice.id
                            const isSplit = invoice.payment_type === "split"
                            const step = invoice.payment_step

                            return (
                                <div
                                    key={invoice.id}
                                    style={{ backgroundColor: C.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border }}
                                >
                                    {/* Ligne principale */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                                                {invoice.invoice_number}
                                            </div>
                                            <div style={{ fontSize: 12, color: C.muted }}>{invoice.project_id}</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                            <StatusBadge status={invoice.status} />
                                            {isSplit && step === "deposit_paid" && <SplitBadge label="Acompte payé" color="green" />}
                                            {isSplit && step === "fully_paid" && <SplitBadge label="Payé intégralement" color="green" />}
                                        </div>
                                    </div>

                                    {/* Infos */}
                                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Montant TTC</div>
                                            <div style={{ fontSize: 18, color: C.dark, fontWeight: 700 }}>{formatPrice(Number(invoice.total))}</div>
                                        </div>
                                        {invoice.due_at && (
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Échéance</div>
                                                <div style={{ fontSize: 13, color: invoice.status === "overdue" ? "#c0392b" : C.dark, fontWeight: 500 }}>
                                                    {formatDate(invoice.due_at)}
                                                </div>
                                            </div>
                                        )}
                                        {invoice.paid_at && (
                                            <div>
                                                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Payée le</div>
                                                <div style={{ fontSize: 13, color: "#1a7a3c", fontWeight: 500 }}>
                                                    {formatDate(invoice.paid_at)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Split payment info */}
                                    {isSplit && (
                                        <div style={{ padding: "12px 16px", backgroundColor: C.bg, borderRadius: 10, border: "1px solid " + C.border, marginBottom: 16, fontSize: 13, color: C.dark }}>
                                            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Paiement en 2 fois</div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span>Acompte 30% : <strong>{formatPrice(Number(invoice.deposit_amount))}</strong></span>
                                                <span style={{ color: step === "deposit_paid" || step === "fully_paid" ? "#1a7a3c" : C.muted, fontWeight: 600 }}>
                                                    {step === "deposit_paid" || step === "fully_paid" ? "Paye" : "En attente"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Solde 70% : <strong>{formatPrice(Number(invoice.balance_amount))}</strong></span>
                                                <span style={{ color: step === "fully_paid" ? "#1a7a3c" : C.muted, fontWeight: 600 }}>
                                                    {step === "fully_paid" ? "Paye" : "En attente"}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        <button
                                            onClick={() => openInvoice(invoice.id)}
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", backgroundColor: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                                        >
                                            <FileText size={14} />Voir la facture
                                        </button>

                                        {/* Split: deposit pending */}
                                        {isSplit && step === "pending" && (
                                            <button
                                                onClick={() => handlePay(invoice.id, "deposit")}
                                                disabled={isPaying}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 24px", backgroundColor: isPaying ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isPaying ? "not-allowed" : "pointer" }}
                                            >
                                                {isPaying
                                                    ? <><Clock size={14} />Redirection...</>
                                                    : <><CreditCard size={14} />Payer l&apos;acompte ({formatPrice(Number(invoice.deposit_amount))})</>}
                                            </button>
                                        )}

                                        {/* Split: balance pending */}
                                        {isSplit && step === "deposit_paid" && (
                                            <button
                                                onClick={() => handlePay(invoice.id, "balance")}
                                                disabled={isPaying}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 24px", backgroundColor: isPaying ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isPaying ? "not-allowed" : "pointer" }}
                                            >
                                                {isPaying
                                                    ? <><Clock size={14} />Redirection...</>
                                                    : <><CreditCard size={14} />Payer le solde ({formatPrice(Number(invoice.balance_amount))})</>}
                                            </button>
                                        )}

                                        {/* Full payment */}
                                        {!isSplit && invoice.status !== "paid" && (invoice.status === "pending" || invoice.status === "overdue") && (
                                            <button
                                                onClick={() => handlePay(invoice.id, "full")}
                                                disabled={isPaying}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 24px", backgroundColor: isPaying ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isPaying ? "not-allowed" : "pointer" }}
                                            >
                                                {isPaying
                                                    ? <><Clock size={14} />Redirection...</>
                                                    : <><CreditCard size={14} />Payer ({formatPrice(Number(invoice.total))})</>}
                                            </button>
                                        )}

                                        {/* Paid badge */}
                                        {invoice.status === "paid" && (
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", backgroundColor: "#e8f8ee", color: "#1a7a3c", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                                                <CheckCircle2 size={14} />Paiement reçu
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

            </div>

            {/* Drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={closeDrawer}
                title="Détail de la facture"
            >
                {selectedInvoiceId && (
                    <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                            <a
                                href={`/facture/${selectedInvoiceId}`}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                    border: "1px solid " + C.border, background: C.white, color: C.dark,
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink size={13} /> Ouvrir en pleine page
                            </a>
                        </div>
                        <InvoiceDetail invoiceId={selectedInvoiceId} onClose={closeDrawer} />
                    </>
                )}
            </Drawer>
        </div>
    )
}
