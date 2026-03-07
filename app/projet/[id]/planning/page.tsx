"use client"
import { Suspense } from "react"
import ProjectPlanning from "@/components/ProjectPlanning"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}>Chargement...</div>}>
                <ProjectPlanning />
            </Suspense>
        </AuthGuard>
    )
}
