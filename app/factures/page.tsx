"use client"
import InvoiceList from "@/components/InvoiceList"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <InvoiceList />
        </AuthGuard>
    )
}
