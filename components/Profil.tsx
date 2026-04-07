"use client"

import React, { useCallback, useEffect, useState, useRef } from "react"
import { User, Mail, Phone, Lock, MapPin, Camera, TrendingUp, Package, ChevronRight, Eye, EyeOff, Check, XCircle } from "lucide-react"
import { API_URL, C } from "@/lib/constants"
import { getToken } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/components/AuthProvider"

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
        <div className="bg-[#FAFFFD] rounded-2xl p-7 border border-[#e0e0de] mb-4">
            <div className="flex items-center gap-[10px] mb-6">
                <div className="text-black">{icon}</div>
                <h2 className="text-[15px] font-bold text-black m-0">{title}</h2>
            </div>
            {children}
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <label className="block text-[11px] font-bold text-[#7a8080] uppercase tracking-[1px] mb-2">
                {label}
            </label>
            {children}
        </div>
    )
}

// Base input class — apply padding variant per use site
const inputBase = "w-full py-[11px] rounded-[10px] border border-[#e0e0de] text-sm text-black bg-[#f0f0ee] outline-none font-[inherit] box-border"

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
    const [error, setError] = useState("")

    // Mot de passe
    const [currentPwd, setCurrentPwd] = useState("")
    const [newPwd, setNewPwd] = useState("")
    const [confirmPwd, setConfirmPwd] = useState("")
    const [showCurrentPwd, setShowCurrentPwd] = useState(false)
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [showConfirmPwd, setShowConfirmPwd] = useState(false)
    const [pwdLoading, setPwdLoading] = useState(false)
    const [pwdError, setPwdError] = useState("")
    const [pwdSaved, setPwdSaved] = useState(false)

    // Password validation rules
    const pwdRules = [
        { label: "8 caracteres minimum", valid: newPwd.length >= 8 },
        { label: "1 majuscule", valid: /[A-Z]/.test(newPwd) },
        { label: "1 chiffre", valid: /\d/.test(newPwd) },
        { label: "1 caractere special", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPwd) },
    ]
    const pwdValidCount = pwdRules.filter(r => r.valid).length
    const pwdAllValid = pwdValidCount === 4
    const pwdStrengthColor = pwdValidCount < 2 ? "#c0392b" : pwdValidCount < 4 ? "#e67e22" : "#1a7a3c"

    // Provider (Google OAuth etc.)
    const { user: authUser } = useAuth()
    const [provider, setProvider] = useState<string>("email")
    const isGoogleUser =
        authUser?.provider === "google" ||
        (authUser as any)?.app_metadata?.provider === "google" ||
        provider === "google"

    // Autosave
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string; visible: boolean } | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // Autosave debounce: 1500ms after last profile change
    const profileRef = useRef(profile)
    profileRef.current = profile
    useEffect(() => {
        if (!isDirty || !originalProfile) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            doSaveProfile(profileRef.current)
        }, 1500)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [isDirty, profile]) // eslint-disable-line react-hooks/exhaustive-deps

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
                        first_name:  u.firstName   || u.first_name  || "",
                        last_name:   u.lastName    || u.last_name   || "",
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

    function showToast(type: "success" | "error", message: string) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ type, message, visible: true })
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => prev ? { ...prev, visible: false } : null)
            setTimeout(() => setToast(null), 400)
        }, 2500)
    }

    function doSaveProfile(p: ProfileData, isRetry = false) {
        const token = getToken()
        if (!token) return
        setSaving(true)
        setError("")

        const body = {
            firstName: p.first_name,
            lastName: p.last_name,
            email: p.email,
            phone: p.phone,
            address: p.address,
            city: p.city,
            postal_code: p.postal_code,
        }
        console.log("[PROFIL] save request body:", body)

        fetchWithAuth(`${API_URL}/api/auth/profile`, {
            method: "PATCH",
            body: JSON.stringify(body),
        })
            .then(async r => {
                console.log("[PROFIL] save response:", r.status, r.statusText)
                const data = await r.clone().json()
                console.log("[PROFIL] save body:", data)
                if (data.ok) {
                    setIsDirty(false)
                    setOriginalProfile({ ...p })
                    showToast("success", "Modifications enregistrees")
                } else {
                    const msg = data.message || data.error || data.code || "Echec de l'enregistrement"
                    setError(msg)
                    if (!isRetry) {
                        showToast("error", "Echec de l'enregistrement — reessai dans 3s")
                        retryRef.current = setTimeout(() => doSaveProfile(p, true), 3000)
                    } else {
                        showToast("error", "Echec de l'enregistrement")
                    }
                }
                setSaving(false)
            })
            .catch((err) => {
                console.error("[PROFIL] save error:", err)
                setSaving(false)
                if (!isRetry) {
                    showToast("error", "Echec de l'enregistrement — reessai dans 3s")
                    retryRef.current = setTimeout(() => doSaveProfile(p, true), 3000)
                } else {
                    showToast("error", "Echec de l'enregistrement")
                }
            })
    }

    function handleChangePassword() {
        if (!pwdAllValid) { setPwdError("Le mot de passe ne respecte pas toutes les regles"); return }
        if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas"); return }
        const token = getToken()
        if (!token) return
        setPwdLoading(true)
        setPwdError("")

        fetchWithAuth(`${API_URL}/api/auth/change-password`, {
            method: "POST",
            body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
        })
            .then(async r => {
                console.log("[PROFIL] password response:", r.status, r.statusText)
                const data = await r.json()
                console.log("[PROFIL] password body:", data)
                if (data.ok) {
                    setPwdSaved(true)
                    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
                    setTimeout(() => setPwdSaved(false), 3000)
                } else {
                    setPwdError(data.message || "Echec du changement de mot de passe")
                }
                setPwdLoading(false)
            })
            .catch((err) => { console.error("[PROFIL] password error:", err); setPwdError("Erreur reseau"); setPwdLoading(false) })
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
        <div className="w-full min-h-screen flex items-center justify-center bg-[#f0f0ee] font-[Inter,_sans-serif]">
            <p className="text-[#7a8080]">Chargement...</p>
        </div>
    )

    return (
        <div className="w-full min-h-screen bg-[#f0f0ee] font-[Inter,_sans-serif] px-5 py-10 box-border">
            <div className="max-w-[680px] mx-auto">

                {/* Header */}
                <div className="mb-7">
                    <a href="/projets" className="text-[#7a8080] text-[13px] no-underline font-medium flex items-center gap-1 mb-4">
                        <ChevronRight size={14} className="-rotate-180" /> Mes projets
                    </a>
                    <h1 className="text-[24px] font-bold text-black m-0">Mon profil</h1>
                    <p className="text-[#7a8080] text-sm mt-1 m-0">Gérez vos informations personnelles</p>
                </div>

                {/* ── Avatar ── */}
                <Section title="Photo de profil" icon={<Camera size={18} />}>
                    <div className="profil-avatar-row flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-[#F4CF15] flex items-center justify-center overflow-hidden border-[3px] border-[#e0e0de]">
                                {avatarPreview
                                    ? <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                                    : <span className="text-[28px] font-bold text-black">
                                        {profile.first_name?.[0]?.toUpperCase() || "?"}
                                    </span>
                                }
                            </div>
                            {avatarLoading && (
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                    <span className="text-xs text-white">...</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-base font-bold text-black mb-1">
                                {profile.first_name} {profile.last_name}
                            </div>
                            <div className="text-[13px] text-[#7a8080] mb-3">{profile.email}</div>
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="px-4 py-2 bg-[#f0f0ee] text-black border border-[#e0e0de] rounded-lg text-[13px] font-semibold cursor-pointer flex items-center gap-1.5"
                            >
                                <Camera size={14} /> Changer la photo
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>
                    </div>
                    {avatarError && (
                        <div className="mt-3 px-3 py-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[13px] text-[#991b1b]">
                            {avatarError}
                        </div>
                    )}
                </Section>

                {/* ── Infos personnelles ── */}
                <Section title="Informations personnelles" icon={<User size={18} />}>
                    <div className="profil-grid-2col grid grid-cols-2 gap-x-5">
                        <Field label="Prénom">
                            <input className={`${inputBase} px-[14px]`} value={profile.first_name} onChange={e => updateProfile(p => ({ ...p, first_name: e.target.value }))} placeholder="Prénom" />
                        </Field>
                        <Field label="Nom">
                            <input className={`${inputBase} px-[14px]`} value={profile.last_name} onChange={e => updateProfile(p => ({ ...p, last_name: e.target.value }))} placeholder="Nom" />
                        </Field>
                    </div>
                    <Field label="Email">
                        <div className="relative">
                            <Mail size={15} className="absolute left-3 top-3 text-[#7a8080]" />
                            <input className={`${inputBase} pl-9 pr-[14px]`} value={profile.email} onChange={e => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.fr" />
                        </div>
                    </Field>
                    <Field label="Téléphone">
                        <div className="relative">
                            <Phone size={15} className="absolute left-3 top-3 text-[#7a8080]" />
                            <input className={`${inputBase} pl-9 pr-[14px]`} value={profile.phone} onChange={e => updateProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+33 6 00 00 00 00" autoComplete="tel" />
                        </div>
                    </Field>
                </Section>

                {/* ── Adresse ── */}
                <Section title="Adresse" icon={<MapPin size={18} />}>
                    <Field label="Adresse">
                        <input className={`${inputBase} px-[14px]`} value={profile.address} onChange={e => updateProfile(p => ({ ...p, address: e.target.value }))} placeholder="Rue, numéro..." />
                    </Field>
                    <div className="profil-grid-2col grid grid-cols-2 gap-x-5">
                        <Field label="Ville">
                            <input className={`${inputBase} px-[14px]`} value={profile.city} onChange={e => updateProfile(p => ({ ...p, city: e.target.value }))} placeholder="Paris" />
                        </Field>
                        <Field label="Code postal">
                            <input className={`${inputBase} px-[14px]`} value={profile.postal_code} onChange={e => updateProfile(p => ({ ...p, postal_code: e.target.value }))} placeholder="75001" />
                        </Field>
                    </div>
                </Section>

                {error && <div className="mb-3 px-4 py-[10px] bg-[#fee] border border-[#f5c6c6] rounded-[10px] text-[13px] text-[#c0392b]">✗ {error}</div>}

                {/* ── Mot de passe ── */}
                {isGoogleUser ? (
                    <Section title="Mot de passe" icon={<Lock size={18} />}>
                        <p className="text-[#7a8080] text-[13px] m-0 font-medium">
                            Vous êtes connecté via Google — la modification du mot de passe n'est pas disponible.
                        </p>
                    </Section>
                ) : (
                    <Section title="Mot de passe" icon={<Lock size={18} />}>
                        <Field label="Mot de passe actuel">
                            <div className="relative">
                                <input type={showCurrentPwd ? "text" : "password"} className={`${inputBase} px-[14px] pr-10`} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                                <button onClick={() => setShowCurrentPwd(s => !s)} className="absolute right-3 top-[11px] bg-transparent border-none cursor-pointer text-[#7a8080]">
                                    {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        <Field label="Nouveau mot de passe">
                            <div className="relative">
                                <input type={showNewPwd ? "text" : "password"} className={`${inputBase} px-[14px] pr-10`} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 caracteres" autoComplete="new-password" />
                                <button onClick={() => setShowNewPwd(s => !s)} className="absolute right-3 top-[11px] bg-transparent border-none cursor-pointer text-[#7a8080]">
                                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        {/* Password rules */}
                        {newPwd.length > 0 && (
                            <div className="mb-4">
                                <div className="flex gap-1 mb-[10px] h-1 rounded-sm overflow-hidden">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="flex-1 rounded-sm transition-colors duration-200" style={{ backgroundColor: i < pwdValidCount ? pwdStrengthColor : C.border }} />
                                    ))}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {pwdRules.map(r => (
                                        <div key={r.label} className="flex items-center gap-1.5 text-xs" style={{ color: r.valid ? "#1a7a3c" : "#c0392b" }}>
                                            {r.valid ? <Check size={12} /> : <XCircle size={12} />}
                                            {r.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Field label="Confirmer">
                            <div className="relative">
                                <input type={showConfirmPwd ? "text" : "password"} className={`${inputBase} px-[14px] pr-10`} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeter" autoComplete="new-password" />
                                <button onClick={() => setShowConfirmPwd(s => !s)} className="absolute right-3 top-[11px] bg-transparent border-none cursor-pointer text-[#7a8080]">
                                    {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                            <div className="mb-3 text-xs text-[#c0392b] flex items-center gap-1">
                                <XCircle size={12} /> Les mots de passe ne correspondent pas
                            </div>
                        )}
                        {pwdError && <div className="mb-3 text-[13px] text-[#c0392b]">{pwdError}</div>}
                        {pwdSaved && <div className="mb-3 text-[13px] text-[#1a7a3c] font-semibold">Mot de passe modifie</div>}
                        <button
                            onClick={handleChangePassword}
                            disabled={pwdLoading || !currentPwd || !pwdAllValid || !confirmPwd || newPwd !== confirmPwd}
                            className="px-5 py-[10px] text-[#FAFFFD] border-none rounded-lg text-[13px] font-bold"
                            style={{ backgroundColor: (pwdLoading || !pwdAllValid) ? C.muted : C.dark, cursor: (pwdLoading || !pwdAllValid) ? "not-allowed" : "pointer" }}
                        >
                            {pwdLoading ? "Modification..." : "Modifier le mot de passe"}
                        </button>
                    </Section>
                )}

                {/* ── Volume commandes ── */}
                <Section title="Volume de commandes — 3 derniers mois" icon={<TrendingUp size={18} />}>
                    {stats.every(s => s.count === 0) ? (
                        <div className="text-center py-6 text-[#7a8080] text-sm">
                            <Package size={32} className="mb-2 opacity-40" />
                            <p className="m-0">Aucune commande sur cette période</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {stats.map((s) => (
                                <div key={s.month}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <div className="text-[13px] font-semibold text-black capitalize">{s.month}</div>
                                            <div className="text-xs text-[#7a8080]">{s.count} commande{s.count > 1 ? "s" : ""}</div>
                                        </div>
                                        <div className="text-[15px] font-bold text-black">{formatPrice(s.total)}</div>
                                    </div>
                                    <div className="h-2 bg-[#e0e0de] rounded overflow-hidden">
                                        <div
                                            className="h-full rounded transition-[width] duration-[600ms] ease-in-out"
                                            style={{ width: `${(s.total / maxTotal) * 100}%`, backgroundColor: s.total > 0 ? C.yellow : C.border }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="border-t border-[#e0e0de] pt-3.5 flex justify-between items-center">
                                <div className="text-[13px] text-[#7a8080] font-semibold">Total 3 mois</div>
                                <div className="text-lg font-bold text-black">{formatPrice(stats.reduce((a, s) => a + s.total, 0))}</div>
                            </div>
                        </div>
                    )}
                </Section>

            </div>

            {/* ── Toast autosave ── */}
            {toast && (
                <div
                    className="profil-toast fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.25)] pointer-events-none"
                    style={{
                        backgroundColor: toast.type === "success" ? "#000" : "#c0392b",
                        opacity: toast.visible ? 1 : 0,
                        transition: "opacity 0.35s ease",
                    }}
                >
                    {toast.type === "success" && <Check size={16} />}
                    {toast.message}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .profil-grid-2col { grid-template-columns: 1fr !important; }
                    .profil-avatar-row { flex-direction: column; align-items: flex-start !important; }
                    .profil-toast {
                        left: 12px !important;
                        right: 12px !important;
                        bottom: 16px !important;
                        transform: none !important;
                        border-radius: 8px !important;
                        justify-content: center;
                    }
                }
                @media (max-width: 375px) {
                    .profil-toast { left: 0 !important; right: 0 !important; bottom: 0 !important; border-radius: 0 !important; }
                }
            `}</style>
        </div>
    )
}
