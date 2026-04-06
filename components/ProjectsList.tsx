"use client"

import React, { useEffect, useMemo, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { ClipboardList, ExternalLink, SearchX, ChevronDown } from "lucide-react"
import { formatPrice, formatDate, projectDisplayName } from "@/lib/format"
import Drawer from "@/components/shared/Drawer"
import ProjectDetail from "@/components/ProjectDetail"
import useListView from "@/hooks/useListView"
import ListToolbar from "@/components/ListToolbar"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    created:       { label: "En attente de devis",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
    quoted:        { label: "Devis envoyé",          bg: "#e8f0fe", color: "#1a3c7a", border: "#a8b8db" },
    validated:     { label: "Commande validée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    ordered:       { label: "Commande validée",      bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    in_production: { label: "En production",         bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
    delivered:     { label: "Livré",                 bg: "#e0f2f1", color: "#004d40", border: "#80cbc4" },
    archived:      { label: "Archivé",               bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
}

const STATUS_ORDER = ["created", "quoted", "validated", "ordered", "in_production", "delivered", "archived"]

const KPI_SLOTS: { label: string; statuses: string[]; borderColor: string }[] = [
    { label: "En attente de devis", statuses: ["created"],                  borderColor: "#F4CF15" },
    { label: "Devis envoyé",        statuses: ["quoted"],                   borderColor: "#7a8080" },
    { label: "Commande validée",    statuses: ["validated", "ordered"],     borderColor: "#000000" },
    { label: "En production",       statuses: ["in_production"],            borderColor: "#F4CF15" },
    { label: "Livré",               statuses: ["delivered"],                borderColor: "#7a8080" },
    { label: "Archivé",             statuses: ["archived"],                 borderColor: "#e0e0de" },
]

function StatusKPIRow({ projects }: { projects: any[] }) {
    const counts = useMemo(() => {
        const map: Record<string, number> = {}
        for (const p of projects) {
            map[p.status] = (map[p.status] || 0) + 1
        }
        return map
    }, [projects])

    return (
        <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            marginBottom: 20, scrollbarWidth: "none",
        }}>
            {KPI_SLOTS.map((slot) => {
                const count = slot.statuses.reduce((acc, s) => acc + (counts[s] || 0), 0)
                return (
                    <div
                        key={slot.label}
                        style={{
                            flex: "0 0 auto", minWidth: 130,
                            backgroundColor: "#FAFFFD",
                            border: "1px solid #e0e0de",
                            borderLeft: `4px solid ${slot.borderColor}`,
                            borderRadius: 10,
                            padding: "14px 18px",
                        }}
                    >
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#000", lineHeight: 1 }}>
                            {count}
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8080", marginTop: 5, fontWeight: 500, lineHeight: 1.3 }}>
                            {slot.label}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
            {sc.label}
        </span>
    )
}

function ProjectCard({ project, onClick, role }: { project: any; onClick: () => void; role?: string }) {
    const sc = STATUS_CONFIG[project.status] || { color: C.muted }
    const hasPrice = project.pricing?.total_net != null

    return (
        <div
            key={project.project_id}
            onClick={onClick}
            className="row-hover"
            style={{ display: "block", backgroundColor: C.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border, cursor: "pointer", transition: "box-shadow 0.15s" }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                        {projectDisplayName(project, role)}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{project.project_id}</div>
                    {role === "admin" && project.supplier_name && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, backgroundColor: C.bg, border: "1px solid " + C.border, fontSize: 10, fontWeight: 600 }}>
                                Fournisseur : {project.supplier_name}
                            </span>
                        </div>
                    )}
                </div>
                <StatusBadge status={project.status} />
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {project.quantity && (
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Quantite</div>
                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{project.quantity} ex.</div>
                    </div>
                )}
                {hasPrice && (
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Total HT</div>
                        <div style={{ fontSize: 13, color: C.dark, fontWeight: 700 }}>{formatPrice(project.pricing.total_net)}</div>
                    </div>
                )}
                <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Date</div>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>
                        {formatDate(project.created_at)}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: sc.color, fontWeight: 600 }}>
                Voir le projet →
            </div>
        </div>
    )
}

function ProjectGridCard({ project, onClick, role }: { project: any; onClick: () => void; role?: string }) {
    const sc = STATUS_CONFIG[project.status] || { label: project.status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    const hasPrice = project.pricing?.total_net != null

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
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4, paddingRight: 90 }}>
                {projectDisplayName(project, role)}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: role === "admin" && project.supplier_name ? 4 : 10 }}>{project.project_id}</div>
            {role === "admin" && project.supplier_name && (
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
                    <span style={{ padding: "2px 6px", borderRadius: 4, backgroundColor: C.bg, border: "1px solid " + C.border, fontWeight: 600 }}>
                        Fournisseur : {project.supplier_name}
                    </span>
                </div>
            )}
            <div style={{ fontSize: 12, color: C.muted }}>{formatDate(project.created_at)}</div>
            {hasPrice && (
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginTop: 6 }}>{formatPrice(project.pricing.total_net)}</div>
            )}
        </div>
    )
}

