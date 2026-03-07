"use client"

import { useAuth } from "@/components/AuthProvider"
import Landing from "@/components/Landing"

function redirectForRole(role: string): string {
    if (role === "admin") return "/admin/dashboard"
    if (role === "supplier") return "/supplier/dashboard"
    return "/dashboard"
}

export default function Home() {
    const { user, isLoading, isAuthenticated } = useAuth()

    if (isLoading) return null

    if (isAuthenticated && user) {
        window.location.href = redirectForRole(user.role)
        return null
    }

    return <Landing />
}
