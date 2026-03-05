"use client"

import { Suspense } from "react"
import AuthGuard from "@/components/AuthGuard"
import CreateProject from "@/components/CreateProject"

export default function NouveauProjetPage() {
    return (
        <AuthGuard>
            <Suspense fallback={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                    <p style={{ color: "#7a8080" }}>Chargement...</p>
                </div>
            }>
                <CreateProject />
            </Suspense>
        </AuthGuard>
    )
}
