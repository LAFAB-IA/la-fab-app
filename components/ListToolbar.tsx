"use client"

import React, { useState } from "react"
import { C } from "@/lib/constants"
import { Search, X, List, LayoutGrid, Layers, SlidersHorizontal, ChevronDown, ArrowUpDown } from "lucide-react"
import type { ViewMode, AdvancedFilters, StatusOption, TypeOption, SortOption } from "@/hooks/useListView"

interface ListToolbarProps {
    search: string
    onSearchChange: (s: string) => void
    placeholder?: string
    viewModes: ViewMode[]
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    filters: AdvancedFilters
    onFiltersChange: (f: AdvancedFilters) => void
    onFiltersReset: () => void
    activeFilterCount: number
    statusOptions?: StatusOption[]
    typeOptions?: TypeOption[]
    showDateFilter?: boolean
    showPriceFilter?: boolean
    sortOptions?: SortOption[]
    sortKey?: string
    sortDir?: "asc" | "desc"
    onSortKeyChange?: (key: string) => void
    onSortDirToggle?: () => void
}

const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
    list: <List size={16} />,
    grid: <LayoutGrid size={16} />,
    group: <Layers size={16} />,
}

export default function ListToolbar(props: ListToolbarProps) {
    const {
        search, onSearchChange, placeholder = "Rechercher...",
        viewModes, viewMode, onViewModeChange,
        filters, onFiltersChange, onFiltersReset, activeFilterCount,
        statusOptions, typeOptions, showDateFilter, showPriceFilter,
        sortOptions, sortKey, sortDir, onSortKeyChange, onSortDirToggle,
    } = props

    const [panelOpen, setPanelOpen] = useState(false)
    const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters)

    const hasAnyFilter = !!(statusOptions || typeOptions || showDateFilter || showPriceFilter)

    function openPanel() {
        setLocalFilters(filters)
        setPanelOpen(true)
    }

    function applyFilters() {
        onFiltersChange(localFilters)
        setPanelOpen(false)
    }

    function handleReset() {
        onFiltersReset()
        setLocalFilters({ statuses: [], types: [], dateFrom: "", dateTo: "", priceMin: "", priceMax: "" })
        setPanelOpen(false)
    }

    function toggleStatus(value: string) {
        setLocalFilters(prev => ({
            ...prev,
            statuses: prev.statuses.includes(value)
                ? prev.statuses.filter(s => s !== value)
                : [...prev.statuses, value],
        }))
    }

    function toggleType(value: string) {
        setLocalFilters(prev => ({
            ...prev,
            types: prev.types.includes(value)
                ? prev.types.filter(t => t !== value)
                : [...prev.types, value],
        }))
    }

    const inputStyle: React.CSSProperties = {
        padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 6,
        fontSize: 13, color: C.dark, backgroundColor: C.white, outline: "none",
        fontFamily: "inherit", boxSizing: "border-box",
    }

    return (
        <div style={{ marginBottom: 20 }}>
            {/* Main row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ flex: 1, position: "relative", minWidth: 180 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: C.muted }} />
                    <input
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        style={{
                            width: "100%", padding: "10px 36px", borderRadius: 8,
                            border: "1px solid " + C.border, fontSize: 14, color: C.dark,
                            backgroundColor: C.white, outline: "none", fontFamily: "inherit",
                            boxSizing: "border-box",
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => onSearchChange("")}
                            style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* View toggle */}
                {viewModes.length > 1 && (
                    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 8, border: "1px solid " + C.border, background: C.white }}>
                        {viewModes.map(mode => (
                            <button
                                key={mode}
                                onClick={() => onViewModeChange(mode)}
                                style={{
                                    padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                    background: viewMode === mode ? C.yellow : "transparent",
                                    color: viewMode === mode ? C.dark : C.muted,
                                    display: "flex", alignItems: "center",
                                }}
                            >
                                {VIEW_ICONS[mode]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sort dropdown */}
                {sortOptions && sortOptions.length > 0 && onSortKeyChange && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <div style={{ position: "relative" }}>
                            <select
                                value={sortKey || ""}
                                onChange={e => onSortKeyChange(e.target.value)}
                                style={{
                                    padding: "8px 30px 8px 12px", border: "1px solid " + C.border, borderRadius: 8,
                                    fontSize: 13, backgroundColor: C.white, color: C.dark, outline: "none",
                                    appearance: "none" as const, cursor: "pointer", fontFamily: "inherit",
                                }}
                            >
                                {sortOptions.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }} />
                        </div>
                        {onSortDirToggle && (
                            <button
                                onClick={onSortDirToggle}
                                style={{
                                    padding: "7px 8px", border: "1px solid " + C.border, borderRadius: 8,
                                    background: C.white, cursor: "pointer", color: C.dark, display: "flex", alignItems: "center",
                                }}
                                title={sortDir === "asc" ? "Croissant" : "Décroissant"}
                            >
                                <ArrowUpDown size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Filter button */}
                {hasAnyFilter && (
                    <button
                        onClick={() => panelOpen ? setPanelOpen(false) : openPanel()}
                        style={{
                            padding: "8px 14px", borderRadius: 8, border: "1px solid " + C.border,
                            background: panelOpen ? C.yellow : C.white,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                            fontSize: 13, fontWeight: 600, color: C.dark, position: "relative",
                        }}
                    >
                        <SlidersHorizontal size={15} />
                        Filtres
                        {activeFilterCount > 0 && (
                            <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 18, height: 18, borderRadius: "50%",
                                background: C.dark, color: "#fff", fontSize: 10, fontWeight: 700,
                            }}>
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Filter panel */}
            {panelOpen && (
                <div style={{
                    marginTop: 12, padding: "18px 20px", borderRadius: 12,
                    border: "1px solid " + C.border, background: C.white,
                    boxShadow: "0 2px 8px rgba(58,64,64,0.08)",
                }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
                        {/* Status checkboxes */}
                        {statusOptions && statusOptions.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Statut</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {statusOptions.map(opt => (
                                        <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dark, cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={localFilters.statuses.includes(opt.value)}
                                                onChange={() => toggleStatus(opt.value)}
                                                style={{ accentColor: C.yellow }}
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Type checkboxes */}
                        {typeOptions && typeOptions.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Type</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {typeOptions.map(opt => (
                                        <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dark, cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={localFilters.types.includes(opt.value)}
                                                onChange={() => toggleType(opt.value)}
                                                style={{ accentColor: C.yellow }}
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Date filter */}
                        {showDateFilter && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Date</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 12, color: C.muted }}>Du</label>
                                    <input type="date" value={localFilters.dateFrom} onChange={e => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))} style={inputStyle} />
                                    <label style={{ fontSize: 12, color: C.muted }}>Au</label>
                                    <input type="date" value={localFilters.dateTo} onChange={e => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>
                        )}

                        {/* Price filter */}
                        {showPriceFilter && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Prix</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 12, color: C.muted }}>Min</label>
                                    <input type="number" value={localFilters.priceMin} onChange={e => setLocalFilters(prev => ({ ...prev, priceMin: e.target.value }))} placeholder="0" min={0} style={inputStyle} />
                                    <label style={{ fontSize: 12, color: C.muted }}>Max</label>
                                    <input type="number" value={localFilters.priceMax} onChange={e => setLocalFilters(prev => ({ ...prev, priceMax: e.target.value }))} placeholder="0" min={0} style={inputStyle} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions row */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                        <button
                            onClick={handleReset}
                            style={{ padding: "8px 16px", border: "1px solid " + C.border, borderRadius: 8, background: C.white, color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                            Réinitialiser
                        </button>
                        <button
                            onClick={applyFilters}
                            style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: C.yellow, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                        >
                            Appliquer
                        </button>
                    </div>
                </div>
            )}

            {/* Responsive grid style */}
            <style>{`
                .list-grid-3col {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                @media (max-width: 900px) {
                    .list-grid-3col { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 600px) {
                    .list-grid-3col { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}
