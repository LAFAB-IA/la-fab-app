"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { API_URL, C } from "@/lib/constants"
import { fetchWithAuth } from "@/lib/api"
import { X, Menu, Moon, Sun, User, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import NotificationBell from "@/components/NotificationBell"
import useFocusTrap from "@/hooks/useFocusTrap"

export default function Navbar() {
    const { user, token, isAuthenticated, isLoading, logout } = useAuth()
    const { resolvedTheme, setTheme } = useTheme()
    const [themeMounted, setThemeMounted] = useState(false)
    useEffect(() => {
        const id = setTimeout(() => setThemeMounted(true), 0)
        return () => clearTimeout(id)
    }, [])
    const isDark = themeMounted && resolvedTheme === "dark"
    const [profileOpen, setProfileOpen] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [logoutModalOpen, setLogoutModalOpen] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)
    const logoutModalRef = useRef<HTMLDivElement>(null)
    useFocusTrap(logoutModalOpen, logoutModalRef, () => setLogoutModalOpen(false))

    // ── Fetch avatar from /me ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return
        fetchWithAuth(`${API_URL}/api/auth/me`)
            .then((r) => r.json())
            .then((data) => { if (data.ok && data.user?.avatar_url) setAvatarUrl(data.user.avatar_url + "?t=" + Date.now()) })
            .catch(() => {})
    }, [token])

    // ── Listen for avatar updates (same-tab event + cross-tab localStorage) ──
    useEffect(() => {
        function handleAvatarUpdated() {
            if (!token) return
            fetchWithAuth(`${API_URL}/api/auth/me`, {
                headers: { "Cache-Control": "no-cache" },
            })
                .then((r) => r.json())
                .then((data) => { if (data.ok && data.user?.avatar_url) setAvatarUrl(data.user.avatar_url + "?t=" + Date.now()) })
                .catch(() => {})
        }
        function handleStorage(e: StorageEvent) {
            if (e.key === "avatar_updated") handleAvatarUpdated()
        }
        window.addEventListener("avatar-updated", handleAvatarUpdated)
        window.addEventListener("storage", handleStorage)
        return () => {
            window.removeEventListener("avatar-updated", handleAvatarUpdated)
            window.removeEventListener("storage", handleStorage)
        }
    }, [token])

    // ── Close profile dropdown on outside click ──────────────────────────────
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    const initials = user
        ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase()
        : ""

    // ── Liens mobile ──────────────────────────────────────────────────────────
    const mobileLinks = isAuthenticated && user?.role === "supplier"
        ? []
        : isAuthenticated
        ? []
        : []

    return (
        <nav className="navbar-root" style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 60, zIndex: 1000,
            backgroundColor: "#000000", display: "flex", alignItems: "center",
            padding: "0 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            fontFamily: "Inter, sans-serif",
        }}>
            {/* ── Logo → landing page ── */}
            <Link
                href="/"
                style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: 6, backgroundColor: C.yellow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: "#000000",
                }}>
                    LF
                </div>
                <span className="navbar-brand-name" style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>LA FAB</span>
            </Link>

            {/* ── Spacer centre ── */}
            <div style={{ flex: 1 }} />

            {/* ── Right side ── */}
            {isLoading ? null : isAuthenticated ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                    {/* ── Cloche notifications ── */}
                    <NotificationBell />

                    {/* ── Avatar + dropdown profil ── */}
                    <div ref={profileRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            style={{
                                width: 34, height: 34, borderRadius: "50%",
                                backgroundColor: C.yellow, color: "#000000",
                                fontWeight: 700, fontSize: 12, border: "none",
                                cursor: "pointer", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                overflow: "hidden", padding: 0,
                            }}
                        >
                            {avatarUrl
                                ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
                                : (initials || "?")
                            }
                        </button>

                        {profileOpen && (
                            <div style={{
                                position: "absolute", right: 0, top: 44,
                                backgroundColor: C.white, borderRadius: 12,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                                border: "1px solid " + C.border,
                                minWidth: 180, overflow: "hidden", zIndex: 1001,
                            }}>
                                <div style={{ padding: "12px 16px", borderBottom: "1px solid " + C.border }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                                        {user?.firstName} {user?.lastName}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.email}</div>
                                </div>
                                <Link href="/profil" onClick={() => setProfileOpen(false)} style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "11px 16px", fontSize: 14,
                                    color: C.dark, textDecoration: "none", fontWeight: 500,
                                }}>
                                    <User size={16} />
                                    Mon profil
                                </Link>
                                <button
                                    onClick={() => setTheme(isDark ? "light" : "dark")}
                                    style={{
                                        display: "flex", width: "100%", textAlign: "left",
                                        alignItems: "center", gap: 10,
                                        padding: "11px 16px", fontSize: 14, color: C.dark,
                                        fontWeight: 500, border: "none", background: "none",
                                        cursor: "pointer", borderTop: "1px solid " + C.border,
                                    }}
                                >
                                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                                    {isDark ? "Thème clair" : "Thème sombre"}
                                </button>
                                <button onClick={() => { setProfileOpen(false); setLogoutModalOpen(true) }} style={{
                                    display: "flex", width: "100%", textAlign: "left",
                                    alignItems: "center", gap: 10,
                                    padding: "11px 16px", fontSize: 14, color: "var(--status-danger-fg)",
                                    fontWeight: 500, border: "none", background: "none",
                                    cursor: "pointer", borderTop: "1px solid " + C.border,
                                }}>
                                    <LogOut size={16} />
                                    Se déconnecter
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Mobile burger ── */}
                    <button
                        className="navbar-burger"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{
                            display: "none", background: "none", border: "none",
                            color: C.white, cursor: "pointer", padding: 4,
                        }}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Link href="/supplier/register" style={{
                        color: "rgba(255,255,255,0.7)", textDecoration: "none",
                        fontSize: 14, fontWeight: 500,
                    }}>
                        Devenir fournisseur
                    </Link>
                    <Link href="/login" style={{
                        padding: "8px 20px", backgroundColor: C.yellow, color: "#000000",
                        borderRadius: 8, fontWeight: 700, fontSize: 14,
                        textDecoration: "none",
                    }}>
                        Se connecter
                    </Link>
                </div>
            )}

            {/* ── Mobile menu ── */}
            {mobileOpen && isAuthenticated && (
                <div style={{
                    position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
                    backgroundColor: "#000000", zIndex: 999, padding: "24px 20px",
                    display: "flex", flexDirection: "column", gap: 8,
                }}>
                    {mobileLinks.map((link) => (
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

            {/* ── Modale confirmation déconnexion ── */}
            {logoutModalOpen && (
                <div
                    onClick={() => setLogoutModalOpen(false)}
                    style={{
                        position: "fixed", inset: 0, zIndex: 2000,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div
                        ref={logoutModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-modal-title"
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: "#FAFFFD", borderRadius: 12,
                            padding: "28px 32px", maxWidth: 380, width: "100%",
                            margin: "0 16px",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                        }}
                    >
                        <h2 id="logout-modal-title" style={{
                            fontSize: 18, fontWeight: 700, color: "#000000",
                            margin: "0 0 10px 0", letterSpacing: "-0.2px",
                        }}>
                            Déconnexion
                        </h2>
                        <p style={{
                            fontSize: 14, color: "#7a8080",
                            margin: "0 0 28px 0", lineHeight: 1.6,
                        }}>
                            Voulez-vous vraiment vous déconnecter ?
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                style={{
                                    padding: "10px 20px", borderRadius: 8,
                                    backgroundColor: "#f0f0ee", color: "#000000",
                                    fontSize: 14, fontWeight: 600, border: "none",
                                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#e0e0de" }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f0f0ee" }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => { setLogoutModalOpen(false); logout() }}
                                style={{
                                    padding: "10px 20px", borderRadius: 8,
                                    backgroundColor: "#000000", color: "#FAFFFD",
                                    fontSize: 14, fontWeight: 600, border: "none",
                                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85" }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .navbar-desktop-links { display: none !important; }
                    .navbar-burger { display: flex !important; }
                    .navbar-root { padding: 0 12px !important; }
                }
                @media (max-width: 375px) {
                    .navbar-brand-name { display: none; }
                }
            `}</style>
        </nav>
    )
}
