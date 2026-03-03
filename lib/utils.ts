export function getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
}

export function setToken(token: string): void {
    localStorage.setItem("access_token", token)
}

export function clearToken(): void {
    localStorage.removeItem("access_token")
}

export function exportCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const rows = data.map((row) =>
        headers.map((h) => {
            const val = row[h] ?? ""
            const str = typeof val === "object" ? JSON.stringify(val) : String(val)
            return `"${str.replace(/"/g, '""')}"`
        }).join(",")
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename + "_" + new Date().toISOString().slice(0, 10) + ".csv"
    a.click()
    URL.revokeObjectURL(url)
}