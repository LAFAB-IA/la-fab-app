"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import {
    Plus, Calendar, ChevronDown, ChevronUp, Send, Check, X,
    CalendarDays, Pencil, Loader, ArrowLeft, MessageSquare, Clock,
} from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { formatDate, timeAgo } from "@/lib/format"
import { io, Socket } from "socket.io-client"
import type { Milestone, MilestoneStatus, MilestoneMessage } from "@/lib/sdk/types"

// ── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; bg: string }> = {
    pending:           { label: "En attente",         color: "#616161", bg: "#f5f5f5" },
    accepted:          { label: "Accepte",            color: "#1a7a3c", bg: "#e8f8ee" },
    refused:           { label: "Refuse",             color: "#c0392b", bg: "#fee" },
    counter_proposed:  { label: "Contre-proposition", color: "#e65100", bg: "#fff3e0" },
}

// ══════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════
export default function ProjectPlanning() {
    const params = useParams()
    const projectId = params?.id as string
    const { token, user, realRole } = useAuth()
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [messagesByMilestone, setMessagesByMilestone] = useState<Record<string, MilestoneMessage[]>>({})
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
    const [counterMilestone, setCounterMilestone] = useState<Milestone | null>(null)
    const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})

    // Role detection with admin override support
    const isClient = user?.role === "client" || (realRole === "admin" && user?.role === "client")
    const isSupplier = user?.role === "supplier" || (realRole === "admin" && user?.role === "supplier")

    const headers = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token])

    const fetchMilestones = useCallback(() => {
        if (!token || !projectId) return
        fetch(`${API_URL}/api/planning/${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                if (d.ok) {
                    const ms = Array.isArray(d.milestones) ? d.milestones : []
                    ms.sort((a: Milestone, b: Milestone) =>
                        new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime()
                    )
                    setMilestones(ms)

                    // Group messages by milestone_id
                    const allMsgs: MilestoneMessage[] = Array.isArray(d.messages) ? d.messages : []
                    const grouped: Record<string, MilestoneMessage[]> = {}
                    for (const m of allMsgs) {
                        if (!grouped[m.milestone_id]) grouped[m.milestone_id] = []
                        grouped[m.milestone_id].push(m)
                    }
                    // Also handle messages nested in milestones (backward compat)
                    for (const m of ms) {
                        if (Array.isArray(m.messages) && m.messages.length > 0) {
                            grouped[m.id] = m.messages
                        }
                    }
                    setMessagesByMilestone(grouped)
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [token, projectId])

    useEffect(() => { fetchMilestones() }, [fetchMilestones])

    // WebSocket real-time
    useEffect(() => {
        if (!token) return
        let socket: Socket | null = null
        try {
            socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] })
            socket.on("planning:updated", (data: any) => {
                if (!data || !data.project_id || data.project_id === projectId) fetchMilestones()
            })
        } catch { /* WebSocket optional */ }
        return () => { socket?.disconnect() }
    }, [token, projectId, fetchMilestones])

    const toggleMessages = (id: string) => {
        setExpandedMessages(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // ── API actions ──────────────────────────────────────────────────────
    const handleRespond = async (milestoneId: string, action: "accept" | "refuse") => {
        await fetch(`${API_URL}/api/planning/${projectId}/milestone/${milestoneId}/respond`, {
            method: "POST", headers: headers(),
            body: JSON.stringify({ action }),
        }).catch(() => {})
        fetchMilestones()
    }

    const handleCounter = async (milestoneId: string, counterDate: string) => {
        await fetch(`${API_URL}/api/planning/${projectId}/milestone/${milestoneId}/respond`, {
            method: "POST", headers: headers(),
            body: JSON.stringify({ action: "counter", counter_date: counterDate }),
        }).catch(() => {})
        fetchMilestones()
    }

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
            <Loader size={24} style={{ animation: "spin 1s linear infinite", color: C.muted }} />
        </div>
    )

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", fontFamily: "Inter, sans-serif" }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a href={`/projet/${projectId}`} style={{ color: C.muted, display: "flex" }}>
                        <ArrowLeft size={20} />
                    </a>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3A4040", margin: 0 }}>
                        Planning du projet
                    </h1>
                </div>
                {isClient && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 8, border: "none",
                            backgroundColor: "#F4CF15", color: "#3A4040",
                            fontWeight: 600, fontSize: 14, cursor: "pointer",
                        }}
                    >
                        <Plus size={16} /> Ajouter un jalon
                    </button>
                )}
            </div>

            {milestones.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: 60, color: C.muted,
                    border: `2px dashed ${C.border}`, borderRadius: 12,
                }}>
                    <CalendarDays size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: 15 }}>Aucun jalon pour ce projet</p>
                    {isClient && (
                        <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                            Cliquez sur "Ajouter un jalon" pour commencer
                        </p>
                    )}
                </div>
            ) : (
                <div style={{ position: "relative", paddingLeft: 28 }}>
                    {/* Vertical timeline line */}
                    <div style={{
                        position: "absolute", left: 11, top: 8, bottom: 8, width: 2,
                        backgroundColor: C.border,
                    }} />

                    {milestones.map((m, i) => {
                        const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending
                        const msgs = messagesByMilestone[m.id] || []
                        const isExpanded = !!expandedMessages[m.id]
                        const canEdit = isClient && ["pending", "refused", "counter_proposed"].includes(m.status)
                        const canRespond = isSupplier && ["pending", "counter_proposed"].includes(m.status)

                        return (
                            <MilestoneCard
                                key={m.id}
                                milestone={m}
                                cfg={cfg}
                                msgs={msgs}
                                isExpanded={isExpanded}
                                canEdit={canEdit}
                                canRespond={canRespond}
                                onToggleMessages={() => toggleMessages(m.id)}
                                onEdit={() => setEditingMilestone(m)}
                                onAccept={() => handleRespond(m.id, "accept")}
                                onRefuse={() => handleRespond(m.id, "refuse")}
                                onCounterPropose={() => setCounterMilestone(m)}
                                token={token!}
                                projectId={projectId}
                                onRefresh={fetchMilestones}
                                headers={headers()}
                                isLast={i === milestones.length - 1}
                            />
                        )
                    })}
                </div>
            )}

            {/* Create modal */}
            {showCreateModal && (
                <MilestoneFormModal
                    title="Nouveau jalon"
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={async (title, date) => {
                        await fetch(`${API_URL}/api/planning/${projectId}/milestone`, {
                            method: "POST", headers: headers(),
                            body: JSON.stringify({ title, milestone_date: date }),
                        })
                        setShowCreateModal(false)
                        fetchMilestones()
                    }}
                />
            )}

            {/* Edit modal */}
            {editingMilestone && (
                <MilestoneFormModal
                    title="Modifier le jalon"
                    initialTitle={editingMilestone.title}
                    initialDate={editingMilestone.milestone_date}
                    onClose={() => setEditingMilestone(null)}
                    onSubmit={async (title, date) => {
                        await fetch(`${API_URL}/api/planning/${projectId}/milestone/${editingMilestone.id}`, {
                            method: "PATCH", headers: headers(),
                            body: JSON.stringify({ title, milestone_date: date }),
                        })
                        setEditingMilestone(null)
                        fetchMilestones()
                    }}
                />
            )}

            {/* Counter-propose modal */}
            {counterMilestone && (
                <CounterProposeModal
                    milestoneTitle={counterMilestone.title}
                    onClose={() => setCounterMilestone(null)}
                    onSubmit={async (counterDate) => {
                        await handleCounter(counterMilestone.id, counterDate)
                        setCounterMilestone(null)
                    }}
                />
            )}
        </div>
    )
}

// ─── Milestone Card ──────────────────────────────────────────────────────

function MilestoneCard({ milestone: m, cfg, msgs, isExpanded, canEdit, canRespond, onToggleMessages, onEdit, onAccept, onRefuse, onCounterPropose, token, projectId, onRefresh, headers, isLast }: {
    milestone: Milestone
    cfg: { label: string; color: string; bg: string }
    msgs: MilestoneMessage[]
    isExpanded: boolean
    canEdit: boolean
    canRespond: boolean
    onToggleMessages: () => void
    onEdit: () => void
    onAccept: () => void
    onRefuse: () => void
    onCounterPropose: () => void
    token: string
    projectId: string
    onRefresh: () => void
    headers: Record<string, string>
    isLast: boolean
}) {
    const [msgInput, setMsgInput] = useState("")
    const [sending, setSending] = useState(false)

    const sendMessage = async () => {
        if (!msgInput.trim()) return
        setSending(true)
        await fetch(`${API_URL}/api/planning/${projectId}/milestone/${m.id}/message`, {
            method: "POST", headers,
            body: JSON.stringify({ content: msgInput.trim() }),
        }).catch(() => {})
        setMsgInput("")
        setSending(false)
        onRefresh()
    }

    return (
        <div style={{ position: "relative", marginBottom: isLast ? 0 : 24 }}>
            {/* Timeline dot */}
            <div style={{
                position: "absolute", left: -28, top: 14, width: 12, height: 12,
                borderRadius: "50%", backgroundColor: cfg.color,
                border: "2px solid #FAFFFD", boxShadow: `0 0 0 2px ${cfg.color}`,
                zIndex: 1,
            }} />

            <div style={{
                backgroundColor: "#FAFFFD", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: 16, marginLeft: 8,
                boxShadow: "0 1px 4px rgba(58,64,64,0.06)",
            }}>
                {/* Title + date + badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#3A4040", marginBottom: 4 }}>
                            {m.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                            <Clock size={13} />
                            {formatDate(m.milestone_date)}
                        </div>
                    </div>
                    <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg,
                    }}>
                        {cfg.label}
                    </span>
                </div>

                {/* Counter-date */}
                {m.counter_date && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginTop: 10, padding: "8px 12px", borderRadius: 8,
                        backgroundColor: "#fff3e0", fontSize: 13, color: "#e65100",
                    }}>
                        <CalendarDays size={14} />
                        Proposition fournisseur : {formatDate(m.counter_date)}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {canEdit && (
                        <button onClick={onEdit} style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
                            backgroundColor: "transparent", fontSize: 13, cursor: "pointer", color: "#3A4040",
                        }}>
                            <Pencil size={13} /> Modifier
                        </button>
                    )}

                    {canRespond && (
                        <>
                            <button onClick={onAccept} style={{
                                display: "flex", alignItems: "center", gap: 4,
                                padding: "5px 12px", borderRadius: 6,
                                border: "1px solid #1a7a3c", backgroundColor: "transparent",
                                fontSize: 13, cursor: "pointer", color: "#1a7a3c",
                            }}>
                                <Check size={13} /> Accepter
                            </button>
                            <button onClick={onRefuse} style={{
                                display: "flex", alignItems: "center", gap: 4,
                                padding: "5px 12px", borderRadius: 6,
                                border: "1px solid #c0392b", backgroundColor: "transparent",
                                fontSize: 13, cursor: "pointer", color: "#c0392b",
                            }}>
                                <X size={13} /> Refuser
                            </button>
                            <button onClick={onCounterPropose} style={{
                                display: "flex", alignItems: "center", gap: 4,
                                padding: "5px 12px", borderRadius: 6,
                                border: "1px solid #e65100", backgroundColor: "transparent",
                                fontSize: 13, cursor: "pointer", color: "#e65100",
                            }}>
                                <CalendarDays size={13} /> Proposer une date
                            </button>
                        </>
                    )}

                    {/* Messages toggle */}
                    <button onClick={onToggleMessages} style={{
                        display: "flex", alignItems: "center", gap: 4, marginLeft: "auto",
                        padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
                        backgroundColor: "transparent", fontSize: 13, cursor: "pointer", color: C.muted,
                    }}>
                        <MessageSquare size={13} />
                        {msgs.length > 0 && <span>({msgs.length})</span>}
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </div>

                {/* Messages section */}
                {isExpanded && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                        {msgs.length === 0 && (
                            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px" }}>Aucun message</p>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto", marginBottom: 8 }}>
                            {msgs.map(msg => (
                                <div key={msg.id} style={{
                                    padding: "8px 12px", borderRadius: 8,
                                    backgroundColor: "#f8f8f6", fontSize: 13, color: "#3A4040",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 12, color: "#3A4040" }}>
                                            {msg.author_role === "client" ? "Client" : msg.author_role === "supplier" ? "Fournisseur" : "Admin"}
                                        </span>
                                        <span style={{ color: C.muted, fontSize: 11 }}>{timeAgo(msg.created_at)}</span>
                                    </div>
                                    <p style={{ margin: 0 }}>{msg.content}</p>
                                </div>
                            ))}
                        </div>

                        {/* Message input */}
                        <div style={{ display: "flex", gap: 8 }}>
                            <input
                                value={msgInput}
                                onChange={e => setMsgInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                                placeholder="Ecrire un message..."
                                style={{
                                    flex: 1, padding: "8px 12px", borderRadius: 8,
                                    border: `1px solid ${C.border}`, fontSize: 13,
                                    outline: "none", fontFamily: "Inter, sans-serif",
                                    boxSizing: "border-box",
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={sending || !msgInput.trim()}
                                style={{
                                    padding: "8px 14px", borderRadius: 8, border: "none",
                                    backgroundColor: "#F4CF15", cursor: "pointer",
                                    opacity: sending || !msgInput.trim() ? 0.5 : 1,
                                    display: "flex", alignItems: "center",
                                }}
                            >
                                <Send size={14} color="#3A4040" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Milestone Form Modal ────────────────────────────────────────────────

function MilestoneFormModal({ title, initialTitle, initialDate, onClose, onSubmit }: {
    title: string
    initialTitle?: string
    initialDate?: string
    onClose: () => void
    onSubmit: (title: string, date: string) => Promise<void>
}) {
    const [t, setT] = useState(initialTitle || "")
    const [d, setD] = useState(initialDate ? initialDate.slice(0, 10) : "")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", h)
        document.body.style.overflow = "hidden"
        return () => { document.removeEventListener("keydown", h); document.body.style.overflow = "" }
    }, [onClose])

    const handleSubmit = async () => {
        if (!t.trim() || !d) return
        setSubmitting(true)
        await onSubmit(t.trim(), d)
        setSubmitting(false)
    }

    return (
        <div style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(58,64,64,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000,
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: "#FAFFFD", borderRadius: 12, padding: 24,
                width: 420, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(58,64,64,0.18)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#3A4040" }}>{title}</h2>
                    <button onClick={onClose} style={{
                        border: `1px solid ${C.border}`, borderRadius: 8, background: "#FAFFFD",
                        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#3A4040",
                    }}><X size={14} /></button>
                </div>

                <label style={{ fontSize: 13, fontWeight: 500, color: "#3A4040", display: "block", marginBottom: 4 }}>Titre</label>
                <input
                    value={t} onChange={e => setT(e.target.value)}
                    placeholder="Ex: Validation BAT"
                    style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8,
                        border: `1px solid ${C.border}`, fontSize: 14,
                        marginBottom: 14, outline: "none", boxSizing: "border-box",
                        fontFamily: "Inter, sans-serif",
                    }}
                />

                <label style={{ fontSize: 13, fontWeight: 500, color: "#3A4040", display: "block", marginBottom: 4 }}>Date</label>
                <input
                    type="date" value={d} onChange={e => setD(e.target.value)}
                    style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8,
                        border: `1px solid ${C.border}`, fontSize: 14,
                        marginBottom: 20, outline: "none", boxSizing: "border-box",
                        fontFamily: "Inter, sans-serif",
                    }}
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{
                        padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                        backgroundColor: "transparent", fontSize: 14, cursor: "pointer", color: "#3A4040",
                    }}>Annuler</button>
                    <button onClick={handleSubmit} disabled={submitting || !t.trim() || !d} style={{
                        padding: "8px 20px", borderRadius: 8, border: "none",
                        backgroundColor: "#F4CF15", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", color: "#3A4040",
                        opacity: submitting || !t.trim() || !d ? 0.5 : 1,
                    }}>
                        {submitting ? "Enregistrement..." : "Valider"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Counter-Propose Modal ───────────────────────────────────────────────

function CounterProposeModal({ milestoneTitle, onClose, onSubmit }: {
    milestoneTitle: string
    onClose: () => void
    onSubmit: (counterDate: string) => Promise<void>
}) {
    const [d, setD] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", h)
        document.body.style.overflow = "hidden"
        return () => { document.removeEventListener("keydown", h); document.body.style.overflow = "" }
    }, [onClose])

    const handleSubmit = async () => {
        if (!d) return
        setSubmitting(true)
        await onSubmit(d)
        setSubmitting(false)
    }

    return (
        <div style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(58,64,64,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000,
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: "#FAFFFD", borderRadius: 12, padding: 24,
                width: 400, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(58,64,64,0.18)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#3A4040" }}>Proposer une date</h2>
                    <button onClick={onClose} style={{
                        border: `1px solid ${C.border}`, borderRadius: 8, background: "#FAFFFD",
                        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#3A4040",
                    }}><X size={14} /></button>
                </div>

                <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted }}>
                    Jalon : {milestoneTitle}
                </p>

                <label style={{ fontSize: 13, fontWeight: 500, color: "#3A4040", display: "block", marginBottom: 4 }}>
                    Nouvelle date proposee
                </label>
                <input
                    type="date" value={d} onChange={e => setD(e.target.value)}
                    style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8,
                        border: `1px solid ${C.border}`, fontSize: 14,
                        marginBottom: 20, outline: "none", boxSizing: "border-box",
                        fontFamily: "Inter, sans-serif",
                    }}
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{
                        padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                        backgroundColor: "transparent", fontSize: 14, cursor: "pointer", color: "#3A4040",
                    }}>Annuler</button>
                    <button onClick={handleSubmit} disabled={submitting || !d} style={{
                        padding: "8px 20px", borderRadius: 8, border: "none",
                        backgroundColor: "#F4CF15", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", color: "#3A4040",
                        opacity: submitting || !d ? 0.5 : 1,
                    }}>
                        {submitting ? "Envoi..." : "Proposer"}
                    </button>
                </div>
            </div>
        </div>
    )
}
