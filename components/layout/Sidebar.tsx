"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { C } from "@/lib/constants"
import { LayoutDashboard, FolderKanban, Factory, FileText, ClipboardList, Webhook } from "lucide-react"

const LINKS: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: "/admin/dashboard",    label: "Dashboard",    icon: <LayoutDashboard size={18} /> },
    { href: "/admin/projets",      label: "Projets",      icon: <FolderKanban size={18} /> },
    { href: "/admin/fournisseurs", label: "Fournisseurs", icon: <Factory size={18} /> },
    { href: "/admin/factures",     label: "Factures",     icon: <FileText size={18} /> },
    { href: "/admin/audit",        label: "Audit",        icon: <ClipboardList size={18} /> },
    { href: "/admin/webhooks",     label: "Webhooks",     icon: <Webhook size={18} /> },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <>
            <style>{`
                .sidebar-link {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    text-decoration: none;
                    color: #000000;
                    transition: background-color 0.15s;
                    cursor: pointer;
                }
                .sidebar-link:hover {
                    background-color: rgba(244, 207, 21, 0.15);
                }
                .sidebar-link:hover .sidebar-tooltip {
                    opacity: 1;
                    transform: translateX(0);
                    pointer-events: none;
                }
                .sidebar-tooltip {
                    position: absolute;
                    left: 52px;
                    top: 50%;
                    transform: translateY(-50%) translateX(-4px);
                    background-color: #000000;
                    color: #fff;
                    padding: 5px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.15s, transform 0.15s;
                    pointer-events: none;
                    z-index: 100;
                }
                .sidebar-tooltip::before {
                    content: '';
                    position: absolute;
                    right: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    border: 5px solid transparent;
                    border-right-color: #000000;
                }
            `}</style>

            <aside style={{
                position: "fixed",
                top: 60,
                left: 0,
                bottom: 0,
                width: 64,
                backgroundColor: C.white,
                borderRight: "1px solid " + C.border,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 0",
                gap: 4,
                fontFamily: "Inter, sans-serif",
                zIndex: 900,
            }}>
                {LINKS.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(link.href + "/")
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="sidebar-link"
                            style={{
                                backgroundColor: active ? "rgba(244, 207, 21, 0.2)" : "transparent",
                                color: active ? "#000000" : "#555",
                            }}
                        >
                            {link.icon}
                            <span className="sidebar-tooltip">{link.label}</span>
                        </Link>
                    )
                })}
            </aside>
        </>
    )
}
