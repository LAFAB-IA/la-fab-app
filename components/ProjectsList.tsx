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
        <div className="projects-kpi-row flex gap-2.5 overflow-x-auto pb-1 mb-5 [scrollbar-width:none]">
            {KPI_SLOTS.map((slot) => {
                const count = slot.statuses.reduce((acc, s) => acc + (counts[s] || 0), 0)
                return (
                    <div
                        key={slot.label}
                        className="flex-none min-w-[130px] bg-[#FAFFFD] border border-[#e0e0de] rounded-[10px] px-[18px] py-[14px]"
                        style={{ borderLeft: `4px solid ${slot.borderColor}` }}
                    >
                        <div className="text-[28px] font-extrabold text-black leading-none">
                            {count}
                        </div>
                        <div className="text-[11px] text-[#7a8080] mt-[5px] font-medium leading-[1.3]">
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
        <span
            className="px-[10px] py-1 rounded-md text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
        >
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
            className="row-hover block bg-[#FAFFFD] rounded-xl px-6 py-5 shadow-[0_1px_3px_rgba(58,64,64,0.08)] border border-[#e0e0de] cursor-pointer transition-shadow duration-150"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="text-base font-bold text-black mb-1">
                        {projectDisplayName(project, role)}
                    </div>
                    <div className="text-xs text-[#7a8080]">{project.project_id}</div>
                    {role === "admin" && project.supplier_name && (
                        <div className="text-[11px] text-[#7a8080] mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#f0f0ee] border border-[#e0e0de] text-[10px] font-semibold">
                                Fournisseur : {project.supplier_name}
                            </span>
                        </div>
                    )}
                </div>
                <StatusBadge status={project.status} />
            </div>

            <div className="flex gap-6 flex-wrap">
                {project.quantity && (
                    <div>
                        <div className="text-[11px] text-[#7a8080] font-semibold uppercase tracking-[0.8px] mb-0.5">Quantite</div>
                        <div className="text-[13px] text-black font-medium">{project.quantity} ex.</div>
                    </div>
                )}
                {hasPrice && (
                    <div>
                        <div className="text-[11px] text-[#7a8080] font-semibold uppercase tracking-[0.8px] mb-0.5">Total HT</div>
                        <div className="text-[13px] text-black font-bold">{formatPrice(project.pricing.total_net)}</div>
                    </div>
                )}
                <div>
                    <div className="text-[11px] text-[#7a8080] font-semibold uppercase tracking-[0.8px] mb-0.5">Date</div>
                    <div className="text-[13px] text-black font-medium">
                        {formatDate(project.created_at)}
                    </div>
                </div>
            </div>

            <div className="mt-3.5 text-xs font-semibold" style={{ color: sc.color }}>
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
            className="row-hover bg-[#FAFFFD] rounded-xl px-[18px] py-4 shadow-[0_1px_3px_rgba(58,64,64,0.08)] border border-[#e0e0de] cursor-pointer transition-shadow duration-150 relative"
        >
            <span
                className="absolute top-3 right-3 px-2 py-[3px] rounded-md text-[11px] font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
            >
                {sc.label}
            </span>
            <div className="text-[15px] font-bold text-black mb-1 pr-[90px]">
                {projectDisplayName(project, role)}
            </div>
            <div
                className="text-xs text-[#7a8080]"
                style={{ marginBottom: role === "admin" && project.supplier_name ? 4 : 10 }}
            >
                {project.project_id}
            </div>
            {role === "admin" && project.supplier_name && (
                <div className="text-[10px] text-[#7a8080] mb-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#f0f0ee] border border-[#e0e0de] font-semibold">
                        Fournisseur : {project.supplier_name}
                    </span>
                </div>
            )}
            <div className="text-xs text-[#7a8080]">{formatDate(project.created_at)}</div>
            {hasPrice && (
                <div className="text-sm font-bold text-black mt-1.5">{formatPrice(project.pricing.total_net)}</div>
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
        <div className="flex items-center justify-center min-h-[200px] font-[Inter,_sans-serif]">
            <p className="text-[#7a8080]">Chargement de vos projets...</p>
        </div>
    )

    if (error) return (
        <div className="font-[Inter,_sans-serif]">
            <p className="text-[#c0392b]">{error}</p>
        </div>
    )

    return (
        <div className="font-[Inter,_sans-serif] box-border">
            <style>{`
                .projects-header {
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .projects-kpi-row {
                    -webkit-overflow-scrolling: touch;
                }
                .projects-kpi-row::-webkit-scrollbar { display: none; }
                .list-grid-3col {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                @media (max-width: 768px) {
                    .projects-header { flex-direction: column; align-items: stretch; gap: 12px; }
                    .projects-header h1 { font-size: 20px !important; }
                    .projects-header-cta { width: 100%; text-align: center; display: block !important; }
                    .list-grid-3col { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 375px) {
                    .projects-header h1 { font-size: 18px !important; }
                }
            `}</style>
            <div className="max-w-[720px] mx-auto">

                {/* Header */}
                <div className="projects-header">
                    <div>
                        <h1 className="text-[24px] font-bold text-black m-0">Mes projets</h1>
                        <p className="m-0 mt-1 text-sm text-[#7a8080]">{projects.length} projet{projects.length > 1 ? "s" : ""}</p>
                    </div>
                    <a
                        href="/projet/nouveau"
                        className="btn-primary projects-header-cta px-5 py-[10px] bg-[#F4CF15] text-black rounded-lg text-[13px] font-bold no-underline"
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
                    <div className="text-center px-5 py-[60px] bg-[#FAFFFD] rounded-xl border border-[#e0e0de]">
                        <div className="mb-4">
                            <ClipboardList size={40} className="text-[#7a8080] opacity-40" />
                        </div>
                        <div className="text-base text-black font-semibold mb-2">Aucun projet pour l'instant</div>
                        <div className="text-sm text-[#7a8080] mb-6">Deposez votre premier brief pour obtenir un devis.</div>
                        <a
                            href="/projet/nouveau"
                            className="btn-primary px-6 py-3 bg-[#F4CF15] text-black rounded-lg text-sm font-bold no-underline"
                        >
                            Deposer un brief
                        </a>
                    </div>
                )}

                {/* No search results */}
                {projects.length > 0 && lv.filtered.length === 0 && (
                    <div className="text-center px-5 py-[60px] text-[#7a8080]">
                        <SearchX size={40} className="mb-3 opacity-40" />
                        <div className="text-base font-semibold text-black mb-1">Aucun projet ne correspond a votre recherche</div>
                    </div>
                )}

                {/* Always grouped view — list or grid cards inside each group */}
                {lv.filtered.length > 0 && (
                    <div className="flex flex-col gap-5">
                        {lv.sortedGroupKeys.map(status => {
                            const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
                            const items = lv.grouped[status]
                            const isCollapsed = !!lv.collapsed[status]

                            return (
                                <div key={status}>
                                    <div
                                        onClick={() => lv.toggleCollapsed(status)}
                                        className="flex items-center gap-2.5 px-4 py-[10px] rounded-[10px] cursor-pointer select-none"
                                        style={{ backgroundColor: sc.bg }}
                                    >
                                        <ChevronDown
                                            size={16}
                                            style={{
                                                color: sc.color,
                                                transition: "transform 0.2s",
                                                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                            }}
                                        />
                                        <span className="text-sm font-bold" style={{ color: sc.color }}>{sc.label}</span>
                                        <span
                                            className="px-2 py-[2px] rounded-[10px] text-[11px] font-bold text-white"
                                            style={{ backgroundColor: sc.color }}
                                        >
                                            {items.length}
                                        </span>
                                    </div>
                                    {!isCollapsed && (
                                        lv.viewMode === "grid" ? (
                                            <div className="list-grid-3col mt-[10px]">
                                                {items.map((project: any) => (
                                                    <ProjectGridCard key={project.project_id} project={project} onClick={() => openProject(project.project_id)} role={user?.role} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2.5 mt-[10px]">
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
                        className="inline-flex items-center gap-[5px] px-3 py-[5px] rounded-md text-xs font-semibold border border-[#e0e0de] bg-[#FAFFFD] text-black no-underline"
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
