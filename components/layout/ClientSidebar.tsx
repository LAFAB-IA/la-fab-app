"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { C } from "@/lib/constants"
import { FolderKanban, FileText, CalendarDays, User } from "lucide-react"

const LINKS = [
    { href: "/projets",   label: "Projets",  icon: <FolderKanban size={18} /> },
    { href: "/factures",  label: "Factures", icon: <FileText size={18} /> },
    { href: "/planning",  label: "Planning", icon: <CalendarDays size={18} /> },
    { href: "/profil",    label: "Profil",   icon: <User size={18} /> },
]

export default function ClientSidebar() {
    const pathname = usePathname()

    return (
        <>
            <style>{`
                .client-sidebar {
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
                .client-sidebar:hover {
                    width: 200px;
                    box-shadow: 2px 0 12px rgba(0,0,0,0.07);
                }
                .client-sidebar-link {
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
                    transition: background-color 0.15s, color 0.15s;
                    box-sizing: border-box;
                }
                .client-sidebar-link:hover {
                    background-color: rgba(244, 207, 21, 0.12);
                    color: #000000;
                }
                .client-sidebar-link.active {
                    background-color: rgba(244, 207, 21, 0.2);
                    color: #000000;
                    font-weight: 600;
                }
                .client-sidebar-label {
                    opacity: 0;
                    transition: opacity 0.18s ease;
                }
                .client-sidebar:hover .client-sidebar-label {
                    opacity: 1;
                }
            `}</style>

            <aside className="client-sidebar">
                {LINKS.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(link.href + "/")
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`client-sidebar-link${active ? " active" : ""}`}
                        >
                            <span style={{ flexShrink: 0 }}>{link.icon}</span>
                            <span className="client-sidebar-label">{link.label}</span>
                        </Link>
                    )
                })}
            </aside>
        </>
    )
}
