"use client"

import * as React from "react"
import { X } from "lucide-react"
import { C } from "@/lib/constants"

const { useEffect, useCallback } = React

interface DrawerProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    width?: string
    children: React.ReactNode
}

export default function Drawer({ isOpen, onClose, title, width = "720px", children }: DrawerProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
    }, [onClose])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown)
            document.body.style.overflow = "hidden"
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.body.style.overflow = ""
        }
    }, [isOpen, handleKeyDown])

    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    backgroundColor: "rgba(58,64,64,0.4)",
                    animation: "drawerOverlayIn 200ms ease",
                }}
            />

            {/* Panel */}
            <div
                className="drawer-panel"
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    zIndex: 1001,
                    width,
                    maxWidth: "100vw",
                    backgroundColor: C.white,
                    boxShadow: "-4px 0 24px rgba(58,64,64,0.12)",
                    display: "flex", flexDirection: "column",
                    animation: "drawerSlideIn 300ms ease",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: "1px solid " + C.border,
                    flexShrink: 0,
                }}>
                    {title ? (
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: C.dark, margin: 0 }}>{title}</h2>
                    ) : (
                        <div />
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 32, height: 32, borderRadius: 8,
                            border: "1px solid " + C.border,
                            background: C.white, cursor: "pointer",
                            color: C.dark,
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    {children}
                </div>
            </div>

            <style>{`
                @keyframes drawerSlideIn {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                @keyframes drawerOverlayIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @media (max-width: 768px) {
                    .drawer-panel { width: 100% !important; }
                }
            `}</style>
        </>
    )
}
