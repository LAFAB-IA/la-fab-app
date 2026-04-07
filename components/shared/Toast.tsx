"use client"

import { useEffect, useState } from "react"
import { Check, XCircle } from "lucide-react"

interface ToastProps {
    message: string
    type: "success" | "error"
    onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
    const [entered, setEntered] = useState(false)

    // Trigger slide-in on next paint
    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    // Auto-dismiss after 2500ms
    useEffect(() => {
        const t = setTimeout(onDismiss, 2500)
        return () => clearTimeout(t)
    }, [onDismiss])

    const bg = type === "success" ? "#000000" : "#c0392b"
    const Icon = type === "success" ? Check : XCircle

    return (
        <div
            style={{
                position: "fixed",
                top: 80,
                right: 24,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 18px",
                borderRadius: 10,
                backgroundColor: bg,
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
                maxWidth: 340,
                transform: entered ? "translateX(0)" : "translateX(calc(100% + 48px))",
                opacity: entered ? 1 : 0,
                transition: "transform 240ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease",
                pointerEvents: "none",
            }}
        >
            <Icon size={15} style={{ flexShrink: 0 }} />
            {message}
        </div>
    )
}
