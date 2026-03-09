"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"
import { XCircle, Clock, Zap, Trash2, Plus, ChevronDown } from "lucide-react"
import { formatDate } from "@/lib/format"

const { useEffect, useState } = React

const EVENT_TYPES = [
    "project.created",
    "project.status_updated",
    "invoice.generated",
    "invoice.paid",
    "user.registered",
    "message.received",
    "webhook.test",
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    active:   { label: "Actif",    bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    inactive: { label: "Inactif",  bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" },
}

const DELIVERY_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
    success: { label: "Succès",    bg: "#e8f8ee", color: "#1a7a3c", border: "#a8dbb8" },
    failed:  { label: "Échoué",   bg: "#fde8e8", color: "#c0392b", border: "#f5c6c6" },
    pending: { label: "En cours",  bg: "#fef9e0", color: "#b89a00", border: "#f4cf1588" },
}

interface Webhook {
    id: string
    url: string
    events: string[]
    is_active: boolean
    secret: string
    created_at: string
    account_id: string
}

interface DeliveryLog {
    id: string
    webhook_id: string
    event_type: string
    status: string
    status_code: number
    response_time_ms: number
    created_at: string
}

function DeliveryStatusBadge({ status }: { status: string }) {
    const dc = DELIVERY_STATUS[status] || { label: status, bg: "#f0f0ee", color: "#7a8080", border: "#e0e0de" }
    return (
        <span style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            backgroundColor: dc.bg, color: dc.color, border: "1px solid " + dc.border, whiteSpace: "nowrap",
        }}>
            {dc.label}
        </span>
    )
}

