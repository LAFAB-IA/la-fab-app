"use client"

import React from "react"
import { useAuth } from "@/components/AuthProvider"
import { C } from "@/lib/constants"

const ALLOWED_EMAILS = [
    "yannis-93290@hotmail.fr",
    "guillaume.bourdon.pro@gmail.com",
]

const ROLES = [
    { key: "admin", label: "Admin" },
    { key: "client", label: "Client" },
    { key: "supplier", label: "Fournisseur" },
] as const

function redirectForRole(role: string): string {
    switch (role) {
        case "admin": return "/admin/dashboard"
        case "supplier": return "/supplier/dashboard"
        default: return "/dashboard"
    }
}

export default function RoleSwitcher() {
    const { user, isAuthenticated } = useAuth()

    if (!isAuthenticated || !user) return null
    if (!ALLOWED_EMAILS.includes(user.email)) return null

    const currentRole = user.role

    function handleSwitch(role: string) {
        if (role === currentRole) return
        localStorage.setItem("role_override", role)
        window.location.href = redirectForRole(role)
    }

    return (
        <div style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 9999,
            display: "flex",
            gap: 4,
            padding: 4,
            backgroundColor: "rgba(0,0,0,0.85)",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            fontFamily: "Inter, sans-serif",
        }}>
            {ROLES.map((r) => (
                <button
                    key={r.key}
                    onClick={() => handleSwitch(r.key)}
                    style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 7,
                        cursor: currentRole === r.key ? "default" : "pointer",
                        backgroundColor: currentRole === r.key ? C.yellow : "transparent",
                        color: currentRole === r.key ? "#000000" : "rgba(255,255,255,0.7)",
                        transition: "all 0.15s ease",
                    }}
                >
                    {r.label}
                </button>
            ))}
        </div>
    )
}
