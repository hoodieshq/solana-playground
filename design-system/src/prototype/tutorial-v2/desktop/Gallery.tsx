import { useEffect, useRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

import { CATALOG } from "../ui/catalog"
import { StartHereBanner } from "../ui/StartHereBanner"
import { TutorialLevels } from "./TutorialList"
import { TutorialsInProgress } from "./TutorialsInProgress"

/* The brand pattern under the page, at the product's strength: one tile of the deck's grid
   (views/deck/tokens.ts), rising from the foot of the page and gone by the top */
const TILE =
  "M0 38C0 47.4281 0 52.1421 2.9289 55.0711C5.8579 58 10.5719 58 20 58H38C47.4281 58 52.1421 58 55.0711 55.0711C58 52.1421 58 47.4281 58 38V20C58 10.5719 58 5.8579 55.0711 2.9289C52.1421 0 47.4281 0 38 0H20C10.5719 0 5.8579 0 2.9289 2.9289C0 5.8579 0 10.5719 0 20V38Z"
const tiles = (alpha: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath fill-rule='evenodd' d='M0 0H60V60H0Z${TILE}' fill='%23fff' fill-opacity='${alpha}'/%3E%3C/svg%3E")`
const LAYER: CSSProperties = { position: "absolute", inset: 0, backgroundSize: "var(--pp) var(--pp)", backgroundPosition: "calc(var(--pp) / 30) calc(var(--pp) * 31 / 60)" }
const RISE = "radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent)"
const LIGHT = "radial-gradient(circle var(--lr) at var(--lx) var(--ly), #000 0%, rgb(0 0 0 / 0.5) 38%, transparent 100%)"

/* How much of the remaining distance the light closes each frame, so it glides after the pointer */
const FOLLOW = 0.14

/** The ground as the product lays it under every pane (views/deck/Pattern.tsx, Flow.tsx's Ground):
 * the grid at rest, and the same grid a little brighter through a soft circle that trails the
 * pointer, with a faint halo so the light has a body. It fades out when the pointer leaves the
 * window. Two custom properties carry it, set from a frame loop that stops once the light has
 * caught up, so nothing renders and nothing runs while the pointer is still */
export function LitGround() {
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const k = still ? 1 : FOLLOW
    let x = 0,
      y = 0,
      tx = 0,
      ty = 0,
      on = 0,
      tOn = 0,
      seen = false,
      frame = 0
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
    }
  }, [])
  return (
    <div
      ref={wrap}
      aria-hidden="true"
      style={
        { "--pp": "max(24px, round(calc(min(100vw, 1920px) / 32), 1px))", "--lx": "-999px", "--ly": "-999px", "--lon": 0, "--lr": "clamp(14rem, 26vmax, 26rem)" } as CSSProperties
      }
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden will-change-transform"
    >
      <div style={{ ...LAYER, backgroundImage: tiles(0.025), maskImage: RISE, WebkitMaskImage: RISE }} />
      <div
        style={{
          ...LAYER,
          opacity: "var(--lon)",
          background: "radial-gradient(circle calc(var(--lr) * 1.4) at var(--lx) var(--ly), rgb(255 255 255 / 0.04) 0%, rgb(255 255 255 / 0.012) 45%, transparent 100%)",
        }}
      />
      {/* The light reveals the grid even where the resting layer has fallen away, so it isn't risen */}
      <div style={{ ...LAYER, backgroundImage: tiles(0.07), opacity: "var(--lon)", maskImage: LIGHT, WebkitMaskImage: LIGHT }} />
    </div>
  )
}

/** The tutorials page, as client-v2's /#tutorials draws it (views/flow/zero/ZeroState.tsx): the
 * list's own heading, the Start here banner while browsing, and the cards by level */
export function Gallery() {
  return (
    <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden">
      <LitGround />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto flex w-[min(50rem,100%)] flex-col px-8 pt-8 pb-16">
          <TutorialsBody className="mt-6" />
        </div>
      </div>
    </div>
  )
}

/** The page under its head: the heading, the banner, the cards. No search and no filter (Almaz, 6 Nov):
 * the levels are enough for this many tutorials. The phone draws the same, in its own frame; `phone`
 * gives the banner a thumb's button */
export function TutorialsBody({ phone = false, className }: { phone?: boolean; className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4 duration-200 animate-in fade-in slide-in-from-bottom-1.5 motion-reduce:animate-none", className)}>
      <h1 className={cn("flex items-center font-heading text-[1.75rem] font-normal tracking-[-0.015em] text-foreground", phone ? "mb-1 h-11" : "mb-4 min-h-8")}>Tutorials</h1>
      <StartHereBanner layout={phone ? "phone" : "desktop"} />
      <TutorialsInProgress />
      <TutorialLevels list={CATALOG} />
    </div>
  )
}