export default function AdminWebhooks() {
    const { isAuthenticated, isLoading: authLoading } = useAuth()
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [deliveryLogs, setDeliveryLogs] = useState<Record<string, DeliveryLog[]>>({})
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null)
    const [testing, setTesting] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({})

    // Form state
    const [showForm, setShowForm] = useState(false)
    const [formUrl, setFormUrl] = useState("")
    const [formEvents, setFormEvents] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) { setError("Non authentifié"); setLoading(false); return }
        fetchWebhooks()
    }, [isAuthenticated, authLoading])

    function fetchWebhooks() {
        fetchWithAuth(API_URL + "/api/webhooks")
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setWebhooks(data.webhooks || [])
                else setError("Accès refusé ou erreur serveur")
                setLoading(false)
            })
            .catch(() => { setError("Erreur réseau"); setLoading(false) })
    }

    function fetchDeliveryLogs(webhookId: string) {
        if (deliveryLogs[webhookId]) return
        setLoadingLogs(webhookId)
        fetchWithAuth(`${API_URL}/api/webhooks/${webhookId}/deliveries`)
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setDeliveryLogs((prev) => ({ ...prev, [webhookId]: data.deliveries || [] }))
                setLoadingLogs(null)
            })
            .catch(() => setLoadingLogs(null))
    }

    function handleTest(webhookId: string) {
        setTesting(webhookId)
        fetchWithAuth(`${API_URL}/api/webhooks/${webhookId}/test`, {
            method: "POST",
        })
            .then((r) => r.json())
            .then((data) => {
                setTestResult((prev) => ({ ...prev, [webhookId]: { ok: data.ok, message: data.message || (data.ok ? "Test réussi" : "Test échoué") } }))
                setTesting(null)
            })
            .catch(() => {
                setTestResult((prev) => ({ ...prev, [webhookId]: { ok: false, message: "Erreur réseau" } }))
                setTesting(null)
            })
    }

    function handleCreate() {
        if (!formUrl.trim() || formEvents.length === 0) return
        setSaving(true)
        fetchWithAuth(`${API_URL}/api/webhooks`, {
            method: "POST",
            body: JSON.stringify({ url: formUrl, events: formEvents }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) {
                    resetForm()
                    fetchWebhooks()
                }
                setSaving(false)
            })
            .catch(() => setSaving(false))
    }

    function handleDelete(webhookId: string) {
        setDeleting(webhookId)
        fetchWithAuth(`${API_URL}/api/webhooks/${webhookId}`, {
            method: "DELETE",
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.ok) setWebhooks((prev) => prev.filter((w) => w.id !== webhookId))
                setDeleting(null)
            })
            .catch(() => setDeleting(null))
    }

    function resetForm() {
        setShowForm(false)
        setFormUrl("")
        setFormEvents([])
    }

    function toggleEvent(event: string) {
        setFormEvents((prev) =>
            prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
        )
    }

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement webhooks...</p>
        </div>
    )

    if (error && !webhooks.length) return (
        <div style={{ fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: "#c0392b" }}><XCircle size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} /> {error}</p>
        </div>
    )

    return (
        <div style={{ fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 960, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{webhooks.length} webhook{webhooks.length > 1 ? "s" : ""} configuré{webhooks.length > 1 ? "s" : ""}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a href="/admin/dashboard" style={{ padding: "9px 18px", background: C.white, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
                        <button
                            onClick={() => { resetForm(); setShowForm(true) }}
                            style={{ padding: "9px 18px", background: C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                        >
                            <Plus size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} />Nouveau webhook
                        </button>
                    </div>
                </div>

                {/* Create form */}
                {showForm && (
                    <div style={{ background: C.white, borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(58,64,64,0.08)", border: "1px solid " + C.border }}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
                            Nouveau webhook
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>URL de destination</div>
                            <input
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                placeholder="https://example.com/webhook"
                                style={{ width: "100%", padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, backgroundColor: C.bg, color: C.dark, outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Événements</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {EVENT_TYPES.map((event) => {
                                    const selected = formEvents.includes(event)
                                    return (
                                        <button
                                            key={event}
                                            onClick={() => toggleEvent(event)}
                                            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: selected ? "2px solid " + C.dark : "1px solid " + C.border, backgroundColor: selected ? C.yellow : C.white, color: C.dark, cursor: "pointer" }}
                                        >
                                            {event}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={handleCreate}
                                disabled={saving || !formUrl.trim() || formEvents.length === 0}
                                style={{ padding: "10px 20px", background: saving ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
                            >
                                {saving ? "Création..." : "Créer le webhook"}
                            </button>
                            <button
                                onClick={resetForm}
                                style={{ padding: "10px 20px", background: "none", color: C.muted, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                )}

                {/* Webhooks list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {webhooks.map((webhook) => {
                        const isExpanded = expandedId === webhook.id
                        const isDeleting = deleting === webhook.id
                        const isTesting = testing === webhook.id
                        const result = testResult[webhook.id]

                        return (
                            <div key={webhook.id} style={{ background: C.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(58,64,64,0.08)" }}>

                                {/* Row */}
                                <div
                                    onClick={() => { const next = isExpanded ? null : webhook.id; setExpandedId(next); if (next) fetchDeliveryLogs(next) }}
                                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                                                {webhook.url}
                                            </span>
                                            <span style={{
                                                padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                                                backgroundColor: webhook.is_active ? "#e8f8ee" : "#f0f0ee",
                                                color: webhook.is_active ? "#1a7a3c" : "#7a8080",
                                                border: "1px solid " + (webhook.is_active ? "#a8dbb8" : "#e0e0de"),
                                            }}>
                                                {webhook.is_active ? "Actif" : "Inactif"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: C.muted }}>
                                            {webhook.events?.join(", ") || "—"}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 18, color: C.muted }}>{isExpanded ? "▲" : "▼"}</div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid " + C.border, padding: 20 }}>

                                        {/* Details */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", marginBottom: 20, backgroundColor: C.bg, borderRadius: 12, padding: 16 }}>
                                            {[
                                                { label: "URL", val: webhook.url },
                                                { label: "Secret", val: webhook.secret ? "••••••" + webhook.secret.slice(-4) : "Auto-généré" },
                                                { label: "Créé le", val: formatDate(webhook.created_at) },
                                            ].map((item, idx) => (
                                                <div key={idx}>
                                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{item.label}</div>
                                                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, wordBreak: "break-all" }}>{item.val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Events */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                                                Événements surveillés
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {(webhook.events || []).map((event) => (
                                                    <span key={event} style={{ padding: "4px 12px", backgroundColor: C.bg, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12, color: C.dark, fontWeight: 500 }}>
                                                        {event}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Test result */}
                                        {result && (
                                            <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, backgroundColor: result.ok ? "#e8f8ee" : "#fde8e8", border: "1px solid " + (result.ok ? "#a8dbb8" : "#f5c6c6"), fontSize: 13, color: result.ok ? "#1a7a3c" : "#c0392b", fontWeight: 600 }}>
                                                {result.ok ? "✓" : "✗"} {result.message}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                                            <button
                                                onClick={() => handleTest(webhook.id)}
                                                disabled={isTesting}
                                                style={{ padding: "9px 18px", background: isTesting ? C.muted : C.yellow, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isTesting ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center" }}
                                            >
                                                {isTesting ? <><Clock size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} />Test...</> : <><Zap size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} />Tester</>}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(webhook.id)}
                                                disabled={isDeleting}
                                                style={{ padding: "9px 18px", background: isDeleting ? C.muted : "#fde8e8", color: "#c0392b", border: "1px solid #f5c6c6", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isDeleting ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center" }}
                                            >
                                                {isDeleting ? "Suppression..." : <><Trash2 size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:4}} />Supprimer</>}
                                            </button>
                                        </div>

                                        {/* Delivery logs */}
                                        <div>
                                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                                                Historique de livraison
                                            </div>
                                            {loadingLogs === webhook.id ? (
                                                <div style={{ fontSize: 13, color: C.muted }}>Chargement...</div>
                                            ) : deliveryLogs[webhook.id]?.length ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                    {deliveryLogs[webhook.id].map((log) => (
                                                        <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", backgroundColor: C.bg, borderRadius: 8, border: "1px solid " + C.border }}>
                                                            <DeliveryStatusBadge status={log.status} />
                                                            <span style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>{log.event_type}</span>
                                                            <span style={{ fontSize: 12, color: C.muted }}>HTTP {log.status_code}</span>
                                                            <span style={{ fontSize: 12, color: C.muted }}>{log.response_time_ms}ms</span>
                                                            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
                                                                {new Date(log.created_at).toLocaleDateString("fr-FR")} {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 13, color: C.muted }}>Aucune livraison enregistrée</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {webhooks.length === 0 && !showForm && (
                        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                            Aucun webhook configuré
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
