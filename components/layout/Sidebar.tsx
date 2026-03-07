"use client"

import React from "react"
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
                .sidebar {
                    position: fixed;
                    top: 60px;
                    left: 0;
                    bottom: 0;
                    width: 64px;
                    background-color: #FAFFFD;
                    border-right: 1px solid #e0e0de;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 12px 0;
                    gap: 4px;
                    font-family: Inter, sans-serif;
                    z-index: 900;
                    overflow: hidden;
                    transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
                }
                .sidebar:hover {
                    width: 200px;
                    box-shadow: 2px 0 12px rgba(0,0,0,0.07);
                }
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 10px 20px;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 500;
                    color: #555;
                    white-space: nowrap;
                    border-radius: 0;
                    transition: background-color 0.15s, color 0.15s;
                    box-sizing: border-box;
                }
                .sidebar-link:hover {
                    background-color: rgba(244, 207, 21, 0.12);
                    color: #000000;
                }
                .sidebar-link.active {
                    background-color: rgba(244, 207, 21, 0.2);
                    color: #000000;
                    font-weight: 600;
                }
                .sidebar-label {
                    opacity: 0;
                    transition: opacity 0.18s ease;
                }
                .sidebar:hover .sidebar-label {
                    opacity: 1;
                }
            `}</style>

            <aside className="sidebar">
                {LINKS.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(link.href + "/")
                    return (
                        <a
                            key={link.href}
                            href={link.href}
                            className={`sidebar-link${active ? " active" : ""}`}
                        >
                            <span style={{ flexShrink: 0 }}>{link.icon}</span>
                            <span className="sidebar-label">{link.label}</span>
                        </a>
                    )
                })}
            </aside>
        </>
    )
}
