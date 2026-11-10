import { X } from "lucide-react"
import { useEffect, useLayoutEffect, useState } from "react"
import { createPortal } from "react-dom"

import { StatusDot } from "@/components/ui/status-dot"

import { onProjectsEvent } from "../../programs/project"

/* The one line that points at Build after the first landing (CONSENSUS.md, 3.14). It lives over the
   shell, anchored to its [data-oak="build"] (or [data-oak="run"] for a client project), and shows
   once per device: it goes on ×, on Build pressed, or on the next "project:open", and never times
   out. No anchor on screen within 3 s: nothing shows and it stays owed */

type Kind = "build" | "express" | "run"

const LINES: Record<Kind, string> = {
  build: "Your program is ready. Press Build to compile it.",
  express: "Build is running. Press it again after you change the code.",
  run: "Your script is ready. Press Run to run it on devnet.",
}

const DONE = "oak.np.buildHintDone"

let armed: { kind: Kind; ignoreDone: boolean } | null = null

/** Set right before First Light lands, so the "project:open" it causes shows the hint */
export function armHint(kind: Kind, ignoreDone = false) {
  armed = { kind, ignoreDone }
}

const isDone = () => {
  try {
    return localStorage.getItem(DONE) !== null
  } catch {
    return false
  }
}

const markDone = () => {
  try {
    localStorage.setItem(DONE, "1")
  } catch {
    // Storage off: it may show again after a reload
  }
}

type Place = { top: number; left?: number; right?: number; caret: number }

export function BuildHint() {
  const [kind, setKind] = useState<Kind | null>(null)
  const [anchor, setAnchor] = useState<Element | null>(null)
  const [place, setPlace] = useState<Place | null>(null)

  const hide = () => {
    setKind((k) => {
      if (k) markDone()
      return null
    })
    setAnchor(null)
  }

  // Each landing either brings the hint (First Light armed it) or takes the old one away
  useEffect(
    () =>
      onProjectsEvent("project:open", () => {
        const a = armed
        armed = null
        hide()
        if (a && (a.ignoreDone || !isDone())) setKind(a.kind)
      }),
    []
  )

  // Wait for the shell's control, then show 400 ms later
  useEffect(() => {
    if (!kind) return
    const selector = kind === "run" ? '[data-oak="run"]' : '[data-oak="build"]'
    let timer = 0
    const found = (el: Element) => {
      observer.disconnect()
      clearTimeout(giveUp)
      timer = window.setTimeout(() => setAnchor(el), 400)
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) found(el)
    })
    const giveUp = window.setTimeout(() => {
      observer.disconnect()
      setKind(null)
    }, 3000)
    const now = document.querySelector(selector)
    if (now) found(now)
    else observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      clearTimeout(giveUp)
      clearTimeout(timer)
    }
  }, [kind])

  // Kept 8 below the control as it moves; a press on it still builds, and takes the hint away
  useLayoutEffect(() => {
    if (!anchor) return
    const measure = () => {
      if (!anchor.isConnected) return hide()
      const r = anchor.getBoundingClientRect()
      const centre = r.left + r.width / 2
      const fitsLeft = r.left + 420 < window.innerWidth
      setPlace(
        fitsLeft
          ? { top: r.bottom + 8, left: r.left, caret: centre - r.left }
          : { top: r.bottom + 8, right: window.innerWidth - r.right, caret: r.right - centre }
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(anchor)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    anchor.addEventListener("click", hide, true)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
      anchor.removeEventListener("click", hide, true)
    }
  }, [anchor])

  if (!kind || !anchor || !place) return null
  return createPortal(
    <div
      role="status"
      style={{ top: place.top, left: place.left, right: place.right }}
      className="pointer-events-auto fixed z-40 flex h-8 animate-menu-in items-center gap-2 rounded-lg border border-border-strong bg-surface-raised pr-1 pl-3 shadow-panel"
    >
      {/* The caret: a bordered square turned, its lower half hidden under the box */}
      <span
        aria-hidden="true"
        style={place.left !== undefined ? { left: place.caret - 3 } : { right: place.caret - 3 }}
        className="absolute -top-[3.5px] size-1.5 rotate-45 border-t border-l border-border-strong bg-surface-raised"
      />
      <StatusDot variant="target" />
      <span className="text-[0.8125rem] leading-[1.125rem] font-[380] whitespace-nowrap text-foreground">{LINES[kind]}</span>
      <button
        type="button"
        aria-label="Hide this tip"
        onClick={hide}
        className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>,
    document.body
  )
}
