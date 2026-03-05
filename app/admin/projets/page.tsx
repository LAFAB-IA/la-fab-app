"use client"
import AdminProjects from "@/components/AdminProjects"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminProjects />
        </AuthGuard>
    )
}
