"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { C } from "@/lib/constants"
import { LayoutDashboard, FolderKanban, Factory, FileText, ClipboardList, Webhook } from "lucide-react"

const LINKS: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: "/admin/dashboard",    label: "Dashboard",    icon: <LayoutDashboard size={16} /> },
    { href: "/admin/projets",      label: "Projets",      icon: <FolderKanban size={16} /> },
    { href: "/admin/fournisseurs", label: "Fournisseurs", icon: <Factory size={16} /> },
    { href: "/admin/factures",     label: "Factures",     icon: <FileText size={16} /> },
    { href: "/admin/audit",        label: "Audit",        icon: <ClipboardList size={16} /> },
    { href: "/admin/webhooks",     label: "Webhooks",     icon: <Webhook size={16} /> },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside style={{
            width: 240, minWidth: 240, minHeight: "100%",
            backgroundColor: C.white, borderRight: "1px solid " + C.border,
            padding: "16px 0", fontFamily: "Inter, sans-serif",
            display: "flex", flexDirection: "column", gap: 2,
        }}>
            {LINKS.map((link) => {
                const active = pathname === link.href
                return (
                    <Link key={link.href} href={link.href} style={{
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
                    </Link>
                )
            })}
        </aside>
    )
}
