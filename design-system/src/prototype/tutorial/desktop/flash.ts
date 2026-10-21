import { useEffect, useState } from "react"

// A shortcut pressed, told to whatever shows its keys: the hint lights up for a moment, so the
// learner sees the key worked and which button it pressed
const bus = new EventTarget()

export const flashKeys = (keys: string) => bus.dispatchEvent(new CustomEvent("flash", { detail: keys }))

/** How long a pressed hint stays lit, and stays on a button that has just gone busy */
export const FLASH_MS = 320

/** `n` counts presses of `keys`, to key the hint's flash by, so each press plays it again. `on` is
 * true for a moment after each: a hint lights only then, so one that mounts later stays quiet, and a
 * button that no longer shows its hint (Build, once it reads Building...) keeps it just for the flash */
export function useFlash(keys: string) {
  const [n, setN] = useState(0)
  const [on, setOn] = useState(false)
  useEffect(() => {
    let t = 0
    const hit = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== keys) return
      setN((x) => x + 1)
      setOn(true)
      window.clearTimeout(t)
      t = window.setTimeout(() => setOn(false), FLASH_MS)
    }
    bus.addEventListener("flash", hit)
    return () => {
      bus.removeEventListener("flash", hit)
      window.clearTimeout(t)
    }
  }, [keys])
  return { n, on }
}
