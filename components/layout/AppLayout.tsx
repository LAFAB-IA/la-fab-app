"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import ClientSidebar from "@/components/layout/ClientSidebar"
import SupplierSidebar from "@/components/layout/SupplierSidebar"
import RoleSwitcher from "@/components/layout/RoleSwitcher"
import { C } from "@/lib/constants"

const BARE_PATHS = ["/", "/login", "/supplier/register", "/auth/callback", "/onboarding"]

const CLIENT_PATHS = ["/projets", "/factures", "/planning", "/profil", "/dashboard", "/notifications"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { isAuthenticated, user } = useAuth()

    useEffect(() => {
        if (
            isAuthenticated &&
            user?.role === "client" &&
            pathname !== "/onboarding" &&
            !localStorage.getItem("onboarding_done")
        ) {
            const createdAt = user.created_at ? new Date(user.created_at).getTime() : null
            if (createdAt !== null && createdAt >= Date.now() - 5 * 60 * 1000) {
                router.push("/onboarding")
            }
        }
    }, [isAuthenticated, user, pathname])

    if (BARE_PATHS.includes(pathname)) {
        return <>{children}</>
    }

    // Sidebar basée sur user.role (qui inclut role_override via RoleSwitcher)
    const showAdmin    = isAuthenticated && user?.role === "admin"
    const showSupplier = isAuthenticated && user?.role === "supplier"
    const showClient   = isAuthenticated && !showAdmin && !showSupplier

    const hasSidebar = isAuthenticated

    return (
        <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column" }}>
            <style>{`
                .app-main {
                    flex: 1;
                    padding: 24px;
                    overflow-y: auto;
                    margin-left: ${hasSidebar ? 64 : 0}px;
                    transition: margin-left 0.22s cubic-bezier(0.4,0,0.2,1);
                }
                @media (max-width: 768px) {
                    .app-main { margin-left: 0 !important; padding: 16px !important; }
                }
                @media (max-width: 375px) {
                    .app-main { padding: 12px !important; }
                }
            `}</style>
            <Navbar />
            <RoleSwitcher />
            <div style={{ marginTop: 60, flex: 1, display: "flex" }}>
                {showAdmin    && <Sidebar />}
                {showSupplier && <SupplierSidebar />}
                {showClient   && <ClientSidebar />}
                <main className="app-main">
                    {children}
                </main>
            </div>
        </div>
    )
}
