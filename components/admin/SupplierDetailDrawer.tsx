"use client"

import React, { useEffect, useState, useCallback } from "react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import Drawer from "@/components/shared/Drawer"
import { formatPrice, timeAgo } from "@/lib/format"
import { Mail, Phone, MapPin, Plus, MessageSquare, User as UserIcon } from "lucide-react"

interface Note {
    id: string
    note: string
    author_name?: string
    author_email?: string
    created_at: string
}

interface Consultation {
    consultation_id: string
    project_id: string
    status: string
    sent_at?: string
    replied_at?: string
    supplier_price?: number | null
    created_at: string
}

interface SupplierDetail {
    id: string
    supplier_id: string
    name: string
    email?: string
    phone?: string
    address?: string
    city?: string
    status: string
    partner_tier: string
    trust_score?: number | null
    services?: string[]
    response_rate?: number
    conversion_rate?: number
    estimated_revenue?: number
    consultations_received?: number
    consultations_replied?: number
    consultations?: Consultation[]
}

interface Props {
    supplierId: string | null
    onClose: () => void
}

export default function SupplierDetailDrawer({ supplierId, onClose }: Props) {
    const [data, setData] = useState<SupplierDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [notes, setNotes] = useState<Note[]>([])
    const [notesLoading, setNotesLoading] = useState(false)
    const [newNote, setNewNote] = useState("")
    const [posting, setPosting] = useState(false)
    const [postError, setPostError] = useState("")

    // ── Fetch supplier detail ────────────────────────────────────────────────
    useEffect(() => {
        if (!supplierId) return
        let cancelled = false
        const id = setTimeout(() => {
            setLoading(true)
            setError("")
            setData(null)
            fetchWithAuth(`${API_URL}/api/admin/suppliers/${supplierId}`)
                .then((r) => r.json())
                .then((res) => {
                    if (cancelled) return
                    if (res?.ok === false) {
                        setError(res.error || "Erreur chargement fournisseur")
                    } else {
                        setData(res?.supplier || res)
                    }
                })
                .catch(() => { if (!cancelled) setError("Erreur réseau") })
                .finally(() => { if (!cancelled) setLoading(false) })
        }, 0)
        return () => { cancelled = true; clearTimeout(id) }
    }, [supplierId])

    // ── Fetch notes ──────────────────────────────────────────────────────────
    const fetchNotes = useCallback(() => {
        if (!supplierId) return
        setNotesLoading(true)
        fetchWithAuth(`${API_URL}/api/admin/suppliers/${supplierId}/notes`)
            .then((r) => r.json())
            .then((res) => {
                const list: Note[] = Array.isArray(res) ? res : res?.notes || []
                setNotes(list)
            })
            .catch(() => {})
            .finally(() => setNotesLoading(false))
    }, [supplierId])

    useEffect(() => {
        if (!supplierId) return
        const id = setTimeout(() => fetchNotes(), 0)
        return () => clearTimeout(id)
    }, [supplierId, fetchNotes])

    function handleAddNote() {
        if (!supplierId || !newNote.trim()) return
        setPosting(true)
        setPostError("")
        fetchWithAuth(`${API_URL}/api/admin/suppliers/${supplierId}/note`, {
            method: "POST",
            body: JSON.stringify({ note: newNote.trim() }),
        })
            .then(async (r) => {
                const res = await r.json().catch(() => ({}))
                if (!r.ok || res?.ok === false) throw new Error(res?.error || "Erreur")
                setNewNote("")
                fetchNotes()
            })
            .catch((e) => setPostError(e.message || "Erreur ajout note"))
            .finally(() => setPosting(false))
    }

    const lbl: React.CSSProperties = {
        fontSize: 11, fontWeight: 600, color: C.muted,
        textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
    }
    const val: React.CSSProperties = { fontSize: 14, color: C.dark, fontWeight: 500 }

    return (
        <Drawer
            isOpen={!!supplierId}
            onClose={onClose}
            title={data?.name || "Détail fournisseur"}
            width="560px"
        >
            {loading && (
                <div style={{ padding: "40px 0", textAlign: "center", color: C.muted }}>
                    Chargement…
                </div>
            )}

            {error && (
                <div style={{
                    padding: "12px 16px", borderRadius: 8,
                    backgroundColor: "var(--status-danger-bg)",
                    color: "var(--status-danger-fg)",
                    border: "1px solid var(--status-danger-bd)",
                    fontSize: 13, marginBottom: 16,
                }}>
                    {error}
                </div>
            )}

            {data && !loading && (
                <>
                    {/* ── Profil ── */}
                    <section style={{ marginBottom: 24 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                                <div style={lbl}>ID</div>
                                <div style={val}>{data.supplier_id}</div>
                            </div>
                            <div>
                                <div style={lbl}>Tier</div>
                                <div style={val}>{data.partner_tier || "—"}</div>
                            </div>
                            <div>
                                <div style={lbl}>Statut</div>
                                <div style={val}>{data.status === "active" ? "Actif" : "Inactif"}</div>
                            </div>
                            <div>
                                <div style={lbl}>Score confiance</div>
                                <div style={val}>{data.trust_score != null ? Math.round(data.trust_score * 100) + "%" : "—"}</div>
                            </div>
                        </div>
                    </section>

                    {/* ── Contact ── */}
                    <section style={{
                        marginBottom: 24, padding: 16,
                        borderRadius: 12, border: "1px solid " + C.border,
                        backgroundColor: C.bg,
                    }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {data.email && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.dark }}>
                                    <Mail size={14} color={C.muted} />
                                    <a href={"mailto:" + data.email} style={{ color: C.dark, textDecoration: "none" }}>{data.email}</a>
                                </div>
                            )}
                            {data.phone && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.dark }}>
                                    <Phone size={14} color={C.muted} />
                                    {data.phone}
                                </div>
                            )}
                            {(data.address || data.city) && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.dark }}>
                                    <MapPin size={14} color={C.muted} />
                                    {[data.address, data.city].filter(Boolean).join(", ")}
                                </div>
                            )}
                            {data.services && data.services.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                    {data.services.map((s) => (
                                        <span key={s} style={{
                                            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                                            backgroundColor: "var(--status-info-bg)",
                                            color: "var(--status-info-fg)",
                                            border: "1px solid var(--status-info-bd)",
                                        }}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Stats ── */}
                    <section style={{ marginBottom: 24 }}>
                        <div style={{ ...lbl, marginBottom: 10 }}>Performance</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <StatCard
                                label="Taux réponse"
                                value={(data.response_rate ?? 0) + "%"}
                                tone={(data.response_rate ?? 0) >= 75 ? "success" : (data.response_rate ?? 0) >= 40 ? "warn" : "danger"}
                            />
                            <StatCard
                                label="Taux conversion"
                                value={(data.conversion_rate ?? 0) + "%"}
                                tone={(data.conversion_rate ?? 0) >= 50 ? "success" : (data.conversion_rate ?? 0) >= 20 ? "warn" : "danger"}
                            />
                            <StatCard
                                label="CA estimé"
                                value={formatPrice(data.estimated_revenue ?? 0)}
                                tone="info"
                            />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
                            {data.consultations_replied ?? 0} réponse(s) sur {data.consultations_received ?? 0} consultation(s)
                        </div>
                    </section>

                    {/* ── Historique consultations ── */}
                    <section style={{ marginBottom: 24 }}>
                        <div style={{ ...lbl, marginBottom: 10 }}>Historique consultations</div>
                        {data.consultations && data.consultations.length > 0 ? (
                            <div style={{ borderRadius: 10, border: "1px solid " + C.border, overflow: "hidden" }}>
                                {data.consultations.slice(0, 10).map((c) => (
                                    <div key={c.consultation_id} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "10px 14px", borderBottom: "1px solid " + C.border,
                                        backgroundColor: C.white,
                                    }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {c.project_id}
                                            </div>
                                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                                {timeAgo(c.created_at)}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            {c.supplier_price != null && (
                                                <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>
                                                    {formatPrice(Number(c.supplier_price))}
                                                </span>
                                            )}
                                            <span style={{
                                                padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                                                backgroundColor: c.replied_at ? "var(--status-success-bg)" : "var(--status-warn-bg)",
                                                color: c.replied_at ? "var(--status-success-fg)" : "var(--status-warn-fg)",
                                                border: "1px solid " + (c.replied_at ? "var(--status-success-bd)" : "var(--status-warn-bd)"),
                                            }}>
                                                {c.replied_at ? "Répondu" : c.status || "En attente"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: C.muted, padding: "12px 0" }}>
                                Aucune consultation
                            </div>
                        )}
                    </section>

                    {/* ── Notes internes ── */}
                    <section>
                        <div style={{ ...lbl, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <MessageSquare size={12} /> Notes internes
                        </div>

                        {/* Liste des notes */}
                        {notesLoading && notes.length === 0 ? (
                            <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>Chargement…</div>
                        ) : notes.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                                {notes.map((n) => (
                                    <div key={n.id} style={{
                                        padding: "10px 14px",
                                        backgroundColor: C.bg,
                                        border: "1px solid " + C.border,
                                        borderRadius: 10,
                                    }}>
                                        <div style={{
                                            display: "flex", justifyContent: "space-between",
                                            alignItems: "center", gap: 8, marginBottom: 4,
                                        }}>
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: 6,
                                                fontSize: 12, fontWeight: 600, color: C.dark,
                                                minWidth: 0,
                                            }}>
                                                <UserIcon size={11} color={C.muted} />
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {n.author_name || n.author_email || "Admin"}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
                                                {timeAgo(n.created_at)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                            {n.note}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: C.muted, padding: "8px 0", marginBottom: 12 }}>
                                Aucune note pour ce fournisseur
                            </div>
                        )}

                        {/* Formulaire d'ajout */}
                        <div>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Ajouter une note interne…"
                                rows={3}
                                style={{
                                    width: "100%", padding: "10px 12px", borderRadius: 8,
                                    border: "1px solid " + C.border,
                                    backgroundColor: C.white, color: C.dark,
                                    fontSize: 13, fontFamily: "Inter, sans-serif",
                                    resize: "vertical", outline: "none", boxSizing: "border-box",
                                }}
                            />
                            {postError && (
                                <div style={{ fontSize: 12, color: "var(--status-danger-fg)", marginTop: 6 }}>
                                    {postError}
                                </div>
                            )}
                            <button
                                onClick={handleAddNote}
                                disabled={posting || !newNote.trim()}
                                className="btn-primary"
                                style={{
                                    marginTop: 8, padding: "9px 16px",
                                    backgroundColor: C.yellow, color: "#000000",
                                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                                    cursor: posting || !newNote.trim() ? "not-allowed" : "pointer",
                                    opacity: posting || !newNote.trim() ? 0.5 : 1,
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}
                            >
                                <Plus size={14} />
                                {posting ? "Ajout…" : "Ajouter une note"}
                            </button>
                        </div>
                    </section>
                </>
            )}
        </Drawer>
    )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "danger" | "info" }) {
    return (
        <div style={{
            padding: "12px 14px", borderRadius: 10,
            backgroundColor: `var(--status-${tone}-bg)`,
            border: `1px solid var(--status-${tone}-bd)`,
        }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: `var(--status-${tone}-fg)` }}>
                {value}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
        </div>
    )
}
