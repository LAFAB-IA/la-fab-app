"use client"

import * as React from "react"
import { X, Download, ExternalLink } from "lucide-react"
import { C } from "@/lib/constants"

const { useEffect, useCallback } = React

interface PdfViewerModalProps {
    url: string
    isOpen: boolean
    onClose: () => void
    title?: string
}

export default function PdfViewerModal({ url, isOpen, onClose, title }: PdfViewerModalProps) {
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

    if (!isOpen || !url) return null

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 2000,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    animation: "pdfOverlayIn 200ms ease",
                }}
            />

            {/* Modal */}
            <div
                className="pdf-modal"
                style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 2001,
                    width: "92vw", maxWidth: 960,
                    height: "90vh",
                    backgroundColor: C.dark,
                    borderRadius: 12,
                    display: "flex", flexDirection: "column",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                    animation: "pdfModalIn 250ms ease",
                    fontFamily: "Inter, sans-serif",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 20px",
                    borderBottom: "2px solid " + C.yellow,
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>
                        {title || "Document PDF"}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                            onClick={() => window.open(url, "_blank")}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 6,
                                border: "1px solid " + C.yellow,
                                background: "transparent", color: C.yellow,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            <ExternalLink size={13} />
                            Ouvrir
                        </button>
                        <button
                            onClick={() => window.open(url, "_blank")}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 6,
                                border: "none",
                                background: C.yellow, color: C.dark,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            <Download size={13} />
                            Telecharger
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 32, borderRadius: 6,
                                border: "none",
                                background: "rgba(250,255,253,0.1)", cursor: "pointer",
                                color: C.white,
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* PDF iframe */}
                <div style={{ flex: 1, background: "#525659" }}>
                    <iframe
                        src={url}
                        style={{
                            width: "100%", height: "100%",
                            border: "none",
                        }}
                        title={title || "PDF"}
                    />
                </div>
            </div>

            <style>{`
                @keyframes pdfOverlayIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes pdfModalIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
                    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @media (max-width: 768px) {
                    .pdf-modal {
                        width: 100vw !important;
                        height: 100vh !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>
        </>
    )
}
