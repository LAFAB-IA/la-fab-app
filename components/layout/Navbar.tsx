"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { API_URL, C } from "@/lib/constants"

export default function Navbar() {
    const { user, token, isAuthenticated, logout } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch unread notification count
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/api/notification/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => { if (typeof data.count === "number") setUnreadCount(data.count) })
            .catch(() => {})
    }, [token])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    const initials = user
        ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase()
        : ""

    const navLinks = isAuthenticated
        ? [
              { href: "/projets", label: "Projets" },
              { href: "/factures", label: "Factures" },
              ...(user?.role === "admin" ? [{ href: "/admin/dashboard", label: "Admin" }] : []),
          ]
        : []

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 60, zIndex: 1000,
            backgroundColor: C.dark, display: "flex", alignItems: "center",
            padding: "0 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            fontFamily: "Inter, sans-serif",
        }}>
            {/* Logo */}
            <Link href={isAuthenticated ? "/projets" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 6, backgroundColor: C.yellow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: C.dark,
                }}>
                    LF
                </div>
                <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>LA FAB</span>
            </Link>

            {/* Desktop nav links — center */}
            {isAuthenticated && (
                <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 24 }}
                     className="navbar-desktop-links">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} style={{
                            color: C.white, textDecoration: "none", fontSize: 14, fontWeight: 500,
                            opacity: 0.85, transition: "opacity 0.2s",
                        }}>
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}

            {/* Spacer when not authenticated */}
            {!isAuthenticated && <div style={{ flex: 1 }} />}

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: isAuthenticated ? 0 : "auto" }}>
                {isAuthenticated ? (
                    <>
                        {/* Notification bell */}
                        <Link href="/notifications" style={{ position: "relative", color: C.white, textDecoration: "none", fontSize: 20, lineHeight: 1 }}>
                            🔔
                            {unreadCount > 0 && (
                                <span style={{
                                    position: "absolute", top: -6, right: -8,
                                    backgroundColor: "#e74c3c", color: "#fff",
                                    fontSize: 10, fontWeight: 700, borderRadius: 10,
                                    minWidth: 18, height: 18, display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    padding: "0 4px",
                                }}>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* Avatar + dropdown */}
                        <div ref={dropdownRef} style={{ position: "relative" }}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                style={{
                                    width: 36, height: 36, borderRadius: "50%",
                                    backgroundColor: C.yellow, color: C.dark,
                                    fontWeight: 700, fontSize: 13, border: "none",
                                    cursor: "pointer", display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                }}
                            >
                                {initials}
                            </button>
                            {dropdownOpen && (
                                <div style={{
                                    position: "absolute", right: 0, top: 44,
                                    backgroundColor: C.white, borderRadius: 10,
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                    border: "1px solid " + C.border,
                                    minWidth: 180, overflow: "hidden", zIndex: 1001,
                                }}>
                                    <Link href="/profil" onClick={() => setDropdownOpen(false)} style={{
                                        display: "block", padding: "12px 16px", fontSize: 14,
                                        color: C.dark, textDecoration: "none", fontWeight: 500,
                                    }}>
                                        Mon profil
                                    </Link>
                                    <button onClick={() => { setDropdownOpen(false); logout() }} style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "12px 16px", fontSize: 14, color: "#c0392b",
                                        fontWeight: 500, border: "none", background: "none",
                                        cursor: "pointer", borderTop: "1px solid " + C.border,
                                    }}>
                                        Se déconnecter
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile burger */}
                        <button
                            className="navbar-burger"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            style={{
                                display: "none", background: "none", border: "none",
                                color: C.white, fontSize: 22, cursor: "pointer", padding: 4,
                            }}
                        >
                            {mobileOpen ? "✕" : "☰"}
                        </button>
                    </>
                ) : (
                    <Link href="/login" style={{
                        padding: "8px 20px", backgroundColor: C.yellow, color: C.dark,
                        borderRadius: 8, fontWeight: 600, fontSize: 14,
                        textDecoration: "none",
                    }}>
                        Se connecter
                    </Link>
                )}
            </div>

            {/* Mobile menu overlay */}
            {mobileOpen && isAuthenticated && (
                <div style={{
                    position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
                    backgroundColor: C.dark, zIndex: 999, padding: "24px 20px",
                    display: "flex", flexDirection: "column", gap: 8,
                }}>
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{
                            color: C.white, textDecoration: "none", fontSize: 18,
                            fontWeight: 500, padding: "12px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}>
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}

            {/* Responsive CSS */}
            <style>{`
                @media (max-width: 768px) {
                    .navbar-desktop-links { display: none !important; }
                    .navbar-burger { display: block !important; }
                }
            `}</style>
        </nav>
    )
}
