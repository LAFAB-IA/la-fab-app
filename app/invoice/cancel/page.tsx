"use client"
import InvoiceCancel from "@/components/InvoiceCancel"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <InvoiceCancel />
        </AuthGuard>
    )
}
