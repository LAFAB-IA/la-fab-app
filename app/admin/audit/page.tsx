"use client"
import AdminAudit from "@/components/AdminAudit"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminAudit />
        </AuthGuard>
    )
}
