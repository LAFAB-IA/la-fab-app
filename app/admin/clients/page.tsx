"use client"
import AdminClients from "@/components/AdminClients"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminClients />
        </AuthGuard>
    )
}
