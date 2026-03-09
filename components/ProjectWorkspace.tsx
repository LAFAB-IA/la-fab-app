"use client"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { API_URL, C } from "@/lib/constants"
import { useAuth } from "@/components/AuthProvider"
import { fetchWithAuth } from "@/lib/api"
import { useWebSocket } from "@/lib/sdk/frontend-sdk/hooks"
import { timeAgo } from "@/lib/format"
import { Send, Upload, Download, FileText, FileSpreadsheet, FileImage, FileType, File, Loader2, Sparkles } from "lucide-react"

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

// ─── Message Bubble ──────────────────────────────────────────────────
function MessageBubble({ msg, isMe, label, color }: { msg: any; isMe: boolean; label: string; color: string }) {
  const initial = label.charAt(0).toUpperCase()
  return (
    <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
      {!isMe && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", backgroundColor: color,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>
      )}
      <div style={{
        maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
        backgroundColor: isMe ? C.dark : C.white,
        color: isMe ? C.white : C.dark,
        fontSize: 13, lineHeight: 1.5,
        border: isMe ? "none" : "1px solid " + C.border,
      }}>
        {!isMe && (
          <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3 }}>{label}</div>
        )}
        <div style={{ whiteSpace: "pre-wrap" }}>{msg.message || msg.content}</div>
        <div style={{ fontSize: 9, color: isMe ? "rgba(255,255,255,0.5)" : C.muted, marginTop: 3, textAlign: "right" }}>
          {msg.created_at ? timeAgo(msg.created_at) : ""}
        </div>
      </div>
    </div>
  )
}

