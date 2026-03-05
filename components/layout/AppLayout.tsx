"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import SupplierSidebar from "@/components/layout/SupplierSidebar"
import { C } from "@/lib/constants"

const BARE_PATHS = ["/", "/login", "/supplier/register"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isAuthenticated, user } = useAuth()

    // Landing, login, and public supplier register: no chrome
    if (BARE_PATHS.includes(pathname)) {
        return <>{children}</>
    }

    const isAdmin = pathname.startsWith("/admin")
    const isSupplier = pathname.startsWith("/supplier") && user?.role === "supplier"

    return (
        <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column" }}>
            <Navbar />
            <div style={{ marginTop: 60, flex: 1, display: "flex" }}>
                {isAdmin && isAuthenticated && <Sidebar />}
                {isSupplier && isAuthenticated && <SupplierSidebar />}
                <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
