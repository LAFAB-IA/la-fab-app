"use client"

import React, { useCallback, useEffect, useState, useRef } from "react"
import { User, Mail, Phone, Lock, MapPin, Camera, TrendingUp, Package, ChevronRight, Eye, EyeOff } from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { getToken } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
    avatar_url?: string
}

interface MonthStats {
    month: string
    total: number
    count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div style={{ backgroundColor: "#FAFFFD", borderRadius: 16, padding: "28px 28px", border: "1px solid " + C.border, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ color: C.dark }}>{icon}</div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: 0 }}>{title}</h2>
            </div>
            {children}
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {label}
            </label>
            {children}
        </div>
    )
}

const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid " + C.border,
    fontSize: 14,
    color: C.dark,
    backgroundColor: C.bg,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
}

// ─── Profil ───────────────────────────────────────────────────────────────────

export default function Profil() {
    const [profile, setProfile] = useState<ProfileData>({
        first_name: "", last_name: "", email: "",
        phone: "", address: "", city: "", postal_code: "",
    })
    const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState("")

    // Mot de passe
    const [currentPwd, setCurrentPwd] = useState("")
    const [newPwd, setNewPwd] = useState("")
    const [confirmPwd, setConfirmPwd] = useState("")
    const [showPwd, setShowPwd] = useState(false)
    const [pwdLoading, setPwdLoading] = useState(false)
    const [pwdError, setPwdError] = useState("")
    const [pwdSaved, setPwdSaved] = useState(false)

    // Provider (Google OAuth etc.)
    const [provider, setProvider] = useState<string>("email")
    const isOAuthUser = provider !== "email"

    // Avatar
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarLoading, setAvatarLoading] = useState(false)
    const [avatarError, setAvatarError] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const updateProfile = useCallback((updater: (prev: ProfileData) => ProfileData) => {
        setProfile(prev => {
            const next = updater(prev)
            setIsDirty(JSON.stringify(next) !== JSON.stringify(originalProfile))
            return next
        })
    }, [originalProfile])

    // Stats commandes
    const [stats, setStats] = useState<MonthStats[]>([])

    useEffect(() => {
        const token = getToken()
        if (!token) { setLoading(false); return }

        // Profil
        fetchWithAuth(`${API_URL}/api/auth/me`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.user) {
                    const u = data.user
                    const loaded: ProfileData = {
                        first_name:  u.first_name  || "",
                        last_name:   u.last_name   || "",
                        email:       u.email       || "",
                        phone:       u.phone       || "",
                        address:     u.address     || "",
                        city:        u.city        || "",
                        postal_code: u.postal_code || "",
                        avatar_url:  u.avatar_url,
                    }
                    setProfile(loaded)
                    setOriginalProfile(loaded)
                    if (u.avatar_url) setAvatarPreview(u.avatar_url)
                    if (u.provider) setProvider(u.provider)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))

        // Stats 3 derniers mois
        fetchWithAuth(`${API_URL}/api/project?account_id=${localStorage.getItem("account_id") || ""}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.projects) {
                    const months: Record<string, MonthStats> = {}
                    const now = new Date()

                    for (let i = 2; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                        const key = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                        months[key] = { month: key, total: 0, count: 0 }
                    }

                    data.projects.forEach((p: any) => {
                        const d = new Date(p.created_at)
                        const key = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                        if (months[key]) {
                            months[key].total += p.pricing?.total_net || 0
                            months[key].count += 1
                        }
                    })

                    setStats(Object.values(months))
                }
            })
            .catch(() => {})
    }, [])

    function handleSaveProfile() {
        const token = getToken()
        if (!token) return
        setSaving(true)
        setError("")

        fetchWithAuth(`${API_URL}/api/auth/profile`, {
            method: "PATCH",
            body: JSON.stringify({
                firstName: profile.first_name,
                lastName: profile.last_name,
                email: profile.email,
                phone: profile.phone,
                address: profile.address,
                city: profile.city,
                postal_code: profile.postal_code,
            }),
        })
            .then(r => r.json())
            .then(data => {
                console.log("[PROFILE_SAVE]", data)
                if (data.ok) {
                    setSaved(true)
                    setIsDirty(false)
                    setOriginalProfile({ ...profile })
                    setTimeout(() => setSaved(false), 3000)
                } else {
                    setError(data.message || data.code || "Échec de la sauvegarde")
                }
                setSaving(false)
            })
            .catch((err) => { console.error("[PROFILE_SAVE_ERR]", err); setError("Erreur réseau"); setSaving(false) })
    }

    function handleChangePassword() {
        if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas"); return }
        if (newPwd.length < 8)    { setPwdError("Minimum 8 caractères"); return }
        const token = getToken()
        if (!token) return
        setPwdLoading(true)
        setPwdError("")

        fetchWithAuth(`${API_URL}/api/auth/change-password`, {
            method: "POST",
            body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    setPwdSaved(true)
                    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
                    setTimeout(() => setPwdSaved(false), 3000)
                } else {
                    setPwdError(data.message || "Échec du changement de mot de passe")
                }
                setPwdLoading(false)
            })
            .catch(() => { setPwdError("Erreur réseau"); setPwdLoading(false) })
    }

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setAvatarPreview(reader.result as string)
        reader.readAsDataURL(file)

        const token = getToken()
        if (!token) return
        setAvatarLoading(true)
        setAvatarError(null)

        const form = new FormData()
        form.append("avatar", file)

        fetchWithAuth(`${API_URL}/api/auth/avatar`, {
            method: "POST",
            body: form,
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then((data) => {
                if (data.ok && data.avatar_url) {
                    setAvatarPreview(data.avatar_url)
                    window.dispatchEvent(new Event("avatar-updated"))
                    localStorage.setItem("avatar_updated", Date.now().toString())
                } else {
                    setAvatarError(data.error || data.message || "Échec de l'upload")
                }
                setAvatarLoading(false)
            })
            .catch(() => {
                setAvatarError("Erreur réseau")
                setAvatarLoading(false)
            })
    }

    const maxTotal = Math.max(...stats.map(s => s.total), 1)

    if (loading) return (
        <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "Inter, sans-serif" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
        </div>
    )

    return (
        <div style={{ width: "100%", minHeight: "100vh", backgroundColor: C.bg, fontFamily: "Inter, sans-serif", padding: "40px 20px", boxSizing: "border-box", paddingBottom: 100 }}>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <a href="/projets" style={{ color: C.muted, fontSize: 13, textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
                        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Mes projets
                    </a>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Mon profil</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>Gérez vos informations personnelles</p>
                </div>

                {/* ── Avatar ── */}
                <Section title="Photo de profil" icon={<Camera size={18} />}>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        <div style={{ position: "relative" }}>
                            <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid " + C.border }}>
                                {avatarPreview
                                    ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
                                    : <span style={{ fontSize: 28, fontWeight: 700, color: C.dark }}>
                                        {profile.first_name?.[0]?.toUpperCase() || "?"}
                                    </span>
                                }
                            </div>
                            {avatarLoading && (
                                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: 12, color: "#fff" }}>...</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                                {profile.first_name} {profile.last_name}
                            </div>
                            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{profile.email}</div>
                            <button
                                onClick={() => fileRef.current?.click()}
                                style={{ padding: "8px 16px", backgroundColor: C.bg, color: C.dark, border: "1px solid " + C.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <Camera size={14} /> Changer la photo
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                        </div>
                    </div>
                    {avatarError && (
                        <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#991b1b" }}>
                            {avatarError}
                        </div>
                    )}
                </Section>

                {/* ── Infos personnelles ── */}
                <Section title="Informations personnelles" icon={<User size={18} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                        <Field label="Prénom">
                            <input style={inputStyle} value={profile.first_name} onChange={e => updateProfile(p => ({ ...p, first_name: e.target.value }))} placeholder="Prénom" />
                        </Field>
                        <Field label="Nom">
                            <input style={inputStyle} value={profile.last_name} onChange={e => updateProfile(p => ({ ...p, last_name: e.target.value }))} placeholder="Nom" />
                        </Field>
                    </div>
                    <Field label="Email">
                        <div style={{ position: "relative" }}>
                            <Mail size={15} style={{ position: "absolute", left: 12, top: 12, color: C.muted }} />
                            <input style={{ ...inputStyle, paddingLeft: 36 }} value={profile.email} onChange={e => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.fr" />
                        </div>
                    </Field>
                    <Field label="Téléphone">
                        <div style={{ position: "relative" }}>
                            <Phone size={15} style={{ position: "absolute", left: 12, top: 12, color: C.muted }} />
                            <input style={{ ...inputStyle, paddingLeft: 36 }} value={profile.phone} onChange={e => updateProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+33 6 00 00 00 00" />
                        </div>
                    </Field>
                </Section>

                {/* ── Adresse ── */}
                <Section title="Adresse" icon={<MapPin size={18} />}>
                    <Field label="Adresse">
                        <input style={inputStyle} value={profile.address} onChange={e => updateProfile(p => ({ ...p, address: e.target.value }))} placeholder="Rue, numéro..." />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                        <Field label="Ville">
                            <input style={inputStyle} value={profile.city} onChange={e => updateProfile(p => ({ ...p, city: e.target.value }))} placeholder="Paris" />
                        </Field>
                        <Field label="Code postal">
                            <input style={inputStyle} value={profile.postal_code} onChange={e => updateProfile(p => ({ ...p, postal_code: e.target.value }))} placeholder="75001" />
                        </Field>
                    </div>
                </Section>

                {error && <div style={{ marginBottom: 12, padding: "10px 16px", backgroundColor: "#fee", border: "1px solid #f5c6c6", borderRadius: 10, fontSize: 13, color: "#c0392b" }}>✗ {error}</div>}

                {/* ── Mot de passe ── */}
                {isOAuthUser ? (
                    <Section title="Mot de passe" icon={<Lock size={18} />}>
                        <p style={{ color: "#888", fontSize: "0.85rem", margin: 0 }}>
                            Compte connecté via {provider.charAt(0).toUpperCase() + provider.slice(1)} — gestion du mot de passe sur votre compte {provider.charAt(0).toUpperCase() + provider.slice(1)}.
                        </p>
                    </Section>
                ) : (
                    <Section title="Mot de passe" icon={<Lock size={18} />}>
                        <Field label="Mot de passe actuel">
                            <div style={{ position: "relative" }}>
                                <input type={showPwd ? "text" : "password"} style={{ ...inputStyle, paddingRight: 40 }} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
                                <button onClick={() => setShowPwd(s => !s)} style={{ position: "absolute", right: 12, top: 11, background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                            <Field label="Nouveau mot de passe">
                                <input type="password" style={inputStyle} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 caractères" />
                            </Field>
                            <Field label="Confirmer">
                                <input type="password" style={inputStyle} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Répéter" />
                            </Field>
                        </div>
                        {pwdError && <div style={{ marginBottom: 12, fontSize: 13, color: "#c0392b" }}>✗ {pwdError}</div>}
                        {pwdSaved && <div style={{ marginBottom: 12, fontSize: 13, color: "#1a7a3c", fontWeight: 600 }}>✓ Mot de passe modifié</div>}
                        <button
                            onClick={handleChangePassword}
                            disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
                            style={{ padding: "10px 20px", backgroundColor: pwdLoading ? C.muted : C.dark, color: C.white, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pwdLoading ? "not-allowed" : "pointer" }}
                        >
                            {pwdLoading ? "Modification..." : "Modifier le mot de passe"}
                        </button>
                    </Section>
                )}

                {/* ── Volume commandes ── */}
                <Section title="Volume de commandes — 3 derniers mois" icon={<TrendingUp size={18} />}>
                    {stats.every(s => s.count === 0) ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 14 }}>
                            <Package size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                            <p style={{ margin: 0 }}>Aucune commande sur cette période</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {stats.map((s) => (
                                <div key={s.month}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, textTransform: "capitalize" }}>{s.month}</div>
                                            <div style={{ fontSize: 12, color: C.muted }}>{s.count} commande{s.count > 1 ? "s" : ""}</div>
                                        </div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{formatPrice(s.total)}</div>
                                    </div>
                                    <div style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${(s.total / maxTotal) * 100}%`, backgroundColor: s.total > 0 ? C.yellow : C.border, borderRadius: 4, transition: "width 0.6s ease" }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ borderTop: "1px solid " + C.border, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Total 3 mois</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>{formatPrice(stats.reduce((a, s) => a + s.total, 0))}</div>
                            </div>
                        </div>
                    )}
                </Section>

            </div>

            {/* ── Fixed bottom save bar ── */}
            {isDirty && (
                <div style={{
                    position: "fixed", bottom: 0, left: 64, right: 0, zIndex: 800,
                    backgroundColor: "#fff", borderTop: "1px solid " + C.border,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 32px", boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
                }}>
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        backgroundColor: C.yellow, color: C.dark,
                        fontWeight: 700, fontSize: 13, borderRadius: 20,
                        padding: "6px 14px",
                    }}>
                        Modifications non sauvegardées
                    </span>
                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        style={{
                            padding: "10px 24px", backgroundColor: C.dark, color: C.white,
                            border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                            cursor: saving ? "not-allowed" : "pointer",
                        }}
                    >
                        {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                    </button>
                </div>
            )}
        </div>
    )
}
