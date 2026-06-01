"use client"

import React, { useEffect, useState } from "react"
import { API_URL } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import {
    ShieldCheck, ShieldOff, KeyRound, Loader2, Check, XCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MFAFactor {
    id: string
    friendly_name?: string
    created_at?: string
}

type Phase = "loading" | "disabled" | "enrolling" | "enabled"

// ─── Section card (matches Profil.tsx Section visually) ───────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#FAFFFD] rounded-2xl p-7 border border-[#e0e0de] mb-4">
            <div className="flex items-center gap-[10px] mb-6">
                <ShieldCheck size={18} />
                <h2 className="text-[15px] font-bold text-black m-0">Double authentification</h2>
            </div>
            {children}
        </div>
    )
}

// ─── Confirm unenroll modal ────────────────────────────────────────────────────

function ConfirmModal({
    onConfirm, onCancel, loading,
}: {
    onConfirm: () => void
    onCancel: () => void
    loading: boolean
}) {
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 2000,
                backgroundColor: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
            }}
            onClick={e => { if (e.target === e.currentTarget) onCancel() }}
        >
            <div style={{
                backgroundColor: "var(--c-white)", borderRadius: 16,
                width: "100%", maxWidth: 400, padding: 28,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <ShieldOff size={20} color="var(--status-danger-fg, #c0392b)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-dark)", margin: 0 }}>
                        Désactiver la 2FA ?
                    </h3>
                </div>
                <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                    Votre compte sera moins protégé. Vous pourrez réactiver la double authentification à tout moment.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--c-border)", backgroundColor: "var(--c-bg)", color: "var(--c-dark)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", backgroundColor: "var(--status-danger-bg, #fef2f2)", color: "var(--status-danger-fg, #c0392b)", border: "1px solid var(--status-danger-bd, #fecaca)", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 } as React.CSSProperties}
                    >
                        {loading ? <Loader2 size={14} style={{ animation: "tf2fa-spin 1s linear infinite" }} /> : <ShieldOff size={14} />}
                        Désactiver
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TwoFASkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 14, width: "70%", borderRadius: 6, backgroundColor: "var(--c-bg)", animation: "tf2fa-pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: 14, width: "50%", borderRadius: 6, backgroundColor: "var(--c-bg)", animation: "tf2fa-pulse 1.5s ease-in-out infinite", animationDelay: "0.1s" }} />
            <div style={{ height: 36, width: 200, borderRadius: 8, backgroundColor: "var(--c-bg)", marginTop: 8, animation: "tf2fa-pulse 1.5s ease-in-out infinite", animationDelay: "0.2s" }} />
        </div>
    )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface TwoFactorSectionProps {
    onToast?: (type: "success" | "error", message: string) => void
}

