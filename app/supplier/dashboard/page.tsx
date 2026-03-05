"use client"

import AuthGuard from "@/components/AuthGuard"
import SupplierDashboard from "@/components/SupplierDashboard"

export default function Page() {
    return (
        <AuthGuard requiredRole="supplier">
            <SupplierDashboard />
        </AuthGuard>
    )
}
