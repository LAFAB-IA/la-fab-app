"use client"

type Tone = "success" | "warn" | "info" | "neutral" | "danger" | "prod"

const PROJECT_STATUSES: Record<string, { label: string; tone: Tone }> = {
    created:        { label: "En attente de devis", tone: "warn" },
    quoted:         { label: "Devis disponible",    tone: "success" },
    validated:      { label: "Commande validée",    tone: "info" },
    in_production:  { label: "En production",       tone: "prod" },
    delivered:      { label: "Livré",               tone: "success" },
}

const INVOICE_STATUSES: Record<string, { label: string; tone: Tone }> = {
    pending:   { label: "En attente",  tone: "warn" },
    sent:      { label: "Envoyée",     tone: "info" },
    paid:      { label: "Payée",       tone: "success" },
    overdue:   { label: "En retard",   tone: "danger" },
    cancelled: { label: "Annulée",     tone: "neutral" },
}

interface StatusBadgeProps {
    status: string
    type?: "project" | "invoice"
}

export default function StatusBadge({ status, type = "project" }: StatusBadgeProps) {
    const map = type === "invoice" ? INVOICE_STATUSES : PROJECT_STATUSES
    const config = map[status] || { label: status, tone: "neutral" as Tone }
    const t = config.tone

    return (
        <span style={{
            display: "inline-block",
            backgroundColor: `var(--status-${t}-bg)`,
            color: `var(--status-${t}-fg)`,
            border: `1px solid var(--status-${t}-bd)`,
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
        }}>
            {config.label}
        </span>
    )
}
