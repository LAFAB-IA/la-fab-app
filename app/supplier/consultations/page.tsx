"use client"

import AuthGuard from "@/components/AuthGuard"
import SupplierConsultations from "@/components/SupplierConsultations"

export default function Page() {
    return (
        <AuthGuard requiredRole="supplier">
            <SupplierConsultations />
        </AuthGuard>
    )
}
