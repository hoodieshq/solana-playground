import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// The chat column's range (D22). The workspace never drops under 560 beside it
const MIN = 340
const MAX = 560
const WORKSPACE_MIN = 560
const RAIL = 52
// A press of an arrow key moves the edge by this much, about one word of the chat
const STEP = 16
const KEY = "pg-proto-column-width-v2"

const clamp = (w: number) => Math.min(Math.max(MIN, Math.min(MAX, window.innerWidth - RAIL - WORKSPACE_MIN)), Math.max(MIN, Math.round(w)))

/** Until someone drags the edge, the chat takes about the share chat columns take beside an open
 * workspace: 360 in the tablet's 1152, 400 at 1280, 420 at 1440, 460 at 1728, never under 360 or
 * over 480 (D22). Under 1280 it gives way faster, so the editor keeps its room */
const byWindow = () => {
  const w = window.innerWidth
  const chat = w < 1280 ? 400 - (1280 - w) * 0.3125 : 400 + (w - 1280) * 0.134
  return Math.round(Math.min(480, Math.max(360, chat)))
}

function stored(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? clamp(Number(raw)) : null
  } catch {
    return null
  }
}

function store(w: number | null) {
  try {
    if (w === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(w))
  } catch {
    // Storage blocked: the width lasts until the page reloads
  }
}

/** The chat's column, between the nav and the workspace, as ChatGPT and Claude lay it out (D1). It
 * carries the whole tutorial: the conversation is the lesson. Its right edge drags, and takes the
 * arrow keys once focused, so a long answer or a narrow editor can both win. A double click or a
 * double tap on it gives the width back to the window */
export function Column({ label, children }: { label: string; children: ReactNode }) {
  const [width, setWidth] = useState(() => stored() ?? byWindow())
  const chosen = useRef(stored() !== null)
  const drag = useRef<{ x: number; width: number; moved: boolean } | null>(null)

  // A window that changes size moves the default with it, never a width someone picked
  useEffect(() => {
    const onResize = () => {
      if (!chosen.current) setWidth(byWindow())
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const pick = (w: number) => {
    const next = clamp(w)
    chosen.current = true
    setWidth(next)
    store(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, width, moved: false }
  }
  // The edge is on the column's right, so moving it right makes the column wider
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || e.clientX === drag.current.x) return
    drag.current.moved = true
    setWidth(clamp(drag.current.width + e.clientX - drag.current.x))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    // A press that didn't move picks nothing, so a double click or tap can hand the width back
    if (drag.current.moved) pick(width)
    drag.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  // Back to what the window gives, as if nobody had dragged it
  const reset = () => {
    chosen.current = false
    setWidth(byWindow())
    store(null)
  }
  // A double tap, as two taps that land close in time. A double click fires on its own
  const lastTap = useRef(0)
  const onPointerDownTap = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return
    if (e.timeStamp - lastTap.current < 300) reset()
    lastTap.current = e.timeStamp
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = e.shiftKey ? STEP * 4 : STEP
    const to =
      e.key === "ArrowRight" ? width + by : e.key === "ArrowLeft" ? width - by : e.key === "Home" ? MIN : e.key === "End" ? MAX : null
    if (to === null) return
    e.preventDefault()
    pick(to)
  }

  return (
    <aside aria-label={label} style={{ width: clamp(width) }} className="relative flex shrink-0 flex-col border-r border-border bg-surface-base">
      {/* 9px to grab, centred on the 1px border, which lights up while it's held or focused. A finger
          gets 26px and a grip that always shows, since there's no hover to find the edge by */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize the ${label.toLowerCase()} column`}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={clamp(width)}
        onPointerDown={(e) => {
          onPointerDownTap(e)
          onPointerDown(e)
        }}
        onDoubleClick={reset}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "group absolute inset-y-0 -right-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none pointer-coarse:-right-[13px] pointer-coarse:w-[26px]",
          "after:absolute after:inset-y-0 after:left-1 after:w-px after:transition-colors after:duration-150 hover:after:bg-border-strong focus-visible:after:w-0.5 focus-visible:after:bg-ring active:after:bg-ring motion-reduce:after:transition-none pointer-coarse:after:left-[12.5px]"
        )}
      >
        {/* A grip mid-height while it's held or focused, so the keyboard sees what the arrows move. For a
            finger it stays, wider, as a pill to take hold of */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-[3px] h-8 w-[3px] -translate-y-1/2 rounded-full bg-ring opacity-0 group-focus-visible:opacity-100 group-active:opacity-100 pointer-coarse:left-[10px] pointer-coarse:h-10 pointer-coarse:w-[6px] pointer-coarse:bg-border-strong pointer-coarse:opacity-100 pointer-coarse:group-active:bg-ring"
        />
      </div>
      {children}
    </aside>
  )
}
