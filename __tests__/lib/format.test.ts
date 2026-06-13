import { formatPrice, formatDate } from "@/lib/format"

// Intl en fr-FR utilise des espaces insécables (U+00A0, U+202F) comme séparateurs.
// On normalise pour comparer avec des espaces ordinaires.
function norm(s: string): string {
    return s.replace(/ | /g, " ")
}

describe("formatPrice", () => {
    it("formate 0 en '0,00 €'", () => {
        expect(norm(formatPrice(0))).toBe("0,00 €")
    })

    it("formate 1500 avec séparateur de milliers", () => {
        expect(norm(formatPrice(1500))).toBe("1 500,00 €")
    })

    it("retourne '—' pour null", () => {
        expect(formatPrice(null)).toBe("—")
    })

    it("retourne '—' pour undefined", () => {
        expect(formatPrice(undefined)).toBe("—")
    })
})

describe("formatDate", () => {
    it("formate une date ISO en français lisible", () => {
        const result = formatDate("2026-06-13T12:00:00Z")
        expect(result).toMatch(/13/)
        expect(result).toMatch(/juin/i)
        expect(result).toMatch(/2026/)
    })

    it("retourne '—' pour null", () => {
        expect(formatDate(null)).toBe("—")
    })

    it("retourne '—' pour chaîne vide", () => {
        expect(formatDate("")).toBe("—")
    })
})