export default function TwoFactorSection({ onToast }: TwoFactorSectionProps) {
    const [phase, setPhase] = useState<Phase>("loading")
    const [factor, setFactor] = useState<MFAFactor | null>(null)
    const [factorId, setFactorId] = useState<string | null>(null)
    const [challengeId, setChallengeId] = useState<string | null>(null)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [secret, setSecret] = useState<string | null>(null)
    const [code, setCode] = useState("")
    const [showSecret, setShowSecret] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)

    // ── Fetch MFA status on mount ────────────────────────────────────────────

    useEffect(() => {
        fetchWithAuth(`${API_URL}/api/auth/mfa/status`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.enrolled && data.factors?.length > 0) {
                    setFactor(data.factors[0])
                    setFactorId(data.factors[0].id)
                    setPhase("enabled")
                } else {
                    setPhase("disabled")
                }
            })
            .catch(() => setPhase("disabled"))
    }, [])

    // ── Enroll: POST /enroll → POST /challenge ───────────────────────────────

    async function handleEnroll() {
        setLoading(true)
        setError("")
        try {
            const enrollData = await fetchWithAuth(`${API_URL}/api/auth/mfa/enroll`, {
                method: "POST",
                body: JSON.stringify({}),
            }).then(r => r.json())

            if (!enrollData.ok) {
                setError("Échec de l'activation. Réessayez.")
                setLoading(false)
                return
            }

            const fid: string = enrollData.factor_id
            setFactorId(fid)
            setQrCode(enrollData.qr_code)
            setSecret(enrollData.secret)

            const challengeData = await fetchWithAuth(`${API_URL}/api/auth/mfa/challenge`, {
                method: "POST",
                body: JSON.stringify({ factor_id: fid }),
            }).then(r => r.json())

            if (!challengeData.ok) {
                setError("Échec de la création du challenge.")
                setLoading(false)
                return
            }

            setChallengeId(challengeData.challenge_id)
            setCode("")
            setPhase("enrolling")
        } catch {
            setError("Erreur réseau.")
        }
        setLoading(false)
    }

    // ── Verify: POST /verify ─────────────────────────────────────────────────

    async function handleVerify() {
        if (code.length !== 6) { setError("Saisissez les 6 chiffres."); return }
        if (!factorId || !challengeId) return
        setLoading(true)
        setError("")
        try {
            const data = await fetchWithAuth(`${API_URL}/api/auth/mfa/verify`, {
                method: "POST",
                body: JSON.stringify({ factor_id: factorId, challenge_id: challengeId, code }),
            }).then(r => r.json())

            if (!data.ok) {
                setError(data.error || "Code invalide. Vérifiez votre application et réessayez.")
                setLoading(false)
                return
            }

            const newFactor: MFAFactor = { id: factorId, created_at: new Date().toISOString() }
            setFactor(newFactor)
            setPhase("enabled")
            setQrCode(null); setSecret(null); setChallengeId(null); setCode("")
            onToast?.("success", "Double authentification activée")
        } catch {
            setError("Erreur réseau.")
        }
        setLoading(false)
    }

    // ── Unenroll: POST /unenroll ─────────────────────────────────────────────

    async function handleUnenroll() {
        if (!factorId) return
        setLoading(true)
        setError("")
        try {
            const data = await fetchWithAuth(`${API_URL}/api/auth/mfa/unenroll`, {
                method: "POST",
                body: JSON.stringify({ factor_id: factorId }),
            }).then(r => r.json())

            if (!data.ok) {
                setError(data.error || "Échec de la désactivation.")
                setLoading(false)
                return
            }

            setPhase("disabled")
            setFactor(null); setFactorId(null); setQrCode(null); setSecret(null)
            setShowConfirm(false)
            onToast?.("success", "Double authentification désactivée")
        } catch {
            setError("Erreur réseau.")
        }
        setLoading(false)
    }

    function handleCodeInput(val: string) {
        setCode(val.replace(/\D/g, "").slice(0, 6))
        setError("")
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <SectionCard>

                {/* ── State C: loading ── */}
                {phase === "loading" && <TwoFASkeleton />}

                {/* ── State A: not enrolled ── */}
                {phase === "disabled" && (
                    <div>
                        <p className="text-[13px] text-[#7a8080] m-0 mb-5 leading-relaxed">
                            La double authentification ajoute une couche de sécurité supplémentaire à votre compte LA FAB. À chaque connexion, vous devrez saisir un code à 6 chiffres généré par votre application d'authentification (Google Authenticator, Authy, etc.).
                        </p>
                        <button
                            onClick={handleEnroll}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-[10px] bg-[#F4CF15] text-black border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        >
                            {loading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <ShieldCheck size={14} />}
                            Activer la double authentification
                        </button>
                        {error && <p className="mt-3 text-[13px] text-[#c0392b] m-0">{error}</p>}
                    </div>
                )}

                {/* ── State A (enrolling): QR code + code entry ── */}
                {phase === "enrolling" && qrCode && (
                    <div>
                        {/* Step 1 — scan QR */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold shrink-0">1</div>
                            <span className="text-[13px] text-black font-semibold">
                                Scannez ce QR code avec Google Authenticator ou Authy
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-3 mb-5">
                            {/* QR code image — backend returns data URI (SVG or base64 PNG) */}
                            <div className="p-3 bg-white border border-[#e0e0de] rounded-xl inline-block">
                                <img src={qrCode} alt="QR code 2FA" width={180} height={180} className="block" />
                            </div>

                            {/* Manual secret fallback */}
                            <button
                                onClick={() => setShowSecret(s => !s)}
                                className="flex items-center gap-1.5 text-[12px] text-[#7a8080] bg-transparent border-none cursor-pointer underline p-0"
                            >
                                <KeyRound size={12} />
                                {showSecret ? "Masquer" : "Afficher"} la clé secrète
                            </button>
                            {showSecret && secret && (
                                <div className="px-3 py-2 bg-[#f0f0ee] border border-[#e0e0de] rounded-lg text-[13px] font-mono text-black tracking-widest text-center select-all">
                                    {secret}
                                </div>
                            )}
                        </div>

                        {/* Step 2 — enter 6-digit code */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold shrink-0">2</div>
                            <span className="text-[13px] text-black font-semibold">
                                Saisissez le code à 6 chiffres généré par l'application
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-3 mb-5">
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={code}
                                onChange={e => handleCodeInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && code.length === 6) handleVerify() }}
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                                className="w-[160px] text-center text-[28px] font-mono font-bold tracking-[0.25em] py-3 px-4 rounded-xl border-2 border-[#e0e0de] bg-[#FAFFFD] text-black outline-none focus:border-black transition-colors"
                            />
                            {error && (
                                <div className="flex items-center gap-1.5 text-[13px] text-[#c0392b]">
                                    <XCircle size={13} /> {error}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => { setPhase("disabled"); setError(""); setCode("") }}
                                className="px-4 py-[9px] bg-[#f0f0ee] text-black border border-[#e0e0de] rounded-lg text-[13px] font-semibold cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleVerify}
                                disabled={loading || code.length !== 6}
                                className="flex items-center gap-2 px-5 py-[9px] bg-black text-white border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                            >
                                {loading
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Check size={14} />}
                                Vérifier et activer
                            </button>
                        </div>
                    </div>
                )}

                {/* ── State B: enrolled ── */}
                {phase === "enabled" && (
                    <div>
                        {/* Active badge */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#e8f8ee] border border-[#a8dbb8] rounded-full">
                                <ShieldCheck size={14} className="text-[#1a7a3c]" />
                                <span className="text-[12px] font-bold text-[#1a7a3c]">Activée</span>
                            </div>
                            <span className="text-[13px] text-[#7a8080]">Votre compte est protégé par la 2FA.</span>
                        </div>

                        {/* Factor info */}
                        {factor && (
                            <div className="mb-5 text-[12px] text-[#7a8080] flex flex-col gap-1">
                                {factor.friendly_name && (
                                    <div>
                                        <span className="font-semibold">Facteur : </span>
                                        {factor.friendly_name}
                                    </div>
                                )}
                                {factor.created_at && (
                                    <div>
                                        <span className="font-semibold">Activé le : </span>
                                        {new Date(factor.created_at).toLocaleDateString("fr-FR", {
                                            day: "numeric", month: "long", year: "numeric",
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Disable button */}
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-[9px] bg-[#fef2f2] text-[#c0392b] border border-[#fecaca] rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        >
                            {loading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <ShieldOff size={14} />}
                            Désactiver la 2FA
                        </button>

                        {error && <p className="mt-3 text-[13px] text-[#c0392b] m-0">{error}</p>}
                    </div>
                )}

            </SectionCard>

            {/* Confirmation modal */}
            {showConfirm && (
                <ConfirmModal
                    onConfirm={handleUnenroll}
                    onCancel={() => { setShowConfirm(false); setError("") }}
                    loading={loading}
                />
            )}

            <style>{`
                @keyframes tf2fa-spin  { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
                @keyframes tf2fa-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
            `}</style>
        </>
    )
}
