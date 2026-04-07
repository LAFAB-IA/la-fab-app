import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(", ")

/**
 * Traps keyboard focus inside `containerRef` while `isOpen` is true.
 * - On open: saves the triggering element and focuses the first focusable child.
 * - Tab / Shift+Tab: cycles only within the container.
 * - Escape: calls `onClose` if provided.
 * - On close: returns focus to the element that triggered the modal.
 */
export default function useFocusTrap(
    isOpen: boolean,
    containerRef: React.RefObject<HTMLElement | null>,
    onClose?: () => void,
) {
    const triggerRef = useRef<Element | null>(null)
    // Keep the callback ref in sync without recreating the listener
    const onCloseRef = useRef(onClose)
    useEffect(() => { onCloseRef.current = onClose })

    // Focus trap + Escape handler
    useEffect(() => {
        if (!isOpen) return

        // Capture whatever had focus before the modal opened
        triggerRef.current = document.activeElement

        // Focus first interactive element inside the container
        const container = containerRef.current
        if (container) {
            const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTORS)
            first?.focus()
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                onCloseRef.current?.()
                return
            }

            if (e.key !== "Tab") return

            const c = containerRef.current
            if (!c) return

            const focusable = Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const active = document.activeElement

            if (e.shiftKey) {
                if (active === first || !c.contains(active)) {
                    e.preventDefault()
                    last.focus()
                }
            } else {
                if (active === last || !c.contains(active)) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, containerRef])

    // Restore focus when the modal closes
    useEffect(() => {
        if (!isOpen && triggerRef.current) {
            ;(triggerRef.current as HTMLElement).focus?.()
            triggerRef.current = null
        }
    }, [isOpen])
}
