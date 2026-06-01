"use client"
import { useState, useRef } from "react"
import { Search, X, Filter } from "lucide-react"
import { C } from "@/lib/constants"

export interface ProjectSearchFilters {
    q: string
    status: string
    priority: string
    tag: string
}

const EMPTY: ProjectSearchFilters = { q: "", status: "", priority: "", tag: "" }

const STATUS_OPTIONS = [
    { value: "created",     label: "Créé" },
    { value: "pending",     label: "En attente" },
    { value: "in_progress", label: "En cours" },
    { value: "delivered",   label: "Livré" },
    { value: "completed",   label: "Terminé" },
]

const PRIORITY_OPTIONS = [
    { value: "low",    label: "Faible" },
    { value: "normal", label: "Normale" },
    { value: "high",   label: "Haute" },
    { value: "urgent", label: "Urgente" },
]

interface ProjectSearchBarProps {
    onSearch: (filters: ProjectSearchFilters) => void
    loading?: boolean
}

const inputBase: React.CSSProperties = {
    padding: "9px 14px",
    border: "1px solid " + C.border,
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: C.white,
    color: C.dark,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
}

const selectBase: React.CSSProperties = {
    ...inputBase,
    paddingRight: 32,
    appearance: "none" as const,
    cursor: "pointer",
}

export function ProjectSearchBar({ onSearch, loading = false }: ProjectSearchBarProps) {
    const [filters, setFilters] = useState<ProjectSearchFilters>(EMPTY)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function update(key: keyof ProjectSearchFilters, value: string) {
        const next = { ...filters, [key]: value }
        setFilters(next)
        if (key === "q" || key === "tag") {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => onSearch(next), 300)
        } else {
            onSearch(next)
        }
    }

    function reset() {
        setFilters(EMPTY)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        onSearch(EMPTY)
    }

    const hasFilters = Object.values(filters).some(v => v !== "")

    return (
        <div style={{
            backgroundColor: C.white,
            border: "1px solid " + C.border,
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(58,64,64,0.06)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Filter size={14} color={C.muted} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Recherche avancée
                </span>
                {loading && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: C.muted }}>Recherche...</span>
                )}
                {hasFilters && (
                    <button
                        onClick={reset}
                        style={{
                            marginLeft: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: "1px solid " + C.border,
                            backgroundColor: C.bg,
                            color: C.dark,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        <X size={12} />
                        Réinitialiser
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }} className="psb-grid">
                {/* q — recherche libre */}
                <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
                    <input
                        type="text"
                        value={filters.q}
                        onChange={e => update("q", e.target.value)}
                        placeholder="ID projet, client, produit..."
                        style={{ ...inputBase, paddingLeft: 36 }}
                    />
                </div>

                {/* status */}
                <div style={{ position: "relative" }}>
                    <select value={filters.status} onChange={e => update("status", e.target.value)} style={selectBase}>
                        <option value="">Tous les statuts</option>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.muted }}>▼</span>
                </div>

                {/* priority */}
                <div style={{ position: "relative" }}>
                    <select value={filters.priority} onChange={e => update("priority", e.target.value)} style={selectBase}>
                        <option value="">Toutes priorités</option>
                        {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.muted }}>▼</span>
                </div>

                {/* tag */}
                <input
                    type="text"
                    value={filters.tag}
                    onChange={e => update("tag", e.target.value)}
                    placeholder="Tag..."
                    style={inputBase}
                />
            </div>

            <style>{`@media (max-width: 768px) { .psb-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
        </div>
    )
}
