"use client"
import AdminWebhooks from "@/components/AdminWebhooks"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminWebhooks />
        </AuthGuard>
    )
}
