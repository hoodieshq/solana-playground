import { useCallback, useEffect, useState } from "react"



const KEY = "pg-proto-v2-nav-hint"

const seen = () => {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

/** Whether the first fold's hint shows: once, the first time the nav folds for a tutorial */
export function useNavHint(folded: boolean) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!folded || seen()) return
    try {
      localStorage.setItem(KEY, "1")
    } catch {
      // Storage off: the hint may come back after a reload, which is harmless
    }
    setOn(true)
  }, [folded])
  const done = useCallback(() => setOn(false), [])
  return { on, done }
}

/** The one time hint beside the folded mark, in the tooltip's look, one line so it stays inside the
 * head row and never covers the step bar. It goes after 6 seconds, or at the first press of anything.
 * Clicks go through it, so a press on Tutorials under it still goes back */
export function NavHint({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const leave = () => setLeaving(true)
    const t = window.setTimeout(leave, 6000)
    window.addEventListener("pointerdown", leave, { capture: true })
    window.addEventListener("keydown", leave, { capture: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("pointerdown", leave, { capture: true })
      window.removeEventListener("keydown", leave, { capture: true })
    }
  }, [])
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onDone, 120)
    return () => window.clearTimeout(t)
  }, [leaving, onDone])
  return (
    <div
      role="status"
      data-nav-hint
      className="pointer-events-none absolute top-[7px] left-[3.75rem] z-50 flex h-[1.875rem] animate-menu-in items-center gap-1.5 rounded-md border border-border-strong bg-surface-raised px-3 text-xs whitespace-nowrap text-muted-foreground shadow-panel transition-opacity duration-[120ms] data-[leaving]:opacity-0"
      data-leaving={leaving || undefined}
    >
      The menu is folded to icons while you learn
    </div>
  )
}
