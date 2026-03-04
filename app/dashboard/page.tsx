"use client"
import { Suspense } from "react"
import Dashboard from "@/components/Dashboard"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}>Chargement...</div>}>
                <Dashboard />
            </Suspense>
        </AuthGuard>
    )
}
