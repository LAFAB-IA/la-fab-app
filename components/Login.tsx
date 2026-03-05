"use client"

import * as React from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { Printer, Clock } from "lucide-react"

const { useState } = React

export default function Login() {
    const { login, signup } = useAuth()
    const [mode, setMode] = useState<"login" | "signup">("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null)
    const [error, setError] = useState("")

    async function handleSubmit() {
        setError("")
        if (!email || !password) { setError("Email et mot de passe obligatoires"); return }
        if (mode === "signup" && (!firstName || !lastName)) { setError("Prenom et nom obligatoires"); return }

        setLoading(true)
        try {
            if (mode === "login") {
                await login(email, password)
            } else {
                await signup(email, password, firstName, lastName)
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erreur inattendue")
            setLoading(false)
        }
    }

    async function handleOAuth(provider: "google" | "apple") {
        setOauthLoading(provider)
        setError("")
        try {
            const res = await fetch(`${API_URL}/api/auth/oauth/${provider}`)
            const data = await res.json()
            if (data.ok && data.url) {
                window.location.href = data.url
                return
            }
            setError("Impossible d'initier la connexion")
        } catch {
            setError("Erreur réseau")
        }
        setOauthLoading(null)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleSubmit()
    }

    const inputStyle = {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid " + C.border,
        borderRadius: 8,
        fontSize: 14,
        color: C.dark,
        backgroundColor: C.white,
        outline: "none",
        boxSizing: "border-box" as const,
        fontFamily: "Inter, sans-serif",
    }

    return (
        <div style={{
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.bg,
            fontFamily: "Inter, sans-serif",
            padding: 20,
            boxSizing: "border-box",
        }}>
            <div style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: C.white,
                borderRadius: 12,
                padding: 40,
                boxShadow: "0 1px 3px rgba(58,64,64,0.08)",
            }}>

                {/* Logo / titre */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        backgroundColor: C.yellow,
                        borderRadius: 12,
                        margin: "0 auto 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <Printer size={22} />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: C.dark, margin: "0 0 6px" }}>LA FAB</h1>
                    <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                        {mode === "login" ? "Connectez-vous a votre espace" : "Creez votre compte"}
                    </p>
                </div>

                {/* Tabs login / signup */}
                <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden" }}>
                    {(["login", "signup"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError("") }}
                            style={{
                                flex: 1,
                                padding: "10px",
                                border: "none",
                                background: mode === m ? C.dark : C.white,
                                color: mode === m ? C.white : C.muted,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            {m === "login" ? "Connexion" : "Inscription"}
                        </button>
                    ))}
                </div>

                {/* Champs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {mode === "signup" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Prenom"
                                style={inputStyle}
                            />
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nom"
                                style={inputStyle}
                            />
                        </div>
                    )}
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Email"
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Mot de passe"
                        style={inputStyle}
                    />
                </div>

                {/* Erreur */}
                {error && (
                    <div style={{ marginTop: 12, padding: "10px 14px", backgroundColor: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: 8, fontSize: 13, color: "#c0392b" }}>
                        {error}
                    </div>
                )}

                {/* Bouton */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: "100%",
                        marginTop: 20,
                        padding: "13px",
                        background: loading ? C.muted : C.yellow,
                        color: C.dark,
                        border: "none",
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? <><Clock size={14} style={{display:"inline-block",verticalAlign:"middle",marginRight:6}} />Chargement...</> : mode === "login" ? "Se connecter" : "Creer mon compte"}
                </button>

                {/* Separator */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                    <span style={{ fontSize: 12, color: C.muted }}>ou</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </div>

                {/* Google */}
                <button
                    onClick={() => handleOAuth("google")}
                    disabled={!!oauthLoading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: C.white,
                        color: C.dark,
                        border: "1px solid " + C.border,
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: oauthLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        fontFamily: "Inter, sans-serif",
                        marginBottom: 12,
                    }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = C.yellow) }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = C.border) }}
                >
                    {oauthLoading === "google" ? (
                        <Clock size={16} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    )}
                    Continuer avec Google
                </button>

                {/* Apple */}
                <button
                    onClick={() => handleOAuth("apple")}
                    disabled={!!oauthLoading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: oauthLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    {oauthLoading === "apple" ? (
                        <Clock size={16} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                    )}
                    Continuer avec Apple
                </button>

                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

            </div>
        </div>
    )
}
