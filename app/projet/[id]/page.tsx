"use client"
import { Suspense } from "react"
import ProjectDetail from "@/components/ProjectDetail"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}>Chargement...</div>}>
                <ProjectDetail />
            </Suspense>
        </AuthGuard>
    )
}
