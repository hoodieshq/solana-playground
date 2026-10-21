import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// The product's own floor for the chat column
const MIN = 280
const MAX = 560
// A press of an arrow key moves the edge by this much, about one word of the lesson
const STEP = 16
const KEY = "pg-proto-column-width"

const clamp = (w: number) => Math.min(MAX, Math.max(MIN, Math.round(w)))

/** Until someone drags the edge, the column takes what the window can spare: the lesson's lines
 * stay short on a small screen and the code keeps its room */
const byWindow = () => (window.innerWidth >= 1440 ? 440 : window.innerWidth >= 1280 ? 400 : 360)

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

/** The lesson's column, on the right, where the product keeps the assistant's chat. During a
 * tutorial it carries the tutorial page, the step and the assistant's answers. Its left edge
 * drags, and takes the arrow keys once focused, so a long answer or a narrow editor can both win.
 * A double click or a double tap on it gives the width back to the window */
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
  // The edge is on the column's left, so moving it left makes the column wider
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || e.clientX === drag.current.x) return
    drag.current.moved = true
    setWidth(clamp(drag.current.width + drag.current.x - e.clientX))
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
      e.key === "ArrowLeft" ? width + by : e.key === "ArrowRight" ? width - by : e.key === "Home" ? MIN : e.key === "End" ? MAX : null
    if (to === null) return
    e.preventDefault()
    pick(to)
  }

  return (
    <aside aria-label={label} style={{ width }} className="relative flex shrink-0 flex-col border-l border-border bg-surface-base">
      {/* 9px to grab, centred on the 1px border, which lights up while it's held or focused. A finger
          gets 26px and a grip that always shows, since there's no hover to find the edge by */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize the ${label.toLowerCase()} column`}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={width}
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
          "group absolute inset-y-0 -left-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none pointer-coarse:-left-[13px] pointer-coarse:w-[26px]",
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
