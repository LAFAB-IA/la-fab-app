"use client"
import AdminSuppliers from "@/components/AdminSuppliers"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminSuppliers />
        </AuthGuard>
    )
}
