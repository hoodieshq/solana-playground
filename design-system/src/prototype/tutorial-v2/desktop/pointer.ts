import { useSyncExternalStore } from "react"

// A finger, as on a tablet. Sizes for it are set in CSS with pointer-coarse:, this is for behaviour
const COARSE = window.matchMedia("(pointer: coarse)")
// A mouse or a trackpad that can hover: the setup where shortcuts are worth showing
const FINE = window.matchMedia("(hover: hover) and (pointer: fine)")

export const isCoarse = () => COARSE.matches

const watch = (query: MediaQueryList) => (onChange: () => void) => {
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Whether the main pointer is a finger. Follows the setting live, as a tablet with a trackpad switches */
export const useCoarse = () => useSyncExternalStore(watch(COARSE), isCoarse)

// A key pressed on a real keyboard, once. The on-screen one only types into a field, so a key with
// a modifier, or one pressed outside a field, is a keyboard someone has plugged in
let typed = false
const listeners = new Set<() => void>()
window.addEventListener(
  "keydown",
  (e) => {
    if (typed) return
    const field = e.target instanceof HTMLElement && !!e.target.closest("textarea, input, [contenteditable]")
    if (!e.metaKey && !e.ctrlKey && !e.altKey && field) return
    typed = true
    listeners.forEach((l) => l())
  },
  { capture: true }
)

function subscribeHints(onChange: () => void) {
  listeners.add(onChange)
  const stop = watch(FINE)(onChange)
  return () => {
    listeners.delete(onChange)
    stop()
  }
}

/** Whether to show keyboard shortcuts: with a mouse, or once a real keyboard has been used. On a
 * tablet held in the hand ⌘↵ and 1, 2, 3 name keys nobody has */
export const useKeyHints = () => useSyncExternalStore(subscribeHints, () => typed || FINE.matches)
