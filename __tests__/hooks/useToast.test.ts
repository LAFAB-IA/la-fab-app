import { renderHook, act } from "@testing-library/react"
import useToast from "@/hooks/useToast"

describe("useToast", () => {
    it("showToast crée un toast avec le bon message et le bon type", () => {
        const { result } = renderHook(() => useToast())

        act(() => {
            result.current.showToast("Opération réussie", "success")
        })

        expect(result.current.toast).not.toBeNull()
        expect(result.current.toast?.message).toBe("Opération réussie")
        expect(result.current.toast?.type).toBe("success")
    })

    it("hideToast remet toast à null", () => {
        const { result } = renderHook(() => useToast())

        act(() => {
            result.current.showToast("Test", "error")
        })
        expect(result.current.toast).not.toBeNull()

        act(() => {
            result.current.hideToast()
        })
        expect(result.current.toast).toBeNull()
    })

    it("showToast puis hideToast → état successivement non-null puis null", () => {
        const { result } = renderHook(() => useToast())

        act(() => {
            result.current.showToast("Message", "error")
        })
        expect(result.current.toast).toEqual({ message: "Message", type: "error" })

        act(() => {
            result.current.hideToast()
        })
        expect(result.current.toast).toBeNull()
    })
})
