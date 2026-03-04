"use client"

const PROJECT_STATUSES: Record<string, { label: string; bg: string; color: string; border: string }> = {
    created:        { label: "En attente de devis", bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:         { label: "Devis disponible",    bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    validated:      { label: "Commande validée",    bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    in_production:  { label: "En production",       bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:      { label: "Livré",               bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
}

const INVOICE_STATUSES: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending:   { label: "En attente",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    sent:      { label: "Envoyée",     bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    paid:      { label: "Payée",       bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    overdue:   { label: "En retard",   bg: "#fde8e8", color: "#c0392b", border: "#f5c6c6" },
    cancelled: { label: "Annulée",     bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" },
}

interface StatusBadgeProps {
    status: string
    type?: "project" | "invoice"
}

export default function StatusBadge({ status, type = "project" }: StatusBadgeProps) {
    const map = type === "invoice" ? INVOICE_STATUSES : PROJECT_STATUSES
    const config = map[status] || { label: status, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }

    return (
        <span style={{
            display: "inline-block",
            backgroundColor: config.bg,
            color: config.color,
            border: "1px solid " + config.border,
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
