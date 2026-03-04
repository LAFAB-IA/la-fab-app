"use client"
import { Suspense } from "react"
import InvoiceSuccess from "@/components/InvoiceSuccess"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}>Chargement...</div>}>
                <InvoiceSuccess />
            </Suspense>
        </AuthGuard>
    )
}
