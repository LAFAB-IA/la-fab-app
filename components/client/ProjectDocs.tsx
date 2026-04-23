"use client"

import { C } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { FileText, Download, Receipt } from "lucide-react"

interface Invoice {
    id: string
    invoice_number?: string
    amount: number
    status: string
    payment_type?: string
    payment_step?: string
    pdf_url?: string
    stripe_url?: string
}

interface ProjectDocsProps {
    briefUrl?: string | null
    quoteUrl?: string | null
    invoices: Invoice[]
    onDownload?: (url: string, filename: string) => void
}

function invoiceLabel(inv: Invoice): string {
    if (inv.payment_type === "deposit" || inv.payment_step === "deposit") return "Facture d'acompte"
    if (inv.payment_type === "balance" || inv.payment_step === "balance") return "Facture de solde"
    return "Facture"
}

export default function ProjectDocs({ briefUrl, quoteUrl, invoices, onDownload }: ProjectDocsProps) {
    const hasDocs = briefUrl || quoteUrl || invoices.length > 0

    if (!hasDocs) {
        return (
            <div style={{
                padding: 20, borderRadius: 12,
                border: "1px solid " + C.border,
                backgroundColor: C.surface,
                textAlign: "center", color: C.muted, fontSize: 13,
            }}>
                Aucun document disponible pour le moment.
            </div>
        )
    }

    const handleClick = (url: string, filename: string) => {
        if (onDownload) {
            onDownload(url, filename)
        } else {
            window.open(url, "_blank")
        }
    }

    return (
        <div style={{
            borderRadius: 12,
            border: "1px solid " + C.border,
            backgroundColor: C.surface,
            overflow: "hidden",
        }}>
            {briefUrl && (
                <DocRow
                    icon={<FileText size={16} />}
                    label="Brief"
                    onClick={() => handleClick(briefUrl, "brief.pdf")}
                />
            )}
            {quoteUrl && (
                <DocRow
                    icon={<FileText size={16} />}
                    label="Devis"
                    onClick={() => handleClick(quoteUrl, "devis.pdf")}
                />
            )}
            {invoices.map((inv) => (
                <DocRow
                    key={inv.id}
                    icon={<Receipt size={16} />}
                    label={invoiceLabel(inv)}
                    sublabel={`${inv.invoice_number || ""} — ${formatPrice(inv.amount)}`}
                    tone={inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : "neutral"}
                    statusLabel={inv.status === "paid" ? "Payée" : inv.status === "overdue" ? "En retard" : inv.status === "sent" ? "Envoyée" : "En attente"}
                    onClick={inv.pdf_url ? () => handleClick(inv.pdf_url!, `facture-${inv.invoice_number || inv.id}.pdf`) : undefined}
                />
            ))}
        </div>
    )
}

interface DocRowProps {
    icon: React.ReactNode
    label: string
    sublabel?: string
    tone?: "success" | "danger" | "neutral"
    statusLabel?: string
    onClick?: () => void
}

function DocRow({ icon, label, sublabel, tone, statusLabel, onClick }: DocRowProps) {
    return (
        <div
            className="row-hover"
            style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px",
                borderBottom: "1px solid " + C.border,
                cursor: onClick ? "pointer" : "default",
            }}
            onClick={onClick}
        >
            <span style={{ color: C.muted, display: "flex", flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.dark }}>{label}</div>
                {sublabel && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{sublabel}</div>}
            </div>
            {statusLabel && tone && (
                <span style={{
                    fontSize: 12, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 20,
                    backgroundColor: `var(--status-${tone}-bg)`,
                    color: `var(--status-${tone}-fg)`,
                    border: `1px solid var(--status-${tone}-bd)`,
                    whiteSpace: "nowrap",
                }}>
                    {statusLabel}
                </span>
            )}
            {onClick && <Download size={14} style={{ color: C.muted, flexShrink: 0 }} />}
        </div>
    )
}
