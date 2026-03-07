"use client"

import { usePathname } from "next/navigation"
import { C } from "@/lib/constants"
import { LayoutDashboard, MessageSquare, CalendarDays } from "lucide-react"

const LINKS = [
    { href: "/supplier/dashboard",     label: "Dashboard",      icon: <LayoutDashboard size={16} /> },
    { href: "/supplier/consultations", label: "Consultations",  icon: <MessageSquare size={16} /> },
    { href: "/planning",               label: "Planning",       icon: <CalendarDays size={16} /> },
]

export default function SupplierSidebar() {
    const pathname = usePathname()

    return (
        <aside style={{
            width: 220, minWidth: 220, minHeight: "100%",
            backgroundColor: C.white, borderRight: "1px solid " + C.border,
            padding: "16px 0", fontFamily: "Inter, sans-serif",
            display: "flex", flexDirection: "column", gap: 2,
        }}>
            <div style={{ padding: "4px 20px 14px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Espace fournisseur
            </div>
            {LINKS.map((link) => {
                const active = pathname === link.href
                return (
                    <a key={link.href} href={link.href} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 20px", fontSize: 14,
                        textDecoration: "none",
                        fontWeight: active ? 600 : 500,
                        color: C.dark,
                        backgroundColor: active ? "rgba(244, 207, 21, 0.15)" : "transparent",
                        transition: "background-color 0.15s",
                    }}>
                        {link.icon}
                        {link.label}
                    </a>
                )
            })}
        </aside>
    )
}
