import * as React from "react"
import { cn } from "@/lib/utils"

/* A one time hint beside what it is about, in the raised tip's look and on
   one line. It goes after a few seconds, or at the first press of anything,
   and clicks go through it, so a press on what lies under it still works.
   Put it inside a relative box next to the thing it explains; side says
   which way it stands off. useCoachMark keeps it to once, in storage. */

const STORAGE_PREFIX = "pg-coach-mark:"

function seen(key: string) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) === "1"
  } catch {
    return false
  }
}

/* Whether the hint shows: once, the first time `when` turns true. With
   storage off it may come back after a reload, which is harmless */
function useCoachMark(storageKey: string, when = true) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!when || seen(storageKey)) return
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, "1")
    } catch {
      /* storage off */
    }
    setOpen(true)
  }, [storageKey, when])
  const dismiss = React.useCallback(() => setOpen(false), [])
  return { open, dismiss }
}

const SIDE = {
  right: "top-1/2 left-full ml-2 -translate-y-1/2",
  left: "top-1/2 right-full mr-2 -translate-y-1/2",
  bottom: "top-full left-0 mt-2",
  top: "bottom-full left-0 mb-2",
} as const

/* How long it fades before it is gone */
const LEAVE_MS = 120

function CoachMark({
  className,
  open = true,
  onDismiss,
  duration = 6000,
  dismissOnInput = true,
  side = "right",
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean
  /** it has faded out: set open to false */
  onDismiss?: () => void
  /** ms before it goes on its own; 0 keeps it */
  duration?: number
  /** goes at the first press or key anywhere */
  dismissOnInput?: boolean
  side?: keyof typeof SIDE
}) {
  const [leaving, setLeaving] = React.useState(false)
  React.useEffect(() => {
    if (!open) return
    const leave = () => setLeaving(true)
    const t = duration > 0 ? window.setTimeout(leave, duration) : 0
    if (dismissOnInput) {
      window.addEventListener("pointerdown", leave, { capture: true })
      window.addEventListener("keydown", leave, { capture: true })
    }
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("pointerdown", leave, { capture: true })
      window.removeEventListener("keydown", leave, { capture: true })
    }
  }, [open, duration, dismissOnInput])
  React.useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => {
      setLeaving(false)
      onDismiss?.()
    }, LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, onDismiss])
  if (!open) return null
  return (
    <div
      role="status"
      data-slot="coach-mark"
      data-side={side}
      data-leaving={leaving || undefined}
      className={cn(
        "pointer-events-none absolute z-50 flex h-[1.875rem] w-max animate-menu-in items-center gap-1.5 rounded-md border border-border-strong bg-surface-raised px-3 text-xs whitespace-nowrap text-muted-foreground shadow-panel transition-opacity duration-[120ms] data-leaving:opacity-0 motion-reduce:animate-none",
        SIDE[side],
        className
      )}
      {...props}
    />
  )
}

export { CoachMark, useCoachMark }
