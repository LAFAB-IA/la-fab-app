"use client"

import React, { useEffect, useState } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { ClipboardList, ExternalLink, List, LayoutGrid, Search, X, SearchX, ChevronDown } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format"
import Drawer from "@/components/shared/Drawer"
import ProjectDetail from "@/components/ProjectDetail"

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

function StatusBadge({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>
            {sc.label}
        </span>
    )
}

function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
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
                        {project.product?.label || project.brief_analysis?.product_type || "Brief uploade"}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{project.project_id}</div>
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

export default function ProjectsList() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // View mode
    const [viewMode, setViewMode] = useState<"list" | "group">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("projects_view_mode") as "list" | "group") || "list"
        }
        return "list"
    })

    // Search
    const [search, setSearch] = useState("")

    // Collapsed groups
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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

    function toggleView(mode: "list" | "group") {
        setViewMode(mode)
        localStorage.setItem("projects_view_mode", mode)
    }

    function toggleGroup(status: string) {
        setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))
    }

    // Filter projects
    const q = search.toLowerCase().trim()
    const filtered = q
        ? projects.filter(p => {
            const fields = [
                p.product?.label,
                p.brief_analysis?.product_type,
                p.brief_analysis?.description,
                p.project_id,
                p.client_name,
                p.account_name,
            ]
            return fields.some(f => f && String(f).toLowerCase().includes(q))
        })
        : projects

    // Group by status
    const grouped: Record<string, any[]> = {}
    for (const p of filtered) {
        const s = p.status || "unknown"
        if (!grouped[s]) grouped[s] = []
        grouped[s].push(p)
    }
    const sortedStatuses = Object.keys(grouped).sort(
        (a, b) => (STATUS_ORDER.indexOf(a) === -1 ? 99 : STATUS_ORDER.indexOf(a)) - (STATUS_ORDER.indexOf(b) === -1 ? 99 : STATUS_ORDER.indexOf(b))
    )

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

                {/* Search + View toggle */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: C.muted }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un projet..."
                            style={{
                                width: "100%", padding: "10px 36px", borderRadius: 8,
                                border: "1px solid " + C.border, fontSize: 14, color: C.dark,
                                backgroundColor: C.white, outline: "none", fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 8, border: "1px solid " + C.border, background: C.white }}>
                        <button
                            onClick={() => toggleView("list")}
                            style={{
                                padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                background: viewMode === "list" ? C.yellow : "transparent",
                                color: viewMode === "list" ? C.dark : C.muted,
                            }}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => toggleView("group")}
                            style={{
                                padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                background: viewMode === "group" ? C.yellow : "transparent",
                                color: viewMode === "group" ? C.dark : C.muted,
                            }}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>

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
                {projects.length > 0 && filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                        <SearchX size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Aucun projet ne correspond a votre recherche</div>
                    </div>
                )}

                {/* List view */}
                {viewMode === "list" && filtered.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {filtered.map((project: any) => (
                            <ProjectCard key={project.project_id} project={project} onClick={() => openProject(project.project_id)} />
                        ))}
                    </div>
                )}

                {/* Group view */}
                {viewMode === "group" && filtered.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {sortedStatuses.map(status => {
                            const sc = STATUS_CONFIG[status] || { label: status, bg: "#f5f5f5", color: "#333", border: "#e0e0e0" }
                            const items = grouped[status]
                            const isCollapsed = !!collapsed[status]

                            return (
                                <div key={status}>
                                    <div
                                        onClick={() => toggleGroup(status)}
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
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                            {items.map((project: any) => (
                                                <ProjectCard key={project.project_id} project={project} onClick={() => openProject(project.project_id)} />
                                            ))}
                                        </div>
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
            >
                {selectedProjectId && (
                    <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                            <a
                                href={`/projet/${selectedProjectId}`}
                                className="btn-secondary"
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
                        <ProjectDetail projectId={selectedProjectId} onClose={closeDrawer} />
                    </>
                )}
            </Drawer>
        </div>
    )
}
