"use client"

import * as React from "react"
import { X, GripHorizontal } from "lucide-react"
import { C } from "@/lib/constants"

const { useEffect, useCallback, useState, useRef } = React

interface DrawerProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    width?: string
    children: React.ReactNode
}

export default function Drawer({ isOpen, onClose, title, width = "720px", children }: DrawerProps) {
    const [drawerWidth, setDrawerWidth] = useState<number | null>(null)
    const dragging = useRef(false)
    const startX = useRef(0)
    const startW = useRef(0)
    const panelRef = useRef<HTMLDivElement>(null)

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
    }, [onClose])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown)
            document.body.style.overflow = "hidden"
            setDrawerWidth(null)
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.body.style.overflow = ""
        }
    }, [isOpen, handleKeyDown])

    // Resize handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        dragging.current = true
        startX.current = e.clientX
        startW.current = panelRef.current?.offsetWidth || parseInt(width)
        document.body.style.cursor = "ew-resize"
        document.body.style.userSelect = "none"
    }, [width])

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!dragging.current) return
            const delta = startX.current - e.clientX
            const newW = Math.min(Math.max(startW.current + delta, 320), window.innerWidth * 0.9)
            setDrawerWidth(newW)
        }
        function onMouseUp() {
            if (!dragging.current) return
            dragging.current = false
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        return () => {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }
    }, [])

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
                ref={panelRef}
                className="drawer-panel"
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    zIndex: 1001,
                    width: drawerWidth ? `${drawerWidth}px` : width,
                    maxWidth: "90vw",
                    minWidth: 320,
                    backgroundColor: C.white,
                    boxShadow: "-4px 0 24px rgba(58,64,64,0.12)",
                    display: "flex", flexDirection: "column",
                    animation: drawerWidth ? undefined : "drawerSlideIn 300ms ease",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {/* Resize handle (left edge) */}
                <div
                    onMouseDown={onMouseDown}
                    style={{
                        position: "absolute", top: 0, left: 0, bottom: 0, width: 6,
                        cursor: "ew-resize", zIndex: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div style={{
                        width: 4, height: 40, borderRadius: 2,
                        backgroundColor: C.border, opacity: 0.6,
                        transition: "opacity 0.15s",
                    }} />
                </div>

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
                    .drawer-panel { width: 100% !important; min-width: 0 !important; }
                }
            `}</style>
        </>
    )
}
