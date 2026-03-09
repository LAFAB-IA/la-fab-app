"use client"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { useWebSocket } from "@/lib/sdk/frontend-sdk/hooks"
import { timeAgo } from "@/lib/format"
import { Send, Upload, Download, FileText, FileSpreadsheet, FileImage, FileType, File, X, Loader2 } from "lucide-react"

interface ProjectWorkspaceProps {
  projectId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function getFileIcon(mimetype: string) {
  if (!mimetype) return File
  if (mimetype.startsWith("image/")) return FileImage
  if (mimetype.includes("pdf")) return FileText
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel") || mimetype.includes("csv")) return FileSpreadsheet
  if (mimetype.includes("word") || mimetype.includes("document")) return FileType
  return File
}

function getRoleColor(role: string): string {
  if (role === "client") return "#1a3c7a"
  if (role === "supplier") return "#e65100"
  return "#000000"
}

function getRoleLabel(role: string): string {
  if (role === "admin") return "LA FAB"
  if (role === "client") return "Client"
  return "Fournisseur"
}

export default function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const { user, token } = useAuth()
  const ws = useWebSocket(token)

  const [messages, setMessages] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch initial data
  useEffect(() => {
    if (!projectId || !token) return
    setLoading(true)
    fetchWithAuth(`${API_URL}/api/project/${projectId}/workspace`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setMessages(data.messages || [])
          setFiles(data.files || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, token])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // WebSocket listeners
  useEffect(() => {
    if (!ws || !projectId) return
    const unsubMsg = ws.on("project:message", (data: any) => {
      if (data.project_id === projectId) {
        setMessages((prev) => [...prev, data])
      }
    })
    const unsubFile = ws.on("project:file", (data: any) => {
      if (data.project_id === projectId) {
        setFiles((prev) => [...prev, data])
      }
    })
    return () => {
      unsubMsg()
      unsubFile()
    }
  }, [ws, projectId])

  // Send message
  const handleSend = useCallback(() => {
    if (!token || !msgText.trim() || sending) return
    setSending(true)
    fetchWithAuth(`${API_URL}/api/project/${projectId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message: msgText.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.message) {
          setMessages((prev) => [...prev, data.message])
          setMsgText("")
          if (textareaRef.current) textareaRef.current.style.height = "auto"
        }
      })
      .catch(() => {})
      .finally(() => setSending(false))
  }, [token, msgText, sending, projectId])

  // Upload file
  const handleUpload = useCallback((file: globalThis.File) => {
    if (!token || uploading) return
    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_URL}/api/project/${projectId}/files`)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (data.ok && data.file) {
          setFiles((prev) => [...prev, data.file])
        }
      } catch {}
      setUploading(false)
      setUploadProgress(0)
    }
    xhr.onerror = () => {
      setUploading(false)
      setUploadProgress(0)
    }
    xhr.send(formData)
  }, [token, uploading, projectId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-expand textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMsgText(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.muted, gap: 10 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Chargement...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 0, fontFamily: "Inter, sans-serif", minHeight: 500 }}>
      {/* Messages Column - 60% */}
      <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", borderRight: "1px solid " + C.border }} className="pw-messages">
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontSize: 13, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Messages
        </div>

        {/* Message List */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: 500 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 40 }}>Aucun message pour le moment</div>
          )}
          {messages.map((msg: any, idx: number) => {
            const isMe = msg.sender_id === user?.id
            const roleColor = getRoleColor(msg.sender_role)
            const label = isMe ? "Vous" : (msg.sender_label || msg.sender_name || getRoleLabel(msg.sender_role))
            const initial = label.charAt(0).toUpperCase()

            return (
              <div key={msg.id || idx} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {!isMe && (
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", backgroundColor: roleColor,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                )}
                <div style={{
                  maxWidth: "70%", padding: "10px 14px", borderRadius: 12,
                  backgroundColor: isMe ? C.dark : C.white,
                  color: isMe ? C.white : C.dark,
                  fontSize: 14, lineHeight: 1.5,
                  border: isMe ? "none" : "1px solid " + C.border,
                }}>
                  {!isMe && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: roleColor, marginBottom: 4 }}>
                      {label}
                    </div>
                  )}
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.message || msg.content}</div>
                  <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.5)" : C.muted, marginTop: 4, textAlign: "right" }}>
                    {msg.created_at ? timeAgo(msg.created_at) : ""}
                  </div>
                </div>
                {isMe && (
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", backgroundColor: getRoleColor(user?.role || "client"),
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    V
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ borderTop: "1px solid " + C.border, padding: 12, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={msgText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            rows={1}
            style={{
              flex: 1, padding: "10px 14px", border: "1px solid " + C.border, borderRadius: 8,
              fontSize: 14, color: C.dark, backgroundColor: C.white, outline: "none",
              fontFamily: "Inter, sans-serif", resize: "none", lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !msgText.trim()}
            style={{
              padding: 10, backgroundColor: sending || !msgText.trim() ? C.muted : C.yellow,
              color: C.dark, border: "none", borderRadius: 8, cursor: sending || !msgText.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {sending ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* Files Column - 40% */}
      <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column" }} className="pw-files">
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontSize: 13, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Fichiers
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "6px 12px", backgroundColor: C.yellow, color: C.dark, border: "none",
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Upload size={13} /> Ajouter
          </button>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={{ padding: "8px 20px" }}>
            <div style={{ height: 4, borderRadius: 2, backgroundColor: C.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: uploadProgress + "%", backgroundColor: C.yellow, borderRadius: 2, transition: "width 0.2s" }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: "center" }}>{uploadProgress}%</div>
          </div>
        )}

        {/* Drop zone + Files grid */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            flex: 1, overflowY: "auto", padding: 16,
            backgroundColor: dragOver ? "rgba(244,207,21,0.08)" : "transparent",
            border: dragOver ? "2px dashed " + C.yellow : "2px dashed transparent",
            transition: "all 0.2s",
          }}
        >
          {files.length === 0 && !dragOver && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 40 }}>
              <Upload size={28} style={{ marginBottom: 8, opacity: 0.4 }} /><br />
              Glissez vos fichiers ici
            </div>
          )}

          {dragOver && files.length === 0 && (
            <div style={{ textAlign: "center", color: C.yellow, fontSize: 14, fontWeight: 600, padding: 40 }}>
              Déposez le fichier ici
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {files.map((f: any) => {
              const Icon = getFileIcon(f.file_type)
              const isMedia = f.file_type?.startsWith("image/") || f.file_type?.startsWith("video/")
              const uploaderColor = getRoleColor(f.uploader_role)
              const uploaderLabel = getRoleLabel(f.uploader_role)

              return (
                <div key={f.id} style={{
                  border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden",
                  backgroundColor: C.white, fontSize: 12,
                }}>
                  {/* Preview */}
                  {isMedia ? (
                    f.file_type?.startsWith("video/") ? (
                      <video src={f.signed_url} style={{ width: "100%", height: 90, objectFit: "cover" }} muted />
                    ) : (
                      <img src={f.signed_url} alt={f.file_name} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                    )
                  ) : (
                    <div style={{ width: "100%", height: 90, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
                      <Icon size={28} color={C.muted} />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }} title={f.file_name}>
                      {f.file_name?.length > 20 ? f.file_name.slice(0, 20) + "…" : f.file_name}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>
                      {formatFileSize(f.file_size)} · {f.created_at ? timeAgo(f.created_at) : ""}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: uploaderColor,
                        backgroundColor: uploaderColor + "12", padding: "2px 6px", borderRadius: 4,
                      }}>
                        {uploaderLabel}
                      </span>
                      <a href={f.signed_url} download={f.file_name} style={{ color: C.muted, display: "flex" }} title="Télécharger">
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .pw-messages { flex: 1 1 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; }
          .pw-files { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  )
}