export default function ProjectsList() {
    const { token, isAuthenticated, isLoading: authLoading, user } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const lv = useListView(projects, {
        storageKey: "projects_view_mode",
        defaultViewMode: "list",
        searchFields: (p) => [p.product?.label, p.brief_analysis?.product_type, p.brief_analysis?.description, p.project_id, p.client_name, p.account_name],
        statusOptions: STATUS_ORDER.map((s, i) => ({ value: s, label: STATUS_CONFIG[s]?.label || s, order: i })),
        getItemStatus: (p) => p.status || "unknown",
        getItemDate: (p) => p.created_at,
        getItemPrice: (p) => p.pricing?.total_net != null ? Number(p.pricing.total_net) : null,
        sortOptions: [
            { key: "date", label: "Date" },
            { key: "name", label: "Nom" },
            { key: "price", label: "Prix" },
            { key: "status", label: "Statut" },
        ],
        getSortValue: (p, key) => {
            switch (key) {
                case "date": return new Date(p.created_at).getTime()
                case "name": return projectDisplayName(p, user?.role)
                case "price": return Number(p.pricing?.total_net) || 0
                case "status": return STATUS_ORDER.indexOf(p.status) === -1 ? 99 : STATUS_ORDER.indexOf(p.status)
                default: return 0
            }
        },
        defaultSortKey: "date",
        defaultSortDir: "desc",
    })

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated || !token) { setError("Non authentifie"); setLoading(false); return }

        fetchWithAuth(`${API_URL}/api/project`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setProjects(data.projects)
                else setError("Impossible de charger vos projets")
                setLoading(false)
            })
            .catch(() => { setError("Erreur reseau"); setLoading(false) })
    }, [token, isAuthenticated, authLoading])

    function openProject(id: string) {
        setSelectedProjectId(id)
        setDrawerOpen(true)
    }

    function closeDrawer() {
        setDrawerOpen(false)
        setSelectedProjectId(null)
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement de vos projets...</p>
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
                <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Mes projets</h1>
                        <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>{projects.length} projet{projects.length > 1 ? "s" : ""}</p>
                    </div>
                    <a
                        href="/projet/nouveau"
                        className="btn-primary"
                        style={{ padding: "10px 20px", backgroundColor: C.yellow, color: C.dark, borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                        + Nouveau projet
                    </a>
                </div>

                {/* KPI counters */}
                {projects.length > 0 && <StatusKPIRow projects={projects} />}

                {/* Toolbar */}
                <ListToolbar
                    search={lv.search}
                    onSearchChange={lv.setSearch}
                    placeholder="Rechercher un projet..."
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
                        { key: "name", label: "Nom" },
                        { key: "price", label: "Prix" },
                        { key: "status", label: "Statut" },
                    ]}
                    sortKey={lv.sortKey}
                    sortDir={lv.sortDir}
                    onSortKeyChange={lv.setSortKey}
                    onSortDirToggle={() => lv.setSortDir(lv.sortDir === "asc" ? "desc" : "asc")}
                />

                {/* Liste vide */}
                {projects.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: C.white, borderRadius: 12, border: "1px solid " + C.border }}>
                        <div style={{ marginBottom: 16 }}>
                            <ClipboardList size={40} style={{color: C.muted, opacity: 0.4}} />
                        </div>
                        <div style={{ fontSize: 16, color: C.dark, fontWeight: 600, marginBottom: 8 }}>Aucun projet pour l'instant</div>
                        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Deposez votre premier brief pour obtenir un devis.</div>
                        <a
                            href="/projet/nouveau"
                            className="btn-primary"
                            style={{ padding: "12px 24px", backgroundColor: C.yellow, color: C.dark, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                        >
                            Deposer un brief
                        </a>
                    </div>
                )}

                {/* No search results */}
                {projects.length > 0 && lv.filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                        <SearchX size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Aucun projet ne correspond a votre recherche</div>
                    </div>
                )}

                {/* Always grouped view — list or grid cards inside each group */}
                {lv.filtered.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {lv.sortedGroupKeys.map(status => {
                            const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
                            const items = lv.grouped[status]
                            const isCollapsed = !!lv.collapsed[status]

                            return (
                                <div key={status}>
                                    <div
                                        onClick={() => lv.toggleCollapsed(status)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10,
                                            padding: "10px 16px", borderRadius: 10,
                                            backgroundColor: sc.bg, cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                    >
                                        <ChevronDown
                                            size={16}
                                            style={{
                                                color: sc.color, transition: "transform 0.2s",
                                                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                            }}
                                        />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                                            backgroundColor: sc.color, color: "#fff",
                                        }}>
                                            {items.length}
                                        </span>
                                    </div>
                                    {!isCollapsed && (
                                        lv.viewMode === "grid" ? (
                                            <div className="list-grid-3col" style={{ marginTop: 10 }}>
                                                {items.map((project: any) => (
                                                    <ProjectGridCard key={project.project_id} project={project} onClick={() => openProject(project.project_id)} role={user?.role} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                                {items.map((project: any) => (
                                                    <ProjectCard key={project.project_id} project={project} onClick={() => openProject(project.project_id)} role={user?.role} />
                                                ))}
                                            </div>
                                        )
                                    )}
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
                title={selectedProjectId ? "Detail du projet" : undefined}
                headerActions={selectedProjectId ? (
                    <a
                        href={`/projet/${selectedProjectId}`}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: "1px solid " + C.border, background: C.white, color: C.dark,
                            textDecoration: "none",
                        }}
                    >
                        <ExternalLink size={13} /> Pleine page
                    </a>
                ) : undefined}
            >
                {selectedProjectId && (
                    <ProjectDetail projectId={selectedProjectId} onClose={closeDrawer} />
                )}
            </Drawer>
        </div>
    )
}
