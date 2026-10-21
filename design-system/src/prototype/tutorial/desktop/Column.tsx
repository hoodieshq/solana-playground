import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const MIN = 320
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

function store(w: number) {
  try {
    localStorage.setItem(KEY, String(w))
  } catch {
    // Storage blocked: the width lasts until the page reloads
  }
}

/** The lesson's column, on the right, where the product keeps the assistant's chat. During a
 * tutorial it carries the tutorial page, the step and the assistant's answers. Its left edge
 * drags, and takes the arrow keys once focused, so a long answer or a narrow editor can both win */
export function Column({ label, children }: { label: string; children: ReactNode }) {
  const [width, setWidth] = useState(() => stored() ?? byWindow())
  const chosen = useRef(stored() !== null)
  const drag = useRef<{ x: number; width: number } | null>(null)

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
    drag.current = { x: e.clientX, width }
  }
  // The edge is on the column's left, so moving it left makes the column wider
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setWidth(clamp(drag.current.width + drag.current.x - e.clientX))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    pick(width)
    e.currentTarget.releasePointerCapture(e.pointerId)
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
      {/* 9px to grab, centred on the 1px border, which lights up while it's held or focused */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize the ${label.toLowerCase()} column`}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={width}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "group absolute inset-y-0 -left-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none",
          "after:absolute after:inset-y-0 after:left-1 after:w-px after:transition-colors after:duration-150 hover:after:bg-border-strong focus-visible:after:w-0.5 focus-visible:after:bg-ring active:after:bg-ring motion-reduce:after:transition-none"
        )}
      >
        {/* A grip mid-height while it's held or focused, so the keyboard sees what the arrows move */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-[3px] h-8 w-[3px] -translate-y-1/2 rounded-full bg-ring opacity-0 group-focus-visible:opacity-100 group-active:opacity-100"
        />
      </div>
      {children}
    </aside>
  )
}
