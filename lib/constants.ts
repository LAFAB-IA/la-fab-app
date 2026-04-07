export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://la-fabriq-ia-gateway.onrender.com"

/**
 * Theme tokens — resolved at runtime via CSS variables defined in app/globals.css.
 * Switching the html `dark`/`light` class (via next-themes) automatically updates
 * every component using inline styles like `backgroundColor: C.bg`.
 *
 * `yellow` stays brand-fixed in both themes.
 */
export const C = {
    dark:    "var(--c-dark)",
    yellow:  "#F4CF15",
    white:   "var(--c-white)",
    bg:      "var(--c-bg)",
    border:  "var(--c-border)",
    muted:   "var(--c-muted)",
    /** Surface for buttons / inputs / hover targets — darker than `white` in dark mode */
    surface: "var(--c-surface)",
}
