"use client"

import AuthGuard from "@/components/AuthGuard"
import NotificationCenter from "@/components/NotificationCenter"

export default function NotificationsPage() {
    return (
        <AuthGuard>
            <NotificationCenter />
        </AuthGuard>
    )
}
