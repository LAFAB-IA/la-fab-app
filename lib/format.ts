const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
})

const dateShortFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
})

export function formatPrice(amount: number): string {
    return priceFormatter.format(amount)
}

export function formatDate(date: string): string {
    return dateFormatter.format(new Date(date))
}

export function formatDateShort(date: string): string {
    return dateShortFormatter.format(new Date(date))
}

/**
 * Generate a display name for a project based on role.
 * - admin: "ClientName / ProductNames"
 * - supplier: "Client / ProductNames"
 * - client: "ProductNames"
 */
export function projectDisplayName(project: any, role?: string): string {
    // Build product name from products array or brief_analysis
    const products = project.brief_analysis?.products
    let productName = ""
    if (Array.isArray(products) && products.length > 0) {
        const names = products
            .slice(0, 2)
            .map((p: any) => p.product_type || p.name)
            .filter(Boolean)
        productName = names.join(" + ")
        if (products.length > 2) productName += ` +${products.length - 2}`
    }
    if (!productName) {
        productName = project.product?.label || project.brief_analysis?.product_type || "Projet"
    }

    if (role === "admin") {
        const clientName = project.client_name || project.account_name || ""
        return clientName ? `${clientName} / ${productName}` : productName
    }
    if (role === "supplier") {
        return `Client / ${productName}`
    }
    return productName
}

export function timeAgo(date: string): string {
    const now = Date.now()
    const then = new Date(date).getTime()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return "à l'instant"
    if (diffMin < 60) return `il y a ${diffMin} min`
    if (diffH < 24) return `il y a ${diffH} h`
    if (diffD === 1) return "Hier"
    if (diffD < 7) return `il y a ${diffD} jours`
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(date))
}
