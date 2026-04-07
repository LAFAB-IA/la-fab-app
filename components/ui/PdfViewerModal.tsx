"use client"

import * as React from "react"
import { X, Download, ExternalLink, Pencil, Type } from "lucide-react"
import { C } from "@/lib/constants"
import useFocusTrap from "@/hooks/useFocusTrap"

const { useState, useEffect, useCallback, useRef } = React

interface Annotation {
    id: string
    x: number
    y: number
    text: string
}

type AnnotationTool = null | "pencil" | "text"

interface PdfViewerModalProps {
    url: string
    isOpen: boolean
    onClose: () => void
    title?: string
}

export default function PdfViewerModal({ url, isOpen, onClose, title }: PdfViewerModalProps) {
    const [activeTool, setActiveTool] = useState<AnnotationTool>(null)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editPos, setEditPos] = useState<{ x: number; y: number } | null>(null)
    const [editText, setEditText] = useState("")
    const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
    const modalRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus trap — no onClose passed: Escape is handled by the multi-step handleKeyDown below
    useFocusTrap(isOpen, modalRef)

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            if (editingId) {
                commitAnnotation()
            } else if (activeTool) {
                setActiveTool(null)
            } else {
                onClose()
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose, activeTool, editingId, editText, editPos])

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

    useEffect(() => {
        if (editingId && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [editingId])

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setActiveTool(null)
            setAnnotations([])
            setEditingId(null)
            setEditPos(null)
            setEditText("")
            setDragging(null)
        }
    }, [isOpen])

    function commitAnnotation() {
        if (editingId && editText.trim()) {
            setAnnotations((prev) => {
                const exists = prev.find((a) => a.id === editingId)
                if (exists) {
                    return prev.map((a) => a.id === editingId ? { ...a, text: editText.trim() } : a)
                }
                if (editPos) {
                    return [...prev, { id: editingId, x: editPos.x, y: editPos.y, text: editText.trim() }]
                }
                return prev
            })
        }
        setEditingId(null)
        setEditPos(null)
        setEditText("")
    }

    function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
        if (activeTool !== "text") return
        if (editingId) {
            commitAnnotation()
            return
        }
        const rect = overlayRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = "ann_" + Date.now()
        setEditingId(id)
        setEditPos({ x, y })
        setEditText("")
    }

    function handleDoubleClick(ann: Annotation) {
        setEditingId(ann.id)
        setEditPos({ x: ann.x, y: ann.y })
        setEditText(ann.text)
    }

    function handleTextareaKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            commitAnnotation()
        }
        if (e.key === "Escape") {
            e.preventDefault()
            commitAnnotation()
        }
    }

    function handleDragStart(e: React.MouseEvent, ann: Annotation) {
        e.preventDefault()
        e.stopPropagation()
        const rect = overlayRef.current?.getBoundingClientRect()
        if (!rect) return
        setDragging({ id: ann.id, offsetX: e.clientX - rect.left - ann.x, offsetY: e.clientY - rect.top - ann.y })
    }

    function handleDragMove(e: React.MouseEvent) {
        if (!dragging) return
        const rect = overlayRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left - dragging.offsetX
        const y = e.clientY - rect.top - dragging.offsetY
        setAnnotations((prev) => prev.map((a) => a.id === dragging.id ? { ...a, x, y } : a))
    }

    function handleDragEnd() {
        setDragging(null)
    }

    function toggleTool(tool: AnnotationTool) {
        if (editingId) commitAnnotation()
        setActiveTool((prev) => (prev === tool ? null : tool))
    }

    if (!isOpen || !url) return null

    const isAnnotating = activeTool !== null

    function renderAnnotation(ann: Annotation, interactive: boolean) {
        if (editingId === ann.id) return null
        return (
            <div
                key={ann.id}
                onMouseDown={interactive ? (e) => handleDragStart(e, ann) : undefined}
                onDoubleClick={interactive ? () => handleDoubleClick(ann) : undefined}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "absolute",
                    left: ann.x, top: ann.y,
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid " + C.yellow,
                    borderRadius: 4,
                    padding: 4,
                    fontSize: 13,
                    color: C.dark,
                    fontFamily: "Inter, sans-serif",
                    maxWidth: 260,
                    minWidth: 20,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
                    pointerEvents: interactive ? "auto" : "none",
                    userSelect: "none",
                }}
            >
                {ann.text}
            </div>
        )
    }

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
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdf-modal-title"
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
                    <span id="pdf-modal-title" style={{ fontSize: 14, fontWeight: 600, color: C.white }}>
                        {title || "Document PDF"}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Annotation tools */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8, borderRight: "1px solid rgba(250,255,253,0.2)", paddingRight: 12 }}>
                            <button
                                onClick={() => toggleTool("pencil")}
                                title="Dessin (bientot)"
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    width: 32, height: 32, borderRadius: 6,
                                    border: activeTool === "pencil" ? "2px solid " + C.yellow : "1px solid rgba(250,255,253,0.15)",
                                    background: activeTool === "pencil" ? "rgba(244,207,21,0.15)" : "transparent",
                                    cursor: "not-allowed", color: activeTool === "pencil" ? C.yellow : C.white,
                                    opacity: 0.5,
                                }}
                                disabled
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                onClick={() => toggleTool("text")}
                                title="Annotation texte"
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    width: 32, height: 32, borderRadius: 6,
                                    border: activeTool === "text" ? "2px solid " + C.yellow : "1px solid rgba(250,255,253,0.15)",
                                    background: activeTool === "text" ? "rgba(244,207,21,0.15)" : "transparent",
                                    cursor: "pointer", color: activeTool === "text" ? C.yellow : C.white,
                                }}
                            >
                                <Type size={15} />
                            </button>
                        </div>

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

                {/* PDF iframe + annotation overlay */}
                <div style={{ flex: 1, background: "#525659", position: "relative" }}>
                    <iframe
                        src={url}
                        style={{
                            width: "100%", height: "100%",
                            border: "none",
                        }}
                        title={title || "PDF"}
                    />

                    {/* Transparent overlay for capturing clicks in annotation mode */}
                    {isAnnotating && (
                        <div
                            ref={overlayRef}
                            onClick={handleOverlayClick}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            style={{
                                position: "absolute", inset: 0,
                                cursor: dragging ? "grabbing" : (activeTool === "text" ? "crosshair" : "default"),
                                zIndex: 10,
                            }}
                        >
                            {annotations.map((ann) => renderAnnotation(ann, true))}

                            {/* Active editing textarea */}
                            {editingId && editPos && (
                                <textarea
                                    ref={textareaRef}
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={handleTextareaKeyDown}
                                    onBlur={commitAnnotation}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Saisissez votre annotation..."
                                    style={{
                                        position: "absolute",
                                        left: editPos.x,
                                        top: editPos.y,
                                        minWidth: 120, minHeight: 50,
                                        background: "rgba(255,255,255,0.97)",
                                        border: "1px solid " + C.yellow,
                                        borderRadius: 4,
                                        padding: 4,
                                        fontSize: 13,
                                        color: C.dark,
                                        fontFamily: "Inter, sans-serif",
                                        resize: "both",
                                        outline: "none",
                                        zIndex: 20,
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Show annotations when not in annotation mode */}
                    {!isAnnotating && annotations.length > 0 && (
                        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
                            {annotations.map((ann) => renderAnnotation(ann, false))}
                        </div>
                    )}
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