// ─── File Card ───────────────────────────────────────────────────────
function FileCard({ f }: { f: any }) {
  const Icon = getFileIcon(f.file_type)
  const isMedia = f.file_type?.startsWith("image/") || f.file_type?.startsWith("video/")
  return (
    <div style={{ border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden", backgroundColor: C.white, fontSize: 12 }}>
      {isMedia ? (
        f.file_type?.startsWith("video/") ? (
          <video src={f.signed_url} style={{ width: "100%", height: 80, objectFit: "cover" }} muted />
        ) : (
          <img src={f.signed_url} alt={f.file_name} style={{ width: "100%", height: 80, objectFit: "cover" }} />
        )
      ) : (
        <div style={{ width: "100%", height: 80, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
          <Icon size={24} color={C.muted} />
        </div>
      )}
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }} title={f.file_name}>
          {f.file_name?.length > 18 ? f.file_name.slice(0, 18) + "…" : f.file_name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 10 }}>{formatFileSize(f.file_size)}</span>
          <a href={f.signed_url} download={f.file_name} style={{ color: C.muted, display: "flex" }} title="Télécharger">
            <Download size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Message Input Bar ───────────────────────────────────────────────
function MessageInput({ onSend, sending }: { onSend: (text: string) => void; sending: boolean }) {
  const [text, setText] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!text.trim() || sending) return
    onSend(text.trim())
    setText("")
    if (ref.current) ref.current.style.height = "auto"
  }

  return (
    <div style={{ borderTop: "1px solid " + C.border, padding: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          e.target.style.height = "auto"
          e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"
        }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder="Écrire un message..."
        rows={1}
        style={{
          flex: 1, padding: "8px 12px", border: "1px solid " + C.border, borderRadius: 8,
          fontSize: 13, color: C.dark, backgroundColor: C.white, outline: "none",
          fontFamily: "Inter, sans-serif", resize: "none", lineHeight: 1.5,
        }}
      />
      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        style={{
          padding: 8, backgroundColor: sending || !text.trim() ? C.muted : C.yellow,
          color: C.dark, border: "none", borderRadius: 8, cursor: sending || !text.trim() ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {sending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
      </button>
    </div>
  )
}

// ─── File Upload Button ──────────────────────────────────────────────
function FileUploadButton({ onUpload, uploading }: { onUpload: (file: globalThis.File) => void; uploading: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        style={{
          padding: "4px 10px", backgroundColor: C.yellow, color: C.dark, border: "none",
          borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <Upload size={12} /> Ajouter
      </button>
      <input ref={ref} type="file" style={{ display: "none" }} onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onUpload(file)
        e.target.value = ""
      }} />
    </>
  )
}

// ─── Message Panel (reusable for admin columns and client/supplier view) ─
function MessagePanel({ title, messages, files, userId, color, onSend, sending, onUpload, uploading, showInput }: {
  title: string
  messages: any[]
  files: any[]
  userId: string
  color: string
  onSend?: (text: string) => void
  sending?: boolean
  onUpload?: (file: globalThis.File) => void
  uploading?: boolean
  showInput?: boolean
}) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid " + C.border,
        fontSize: 12, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{title}</span>
        {onUpload && <FileUploadButton onUpload={onUpload} uploading={uploading || false} />}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: 30 }}>Aucun message</div>
        )}
        {messages.map((msg: any, idx: number) => {
          const isMe = msg.sender_id === userId
          const label = msg.sender_label || (isMe ? "Vous" : (msg.sender_role === "admin" ? "LA FAB" : msg.sender_role === "client" ? "Client" : "Fournisseur"))
          return <MessageBubble key={msg.id || idx} msg={msg} isMe={isMe} label={label} color={color} />
        })}
        <div ref={endRef} />
      </div>

      {/* Files */}
      {files.length > 0 && (
        <div style={{ borderTop: "1px solid " + C.border, padding: 10, maxHeight: 180, overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
            Fichiers ({files.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {files.map((f: any) => <FileCard key={f.id} f={f} />)}
          </div>
        </div>
      )}

      {/* Input */}
      {showInput && onSend && <MessageInput onSend={onSend} sending={sending || false} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const { user, token } = useAuth()
  const ws = useWebSocket(token)

  const [messages, setMessages] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [role, setRole] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // AI panel state (admin only)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<{ recap: string; reponse_client: string; reponse_fournisseur: string } | null>(null)
  const [editClient, setEditClient] = useState("")
  const [editSupplier, setEditSupplier] = useState("")
  const [sendingClient, setSendingClient] = useState(false)
  const [sendingSupplier, setSendingSupplier] = useState(false)

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
          setRole(data.role || "")
          if (data.analysis) {
            setAnalysis(data.analysis)
            setEditClient(data.analysis.reponse_client || "")
            setEditSupplier(data.analysis.reponse_fournisseur || "")
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, token])

  // WebSocket listeners
  useEffect(() => {
    if (!ws || !projectId) return
    const unsubMsg = ws.on("project:message", (data: any) => {
      if (data.project_id === projectId && data.message) {
        setMessages((prev) => {
          if (prev.some((m: any) => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    })
    const unsubFile = ws.on("project:file", (data: any) => {
      if (data.project_id === projectId && data.file) {
        setFiles((prev) => {
          if (prev.some((f: any) => f.id === data.file.id)) return prev
          return [...prev, data.file]
        })
      }
    })
    return () => { unsubMsg(); unsubFile() }
  }, [ws, projectId])

  // Send message (client/supplier → LA FAB)
  const handleSend = useCallback((text: string) => {
    if (!token || sending) return
    setSending(true)
    fetchWithAuth(`${API_URL}/api/project/${projectId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message: text }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.message) {
          setMessages((prev) => [...prev, data.message])
        }
      })
      .catch(() => {})
      .finally(() => setSending(false))
  }, [token, sending, projectId])

  // Upload file
  const handleUpload = useCallback((file: globalThis.File) => {
    if (!token || uploading) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    fetchWithAuth(`${API_URL}/api/project/${projectId}/files`, {
      method: "POST",
      body: formData,
      rawBody: true,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.file) setFiles((prev) => [...prev, data.file])
      })
      .catch(() => {})
      .finally(() => setUploading(false))
  }, [token, uploading, projectId])

  // AI analyze (admin only)
  const handleAnalyze = useCallback(() => {
    if (!token || analyzing) return
    setAnalyzing(true)
    fetchWithAuth(`${API_URL}/api/project/${projectId}/ai-analyze`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.analysis) {
          setAnalysis(data.analysis)
          setEditClient(data.analysis.reponse_client || "")
          setEditSupplier(data.analysis.reponse_fournisseur || "")
        }
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false))
  }, [token, analyzing, projectId])

  // Send admin response
  const handleSendResponse = useCallback((target: "client" | "supplier") => {
    const text = target === "client" ? editClient : editSupplier
    if (!token || !text.trim()) return

    const setSendingFn = target === "client" ? setSendingClient : setSendingSupplier
    setSendingFn(true)

    fetchWithAuth(`${API_URL}/api/project/${projectId}/send-response`, {
      method: "POST",
      body: JSON.stringify({ target, message: text.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          if (data.message) setMessages((prev) => [...prev, data.message])
          if (target === "client") setEditClient("")
          else setEditSupplier("")
        }
      })
      .catch(() => {})
      .finally(() => setSendingFn(false))
  }, [token, editClient, editSupplier, projectId])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.muted, gap: 10 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Chargement...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const isAdmin = role === "admin"

  // ─── ADMIN VIEW: 3 horizontal panels ──────────────────────────────
  if (isAdmin) {
    const clientMessages = messages.filter((m: any) => m.sender_role === "client" || (m.sender_role === "admin" && m.target_role === "client"))
    const supplierMessages = messages.filter((m: any) => m.sender_role === "supplier" || (m.sender_role === "admin" && m.target_role === "supplier"))
    const clientFiles = files.filter((f: any) => f.uploader_role === "client")
    const supplierFiles = files.filter((f: any) => f.uploader_role === "supplier")

    return (
      <div style={{ display: "flex", fontFamily: "Inter, sans-serif", minHeight: 500, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* LEFT: Client messages + files */}
        <div style={{ flex: 1, borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <MessagePanel
            title="Client"
            messages={clientMessages}
            files={clientFiles}
            userId={user?.id || ""}
            color="#1a3c7a"
            showInput={false}
          />
        </div>

        {/* CENTER: AI Analysis Panel */}
        <div style={{ flex: 1, borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid " + C.border,
            fontSize: 12, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>Analyse IA</span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                padding: "5px 12px", backgroundColor: analyzing ? C.muted : C.yellow, color: C.dark,
                border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: analyzing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {analyzing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
              {analyzing ? "Analyse..." : "Analyser"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {!analysis && !analyzing && (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: 30 }}>
                Cliquez sur &quot;Analyser&quot; pour générer un récapitulatif et des réponses suggérées.
              </div>
            )}

            {analyzing && (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                Analyse en cours...
              </div>
            )}

            {analysis && (
              <>
                {/* Recap */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>Récapitulatif</div>
                  <div style={{ padding: 12, backgroundColor: "#f8f8f6", borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: C.dark, whiteSpace: "pre-wrap" }}>
                    {analysis.recap}
                  </div>
                </div>

                {/* Response to Client */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1a3c7a", textTransform: "uppercase", marginBottom: 6 }}>
                    Réponse au Client
                  </div>
                  <textarea
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%", padding: 10, border: "1px solid " + C.border, borderRadius: 8,
                      fontSize: 13, color: C.dark, fontFamily: "Inter, sans-serif", resize: "vertical",
                      lineHeight: 1.5, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() => handleSendResponse("client")}
                    disabled={sendingClient || !editClient.trim()}
                    style={{
                      marginTop: 6, padding: "6px 14px",
                      backgroundColor: sendingClient || !editClient.trim() ? C.muted : "#1a3c7a",
                      color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: sendingClient || !editClient.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {sendingClient ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                    Envoyer au Client
                  </button>
                </div>

                {/* Response to Supplier */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e65100", textTransform: "uppercase", marginBottom: 6 }}>
                    Réponse au Fournisseur
                  </div>
                  <textarea
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%", padding: 10, border: "1px solid " + C.border, borderRadius: 8,
                      fontSize: 13, color: C.dark, fontFamily: "Inter, sans-serif", resize: "vertical",
                      lineHeight: 1.5, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() => handleSendResponse("supplier")}
                    disabled={sendingSupplier || !editSupplier.trim()}
                    style={{
                      marginTop: 6, padding: "6px 14px",
                      backgroundColor: sendingSupplier || !editSupplier.trim() ? C.muted : "#e65100",
                      color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: sendingSupplier || !editSupplier.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {sendingSupplier ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                    Envoyer au Fournisseur
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Supplier messages + files */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <MessagePanel
            title="Fournisseur"
            messages={supplierMessages}
            files={supplierFiles}
            userId={user?.id || ""}
            color="#e65100"
            showInput={false}
          />
        </div>
      </div>
    )
  }

  // ─── CLIENT / SUPPLIER VIEW: 60/40 layout ─────────────────────────
  const myColor = role === "client" ? "#1a3c7a" : "#e65100"
  const myFiles = files.filter((f: any) => f.uploader_role === role || f.uploader_role === "admin")

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 0, fontFamily: "Inter, sans-serif", minHeight: 500, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Messages - 60% */}
      <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", borderRight: "1px solid " + C.border }} className="pw-messages">
        <MessagePanel
          title="Messages"
          messages={messages}
          files={[]}
          userId={user?.id || ""}
          color={myColor}
          onSend={handleSend}
          sending={sending}
          showInput={true}
        />
      </div>

      {/* Files - 40% */}
      <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column" }} className="pw-files">
        <div style={{
          padding: "10px 16px", borderBottom: "1px solid " + C.border,
          fontSize: 12, fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: 0.8,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Fichiers</span>
          <FileUploadButton onUpload={handleUpload} uploading={uploading} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {myFiles.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: 30 }}>
              <Upload size={24} style={{ marginBottom: 8, opacity: 0.4 }} /><br />
              Aucun fichier
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {myFiles.map((f: any) => <FileCard key={f.id} f={f} />)}
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .pw-messages { flex: 1 1 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; }
          .pw-files { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  )
}
