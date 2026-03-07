"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import ClientSidebar from "@/components/layout/ClientSidebar"
import SupplierSidebar from "@/components/layout/SupplierSidebar"
import RoleSwitcher from "@/components/layout/RoleSwitcher"
import { C } from "@/lib/constants"

const BARE_PATHS = ["/", "/login", "/supplier/register", "/auth/callback"]

const CLIENT_PATHS = ["/projets", "/factures", "/planning", "/profil", "/dashboard", "/notifications"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isAuthenticated, user } = useAuth()

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
            <Navbar />
            <RoleSwitcher />
            <div style={{ marginTop: 60, flex: 1, display: "flex" }}>
                {showAdmin    && <Sidebar />}
                {showSupplier && <SupplierSidebar />}
                {showClient   && <ClientSidebar />}
                <main style={{
                    flex: 1,
                    padding: 24,
                    overflowY: "auto",
                    marginLeft: hasSidebar ? 64 : 0,
                    transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
                }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
