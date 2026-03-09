import { useState, useMemo } from "react"

export type ViewMode = "list" | "grid" | "group"

export interface StatusOption {
    value: string
    label: string
    order: number
}

export interface TypeOption {
    value: string
    label: string
}

export interface SortOption {
    key: string
    label: string
}

export interface AdvancedFilters {
    statuses: string[]
    types: string[]
    dateFrom: string
    dateTo: string
    priceMin: string
    priceMax: string
}

const EMPTY_FILTERS: AdvancedFilters = { statuses: [], types: [], dateFrom: "", dateTo: "", priceMin: "", priceMax: "" }

export interface ListViewConfig<T> {
    storageKey: string
    defaultViewMode: ViewMode
    searchFields: (item: T) => (string | null | undefined)[]
    statusOptions?: StatusOption[]
    typeOptions?: TypeOption[]
    getItemStatus?: (item: T) => string
    getItemDate?: (item: T) => string
    getItemPrice?: (item: T) => number | null
    getItemType?: (item: T) => string
    sortOptions?: SortOption[]
    getSortValue?: (item: T, key: string) => string | number
    defaultSortKey?: string
    defaultSortDir?: "asc" | "desc"
}

export interface UseListViewReturn<T> {
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void
    search: string
    setSearch: (s: string) => void
    filters: AdvancedFilters
    setFilters: (f: AdvancedFilters) => void
    sortKey: string
    setSortKey: (k: string) => void
    sortDir: "asc" | "desc"
    setSortDir: (d: "asc" | "desc") => void
    filtered: T[]
    grouped: Record<string, T[]>
    sortedGroupKeys: string[]
    collapsed: Record<string, boolean>
    toggleCollapsed: (key: string) => void
    activeFilterCount: number
    resetFilters: () => void
}

export default function useListView<T>(data: T[], config: ListViewConfig<T>): UseListViewReturn<T> {
    const [viewMode, setViewModeState] = useState<ViewMode>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(config.storageKey) as ViewMode | null
            if (saved) return saved
        }
        return config.defaultViewMode
    })

    const [search, setSearch] = useState("")
    const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS)
    const [sortKey, setSortKey] = useState(config.defaultSortKey || "")
    const [sortDir, setSortDir] = useState<"asc" | "desc">(config.defaultSortDir || "desc")
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

    function setViewMode(mode: ViewMode) {
        setViewModeState(mode)
        localStorage.setItem(config.storageKey, mode)
    }

    function toggleCollapsed(key: string) {
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.statuses.length > 0) count++
        if (filters.types.length > 0) count++
        if (filters.dateFrom || filters.dateTo) count++
        if (filters.priceMin || filters.priceMax) count++
        return count
    }, [filters])

    function resetFilters() {
        setFilters(EMPTY_FILTERS)
    }

    const filtered = useMemo(() => {
        let result = data

        // Search
        const q = search.toLowerCase().trim()
        if (q) {
            result = result.filter(item => {
                const fields = config.searchFields(item)
                return fields.some(f => f && String(f).toLowerCase().includes(q))
            })
        }

        // Status filter
        if (filters.statuses.length > 0 && config.getItemStatus) {
            result = result.filter(item => filters.statuses.includes(config.getItemStatus!(item)))
        }

        // Type filter
        if (filters.types.length > 0 && config.getItemType) {
            result = result.filter(item => filters.types.includes(config.getItemType!(item)))
        }

        // Date filter
        if ((filters.dateFrom || filters.dateTo) && config.getItemDate) {
            result = result.filter(item => {
                const d = config.getItemDate!(item)
                if (!d) return false
                const ts = new Date(d).getTime()
                if (filters.dateFrom && ts < new Date(filters.dateFrom).getTime()) return false
                if (filters.dateTo && ts > new Date(filters.dateTo + "T23:59:59").getTime()) return false
                return true
            })
        }

        // Price filter
        if ((filters.priceMin || filters.priceMax) && config.getItemPrice) {
            result = result.filter(item => {
                const p = config.getItemPrice!(item)
                if (p == null) return false
                if (filters.priceMin && p < Number(filters.priceMin)) return false
                if (filters.priceMax && p > Number(filters.priceMax)) return false
                return true
            })
        }

        // Sort
        if (sortKey && config.getSortValue) {
            result = [...result].sort((a, b) => {
                const va = config.getSortValue!(a, sortKey)
                const vb = config.getSortValue!(b, sortKey)
                let cmp = 0
                if (typeof va === "string" && typeof vb === "string") {
                    cmp = va.localeCompare(vb)
                } else {
                    cmp = (Number(va) || 0) - (Number(vb) || 0)
                }
                return sortDir === "asc" ? cmp : -cmp
            })
        }

        return result
    }, [data, search, filters, sortKey, sortDir, config])

    const grouped = useMemo(() => {
        const g: Record<string, T[]> = {}
        for (const item of filtered) {
            const key = config.getItemStatus ? config.getItemStatus(item) : "default"
            if (!g[key]) g[key] = []
            g[key].push(item)
        }
        return g
    }, [filtered, config])

    const sortedGroupKeys = useMemo(() => {
        if (!config.statusOptions) return Object.keys(grouped)
        return Object.keys(grouped).sort((a, b) => {
            const oa = config.statusOptions!.find(s => s.value === a)?.order ?? 99
            const ob = config.statusOptions!.find(s => s.value === b)?.order ?? 99
            return oa - ob
        })
    }, [grouped, config.statusOptions])

    return {
        viewMode, setViewMode,
        search, setSearch,
        filters, setFilters,
        sortKey, setSortKey,
        sortDir, setSortDir,
        filtered,
        grouped, sortedGroupKeys,
        collapsed, toggleCollapsed,
        activeFilterCount,
        resetFilters,
    }
}
