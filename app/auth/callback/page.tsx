"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { API_URL, C } from "@/lib/constants"
import { setToken } from "@/lib/auth"
import { Printer, Loader2 } from "lucide-react"

export default function AuthCallback() {
    const router = useRouter()
    const [error, setError] = useState("")

    useEffect(() => {
        handleCallback()
    }, [])

    async function handleCallback() {
        try {
            // Supabase returns tokens in hash fragment: #access_token=...&refresh_token=...
            const hash = window.location.hash.substring(1)
            const hashParams = new URLSearchParams(hash)
            const accessToken = hashParams.get("access_token")

            if (accessToken) {
                // Direct token from hash — store and fetch user
                setToken(accessToken)
                const meRes = await fetch(`${API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                if (!meRes.ok) throw new Error("PROFILE_FETCH_FAILED")
                const meData = await meRes.json()
                const role = meData.user?.role || "client"
                redirectForRole(role)
                return
            }

            // Fallback: try code exchange via query param
            const urlParams = new URLSearchParams(window.location.search)
            const code = urlParams.get("code")

            if (code) {
                const res = await fetch(`${API_URL}/api/auth/oauth/callback`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                })

                if (!res.ok) throw new Error("CODE_EXCHANGE_FAILED")
                const data = await res.json()

                if (!data.ok || !data.session?.access_token) {
                    throw new Error("NO_SESSION")
                }

                setToken(data.session.access_token)
                const role = data.user?.role || data.user?.user_metadata?.role || "client"

                // Fetch actual role from /me
                const meRes = await fetch(`${API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${data.session.access_token}` },
                })
                if (meRes.ok) {
                    const meData = await meRes.json()
                    redirectForRole(meData.user?.role || role)
                } else {
                    redirectForRole(role)
                }
                return
            }

            // No token and no code
            setError("Aucun paramètre d'authentification trouvé")
            setTimeout(() => router.push("/login"), 3000)
        } catch (e) {
            console.error("[AUTH_CALLBACK_ERROR]", e)
            setError("Erreur lors de la connexion. Redirection...")
            setTimeout(() => router.push("/login"), 3000)
        }
    }

    function redirectForRole(role: string) {
        if (role === "admin") router.push("/admin/dashboard")
        else if (role === "supplier") router.push("/supplier/dashboard")
        else router.push("/projets")
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
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    width: 48,
                    height: 48,
                    backgroundColor: C.yellow,
                    borderRadius: 12,
                    margin: "0 auto 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Printer size={22} />
                </div>

                {error ? (
                    <p style={{ fontSize: 15, color: "#c0392b" }}>{error}</p>
                ) : (
                    <>
                        <Loader2
                            size={28}
                            color={C.dark}
                            style={{ animation: "spin 1s linear infinite", marginBottom: 16 }}
                        />
                        <p style={{ fontSize: 15, fontWeight: 500, color: C.dark, margin: 0 }}>
                            Connexion en cours...
                        </p>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
