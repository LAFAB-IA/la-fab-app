"use client"
import AdminDashboard from "@/components/AdminDashboard"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminDashboard />
        </AuthGuard>
    )
}
