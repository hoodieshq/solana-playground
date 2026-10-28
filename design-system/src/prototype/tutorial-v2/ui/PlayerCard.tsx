import { useEffect, useState } from "react"
import { TreePine, Zap } from "lucide-react"

import { cn } from "@/lib/utils"

import { LESSON, shortKey } from "../data"
import { clientView } from "../lessons/lumberjack"
import { useStore } from "../store"

/** m:ss, for the time until the next energy */
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** The player as the client sees it right now, ticking once a second while energy is on its way
 * back: the client works it out from `last_login`, with no transaction */
export function usePlayerNow() {
  const { s } = useStore()
  const [, tick] = useState(0)
  const view = clientView(s)
  useEffect(() => {
    if (view.next === null) return
    const t = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [view.next === null])
  return s.player ? { wood: s.player.wood, ...view } : null
}

/** The player account, as a game's screen would draw it: its address, the energy as five cells and
 * the wood. `next` is the time until the next energy comes back, when it's on its way. Without
 * `wood` and `energy` it shows the account as it is now; with them, as it was at that moment. `flat`
 * drops its box, for a card that already has one: never a block inside a block */
export function PlayerCard({
  wood,
  energy,
  next = null,
  className,
  phone = false,
  flat = false,
}: {
  wood: number
  energy: number
  next?: number | null
  className?: string
  phone?: boolean
  flat?: boolean
}) {
  const max = LESSON.game?.max ?? 5
  const empty = energy === 0
  return (
    <div className={cn(!flat && "rounded-control border border-border bg-surface-well px-3 py-2.5", className)}>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span className="text-foreground">Player account</span>
        <span className="min-w-0 truncate font-mono text-[0.75rem]" title={LESSON.game?.pda}>
          {shortKey(LESSON.game?.pda ?? "", phone ? 4 : 6)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2" aria-label={`${energy} of ${max} energy`}>
          <Zap aria-hidden="true" className={cn("size-3.5", empty ? "text-error" : "text-brand-green")} />
          {/* A thin meter, as the step bar's track: the number beside it carries the value */}
          <span aria-hidden="true" className="flex gap-0.5">
            {Array.from({ length: max }, (_, i) => (
              <span
                key={i}
                className={cn("h-1 w-3 rounded-full transition-colors duration-300 motion-reduce:transition-none", i < energy ? "bg-brand-green" : "bg-foreground/10")}
              />
            ))}
          </span>
          <span className={cn("font-mono text-[0.8125rem] tabular-nums", empty ? "text-error" : "text-foreground")}>
            {energy}/{max}
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-label={`${wood} wood`}>
          <TreePine aria-hidden="true" className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-[0.8125rem] text-foreground tabular-nums">{wood}</span>
          <span className="text-caption text-muted-foreground">wood</span>
        </div>
      </div>
      {next !== null && (
        <p className="mt-2 text-caption text-muted-foreground tabular-nums" aria-live="off">
          Next energy in <span className="font-mono text-foreground">{clock(next)}</span>
          <span className="text-subtle"> · worked out by the client, no transaction</span>
        </p>
      )}
    </div>
  )
}

/** The account as it is now, for the chop card and the finish */
export function LivePlayer({ className, phone, flat }: { className?: string; phone?: boolean; flat?: boolean }) {
  const p = usePlayerNow()
  if (!p) return null
  return <PlayerCard wood={p.wood} energy={p.energy} next={p.next} className={className} phone={phone} flat={flat} />
}

export { clock }
