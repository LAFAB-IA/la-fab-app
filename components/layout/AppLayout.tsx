"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { C } from "@/lib/constants"

const BARE_PATHS = ["/", "/login"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isAuthenticated } = useAuth()

    // Landing and login pages: no chrome
    if (BARE_PATHS.includes(pathname)) {
        return <>{children}</>
    }

    const isAdmin = pathname.startsWith("/admin")

    return (
        <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column" }}>
            <Navbar />
            <div style={{ marginTop: 60, flex: 1, display: "flex" }}>
                {isAdmin && isAuthenticated && <Sidebar />}
                <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
