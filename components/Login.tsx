"use client"

import * as React from "react"
import { C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"

const { useState } = React

export default function Login() {
    const { login, signup } = useAuth()
    const [mode, setMode] = useState<"login" | "signup">("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit() {
        setError("")
        if (!email || !password) { setError("Email et mot de passe obligatoires"); return }
        if (mode === "signup" && (!firstName || !lastName)) { setError("Prénom et nom obligatoires"); return }

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

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleSubmit()
    }

    const inputStyle = {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid " + C.border,
        borderRadius: 10,
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
                borderRadius: 16,
                padding: 40,
                boxShadow: "0 4px 24px rgba(58,64,64,0.10)",
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
                        fontSize: 22,
                    }}>
                        🖨
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>La Fab</h1>
                    <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                        {mode === "login" ? "Connectez-vous à votre espace" : "Créez votre compte"}
                    </p>
                </div>

                {/* Tabs login / signup */}
                <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" }}>
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
                                placeholder="Prénom"
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
                        ✗ {error}
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
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "⏳ Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
                </button>

            </div>
        </div>
    )
}
