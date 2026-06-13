import React from "react"
import { render, act } from "@testing-library/react"
import Toast from "@/components/shared/Toast"

// jsdom normalise les couleurs hex en rgb() — helper de conversion
function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${r}, ${g}, ${b})`
}

describe("Toast", () => {
    it("affiche un fond noir (#000000) pour type 'success'", () => {
        const { container } = render(
            <Toast message="Succès" type="success" onDismiss={() => {}} />
        )
        const div = container.firstChild as HTMLElement
        expect(div.style.backgroundColor).toBe(hexToRgb("#000000"))
    })

    it("affiche un fond rouge (#c0392b) pour type 'error'", () => {
        const { container } = render(
            <Toast message="Erreur" type="error" onDismiss={() => {}} />
        )
        const div = container.firstChild as HTMLElement
        expect(div.style.backgroundColor).toBe(hexToRgb("#c0392b"))
    })

    it("affiche le message passé en prop", () => {
        const { getByText } = render(
            <Toast message="Projet supprimé" type="success" onDismiss={() => {}} />
        )
        expect(getByText("Projet supprimé")).toBeTruthy()
    })

    it("appelle onDismiss automatiquement après 2500ms", () => {
        jest.useFakeTimers()
        const onDismiss = jest.fn()

        render(<Toast message="Test" type="success" onDismiss={onDismiss} />)

        expect(onDismiss).not.toHaveBeenCalled()

        act(() => {
            jest.advanceTimersByTime(2500)
        })

        expect(onDismiss).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
    })

    it("n'appelle pas onDismiss avant 2500ms", () => {
        jest.useFakeTimers()
        const onDismiss = jest.fn()

        render(<Toast message="Test" type="error" onDismiss={onDismiss} />)

        act(() => {
            jest.advanceTimersByTime(2499)
        })

        expect(onDismiss).not.toHaveBeenCalled()
        jest.useRealTimers()
    })
})
