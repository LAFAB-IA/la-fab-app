"use client"
import { useState } from "react"
import { Download } from "lucide-react"
import { fetchWithAuth } from "@/lib/api"
import { API_URL, C } from "@/lib/constants"

interface ExportButtonProps {
    endpoint: string   // path relative to API_URL, e.g. "/api/admin/projects/export"
    filename: string   // base filename (date appended automatically)
    label?: string
}

export function ExportButton({ endpoint, filename, label = "Exporter CSV" }: ExportButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleExport() {
        setLoading(true)
        try {
            const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`
            const res = await fetchWithAuth(url)
            if (!res.ok) throw new Error(`Export failed: ${res.status}`)
            const blob = await res.blob()
            const objectUrl = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = objectUrl
            a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(objectUrl)
        } catch (err) {
            console.error("Export failed", err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                backgroundColor: C.yellow,
                color: "#000000",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
                whiteSpace: "nowrap",
            }}
        >
            <Download size={14} />
            {loading ? "Export en cours..." : label}
        </button>
    )
}
