import { useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { EASE_OUT, reducedMotion } from "./motion"
import type { PlayProps } from "./types"

/* Route the transaction: tap the four stops a call to hello goes through, in order. The idea is
   the path of a transaction: the client builds and signs it, Kora signs as the fee payer and
   pays the fee, devnet takes it, and the validators run hello_anchor */

type Stop = { id: string; name: string; does: string; why: string }

const ROUTE: Stop[] = [
  { id: "client", name: "Client", does: "builds and signs", why: "It starts at the client, which builds and signs the transaction." },
  { id: "kora", name: "Kora", does: "pays the fee", why: "Next is Kora: it signs as the fee payer and pays the fee." },
  { id: "devnet", name: "Devnet", does: "takes it in", why: "Then Kora sends it on to devnet." },
  { id: "program", name: "hello_anchor", does: "runs hello", why: "Devnet runs your program last." },
]

// Shuffled once by hand, so the grid never reads in the right order by itself
const GRID = ["devnet", "client", "program", "kora"]

export function RouteGame({ onSolved, locked, announce }: PlayProps) {
  const [path, setPath] = useState<string[]>([])
  const [reply, setReply] = useState<string | null>(null)
  const nodes = useRef<Record<string, HTMLButtonElement | null>>({})
  const dot = useRef<HTMLSpanElement>(null)
  const done = path.length === ROUTE.length

  const tap = (id: string) => {
    if (locked || done || path.includes(id)) return
    const next = ROUTE[path.length]
    if (id === next.id) {
      const p = [...path, id]
      setPath(p)
      setReply(null)
      if (p.length === ROUTE.length) {
        onSolved("World")
        announce("Client, Kora, devnet, hello_anchor. The route is complete, Run is ready.")
      } else announce(`${next.name}, stop ${p.length} of 4.`)
      return
    }
    // The node says no with a small shake; the reason is in words below
    const el = nodes.current[id]
    if (el && !reducedMotion()) el.animate([{ transform: "none" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 220, easing: EASE_OUT })
    setReply(next.why)
    announce(`Not yet. ${next.why}`)
  }

  // With the route complete, a dot runs along it once, start to end
  useLayoutEffect(() => {
    if (!done || !dot.current || reducedMotion()) return
    const a = dot.current.animate(
      [
        { left: "0%", opacity: 0 },
        { left: "4%", opacity: 1, offset: 0.08 },
        { left: "96%", opacity: 1, offset: 0.9 },
        { left: "100%", opacity: 0 },
      ],
      { duration: 900, easing: EASE_OUT }
    )
    return () => a.cancel()
  }, [done])

  return (
    <div className="flex flex-col gap-2 font-mono text-[0.75rem]/[1.25rem]">
      {/* The route so far, stop by stop. Empty stops are dashed, so the length of the trip shows */}
      <ol aria-label="Route so far" className="relative flex h-7 items-center gap-1.5 rounded-control border border-border bg-surface-well/85 px-2 backdrop-blur-[6px]">
        {ROUTE.map((stop, i) => (
          <li key={stop.id} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-syntax-comment">
                →
              </span>
            )}
            {path[i] ? (
              <span className="truncate text-syntax-plain">{ROUTE[i].name}</span>
            ) : (
              <span className="h-3.5 w-8 shrink rounded-sm border border-dashed border-border-strong">
                <span className="sr-only">not set yet</span>
              </span>
            )}
          </li>
        ))}
        <span ref={dot} aria-hidden="true" className="pointer-events-none absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand-green opacity-0 shadow-[0_0_8px_var(--brand-green)]" />
      </ol>

      <div className="grid grid-cols-2 gap-2">
        {GRID.map((id) => {
          const stop = ROUTE.find((s) => s.id === id)!
          const at = path.indexOf(id)
          return (
            <button
              key={id}
              ref={(el) => {
                nodes.current[id] = el
              }}
              type="button"
              disabled={locked || done}
              aria-label={`${stop.name}, ${stop.does}${at >= 0 ? `, stop ${at + 1}` : ""}`}
              onClick={() => tap(id)}
              className={cn(
                "flex h-12 min-w-0 items-center gap-2.5 rounded-control border px-3 text-left backdrop-blur-[6px] transition-colors duration-150 ease-standard motion-reduce:transition-none",
                at >= 0 ? "border-brand-green/40 bg-[color-mix(in_oklab,var(--brand-green)_10%,var(--surface-well))]" : "border-border bg-surface-raised/90 hover:bg-surface-hover"
              )}
            >
              {/* The stop's number once it's on the route: the order is the point */}
              <span
                aria-hidden="true"
                className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.6875rem]", at >= 0 ? "border-brand-green/60 text-success" : "border-border-strong text-muted-foreground")}
              >
                {at >= 0 ? at + 1 : ""}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-syntax-plain">{stop.name}</span>
                <span className="block truncate font-sans text-caption text-muted-foreground">{stop.does}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Two lines kept for the reason, so it never moves the grid. Backed, so it reads over the pixels */}
      <p className={cn("min-h-10 px-2 text-muted-foreground", reply && "rounded-sm bg-surface-well/85 backdrop-blur-[6px]")}>
        {reply && (
          <>
            <span className="text-syntax-comment">//</span> {reply}
          </>
        )}
      </p>
    </div>
  )
}
