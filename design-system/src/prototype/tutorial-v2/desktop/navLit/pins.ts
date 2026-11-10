import { useEffect, useState } from "react"

/** Pins made from a row's menu, by name, laid over the nav state's own: true pinned, false unpinned.
 * Kept in this browser, so a pin survives a reload and a state switch */
const KEY = "pg-proto-nav-pins"
const EVENT = "pg-proto-nav-pins"

const read = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}")
  } catch {
    return {}
  }
}

export function setPinned(name: string, pinned: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [name]: pinned }))
  } catch {
    // Storage off: the pin lasts until the page reloads
  }
  window.dispatchEvent(new Event(EVENT))
}

export function usePins() {
  const [pins, setPins] = useState(read)
  useEffect(() => {
    const update = () => setPins(read())
    window.addEventListener(EVENT, update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener("storage", update)
    }
  }, [])
  return pins
}
