"use client"
import { Suspense } from "react"
import InvoiceDetail from "@/components/InvoiceDetail"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}>Chargement...</div>}>
                <InvoiceDetail />
            </Suspense>
        </AuthGuard>
    )
}
