import * as React from "react"
import { cn } from "@/lib/utils"

/* The ground the product lays under a page (views/deck/Pattern.tsx, and
   Flow.tsx's Ground): the brand grid at rest, rising from the foot and gone
   by the top, and the same grid a little brighter through a soft circle that
   trails the pointer, with a faint halo so the light has a body. It fades
   when the pointer leaves the window, and a finger never lights it. Three
   custom properties carry the light, set from a frame loop that stops once
   it has caught up, so nothing runs while the pointer is still. The grid is
   drawn in the foreground colour, so it reads on paper and in the dark, and
   the resting grid is plain CSS: a snapshot of the page keeps it.

   It fills its parent and sits under it: give the parent position and
   isolate. strength scales the grid, 1 being the product's. */

/* One tile of the deck's grid (views/deck/tokens.ts), cut out of a 60px
   square, so the mask leaves the lines between tiles */
const TILE =
  "M0 38C0 47.4281 0 52.1421 2.9289 55.0711C5.8579 58 10.5719 58 20 58H38C47.4281 58 52.1421 58 55.0711 55.0711C58 52.1421 58 47.4281 58 38V20C58 10.5719 58 5.8579 55.0711 2.9289C52.1421 0 47.4281 0 38 0H20C10.5719 0 5.8579 0 2.9289 2.9289C0 5.8579 0 10.5719 0 20V38Z"
const GRID = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath fill-rule='evenodd' d='M0 0H60V60H0Z${TILE}'/%3E%3C/svg%3E")`
const RISE = "radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent)"
const LIGHT = "radial-gradient(circle var(--lr) at var(--lx) var(--ly), #000 0%, rgb(0 0 0 / 0.5) 38%, transparent 100%)"

/* A layer of the grid: the foreground through the tile mask, at a strength */
const grid = (alpha: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  backgroundColor: "var(--foreground)",
  opacity: alpha,
  maskImage: GRID,
  WebkitMaskImage: GRID,
  maskSize: "var(--pp) var(--pp)",
  WebkitMaskSize: "var(--pp) var(--pp)",
  maskPosition: "calc(var(--pp) / 30) calc(var(--pp) * 31 / 60)",
  WebkitMaskPosition: "calc(var(--pp) / 30) calc(var(--pp) * 31 / 60)",
  ...extra,
})

/* How much of the remaining distance the light closes each frame, so it
   glides after the pointer */
const FOLLOW = 0.14

function LitGround({
  className,
  style,
  strength = 1,
  lit = true,
  ...props
}: React.ComponentProps<"div"> & { strength?: number; lit?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el || !lit) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const k = still ? 1 : FOLLOW
    let x = 0
    let y = 0
    let tx = 0
    let ty = 0
    let on = 0
    let tOn = 0
    let seen = false
    let frame = 0
    const tick = () => {
      x += (tx - x) * k
      y += (ty - y) * k
      on += (tOn - on) * (still ? 1 : 0.1)
      el.style.setProperty("--lx", `${x.toFixed(1)}px`)
      el.style.setProperty("--ly", `${y.toFixed(1)}px`)
      el.style.setProperty("--lon", on.toFixed(3))
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.4 || Math.abs(tOn - on) > 0.004 ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const box = el.getBoundingClientRect()
      tx = e.clientX - box.left
      ty = e.clientY - box.top
      // The first time, the light starts under the pointer instead of sweeping in from the corner
      if (!seen) {
        seen = true
        x = tx
        y = ty
      }
      tOn = 1
      wake()
    }
    const leave = (e: PointerEvent) => {
      if (e.relatedTarget) return
      tOn = 0
      wake()
    }
    window.addEventListener("pointermove", move, { passive: true })
    document.documentElement.addEventListener("pointerleave", leave)
    return () => {
      window.removeEventListener("pointermove", move)
      document.documentElement.removeEventListener("pointerleave", leave)
      if (frame) cancelAnimationFrame(frame)
      el.style.setProperty("--lon", "0")
    }
  }, [lit])

  return (
    <div
      ref={ref}
      data-slot="lit-ground"
      aria-hidden="true"
      style={
        {
          "--pp": "max(24px, round(calc(min(100vw, 1920px) / 32), 1px))",
          "--lx": "-999px",
          "--ly": "-999px",
          "--lon": 0,
          "--lr": "clamp(14rem, 26vmax, 26rem)",
          ...style,
        } as React.CSSProperties
      }
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      {...props}
    >
      <div data-slot="lit-ground-rest" style={{ position: "absolute", inset: 0, maskImage: RISE, WebkitMaskImage: RISE }}>
        <div style={grid(0.025 * strength)} />
      </div>
      {lit && (
        <>
          <div
            data-slot="lit-ground-halo"
            style={{
              position: "absolute",
              inset: 0,
              opacity: "var(--lon)",
              background:
                "radial-gradient(circle calc(var(--lr) * 1.4) at var(--lx) var(--ly), color-mix(in srgb, var(--foreground) 4%, transparent) 0%, color-mix(in srgb, var(--foreground) 1.2%, transparent) 45%, transparent 100%)",
            }}
          />
          {/* The light shows the grid even where the resting layer has fallen away, so it does not rise */}
          <div data-slot="lit-ground-light" style={{ position: "absolute", inset: 0, opacity: "var(--lon)", maskImage: LIGHT, WebkitMaskImage: LIGHT }}>
            <div style={grid(0.07 * strength)} />
          </div>
        </>
      )}
    </div>
  )
}

export { LitGround }
