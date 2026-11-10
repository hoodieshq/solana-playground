import { useEffect, useRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { LitIcon } from "./icons"


/** The amber flag on a tile, the avatar or the chip's dot: a 6px dot on the top right corner, 2px out,
 * ringed in the nav's own ground so it looks cut in */
export const Notch = ({ className }: { className?: string }) => (
  <span aria-hidden="true" className={cn("absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning shadow-[0_0_0_2px_var(--nav-bg)]", className)} />
)

const GAP = 1.5

/** One horizontal band a step, lit from the bottom in flat brand purple, the colour the tutorial's
 * step track marks a step with */
function Bands({ at, of, px }: { at: number; of: number; px: number }) {
  const h = (px - GAP * (of - 1)) / of
  // A band lit since the last render sweeps once, so a step done while the nav shows is seen
  const before = useRef(at)
  const from = before.current
  useEffect(() => {
    before.current = at
  }, [at])
  return (
    <span className="flex size-full flex-col-reverse" style={{ gap: GAP }}>
      {Array.from({ length: of }, (_, i) => {
        const lit = i < at
        const style: CSSProperties = { height: h }
        return (
          <span key={i} style={style} className={cn("relative block w-full shrink-0 overflow-hidden", lit ? "bg-brand-purple" : "bg-border-strong")}>
            {lit && i >= from && <span className="absolute inset-0 animate-sweep bg-linear-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden" />}
          </span>
        )
      })}
    </span>
  )
}

type Props = {
  kind: "project" | "lesson" | "empty"
  letter?: string
  at?: number
  of?: number
  done?: boolean
  notch?: boolean
  size?: 18 | 20
}

/** A lesson's steps as a small square, lit a band a step in flat purple: the open lesson on the rail.
 * Rows in Mine carry no tile, and setup has its ring (SetupRow) */
export function ItemTile({ kind, letter, at = 0, of = 4, done = false, notch = false, size = 18 }: Props) {
  const fill = (
    <span
      aria-hidden="true"
      className={cn(
        "lit-tile relative flex size-full items-center justify-center overflow-hidden rounded-[6px] transition-colors duration-100 motion-reduce:transition-none",
        // A project tile lights up with its row
        kind === "project" && "bg-surface-raised text-muted-foreground group-hover/row:bg-border-strong group-hover/row:text-foreground",
        kind === "empty" && "shadow-[inset_0_0_0_1px_var(--border-strong)]"
      )}
    >
      {kind === "project" && <span className="font-mono text-[0.625rem] leading-none font-semibold">{letter?.toUpperCase()}</span>}
      {kind === "lesson" &&
        (done ? (
          // Finished: every band lit with the gaps closed, and a check on top
          <span className="flex size-full items-center justify-center bg-brand-purple text-white [&>svg]:size-2.5"><LitIcon name="check" /></span>
        ) : of > 5 ? (
          // Past five steps the bands get too thin to read: one fill rises from the bottom instead
          <span className="relative size-full bg-border-strong">
            <span className="absolute inset-0 bg-brand-purple" style={{ clipPath: `inset(${100 - (at / of) * 100}% 0 0 0)` }} />
          </span>
        ) : (
          <Bands at={at} of={of} px={size} />
        ))}
    </span>
  )
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      {fill}
      {notch && <Notch />}
    </span>
  )
}
