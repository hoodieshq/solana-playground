import { type CSSProperties, type RefObject } from "react"
import { Check, ChevronDown, X } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { FOCUS } from "../../../ui/type"
import { readTo, steps, type Project, type StepId, type StepState } from "../../store"
import { glide } from "./Feed"

/* The Guide's steps as the tutorial's chat draws them (ui/StepBar.tsx, Almaz, 6 Nov): one line saying
   where you are, "Step 1 of 3 · Build", that opens the list, and under it a segment a step across the
   column's width, in the brand's purple to green. A step is lit whole as you reach it */

const GRADIENT = "linear-gradient(90deg, #9945ff, #14f195)"

/** One gradient across all the segments, each showing its share, as the tutorial lays it */
const share = (i: number, n: number): CSSProperties => ({
  backgroundImage: GRADIENT,
  backgroundSize: `${n * 100}% 100%`,
  backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`,
})

function Segment({ i, n, state }: { i: number; n: number; state: StepState | "lit" }) {
  return (
    <span aria-hidden="true" className="relative block h-1 w-full overflow-hidden rounded-[4px] bg-foreground/[0.12]">
      {state === "failed" ? (
        <span className="absolute inset-0 bg-error" />
      ) : (
        <span
          style={{ ...share(i, n), clipPath: state === "pending" ? "inset(0 100% 0 0)" : "inset(0 0 0 0)" }}
          className="absolute inset-0 transition-[clip-path] duration-(--duration-slow) ease-out motion-reduce:transition-none"
        />
      )}
    </span>
  )
}

/** A step's disc in the list: its number ahead, a tick once done, a cross when it failed */
function Disc({ n, state }: { n: number; state: StepState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] leading-none font-medium tabular-nums",
        state === "pending" && "bg-foreground/10 text-muted-foreground",
        (state === "current" || state === "running") && "bg-foreground/20 text-foreground",
        (state === "done" || state === "stale") && "bg-success/12 text-success",
        state === "failed" && "bg-error/12 text-error"
      )}
    >
      {state === "done" || state === "stale" ? <Check strokeWidth={2.5} className="size-3" /> : state === "failed" ? <X strokeWidth={2.5} className="size-3" /> : n}
      {state === "stale" && <StatusDot variant="warning" className="absolute -top-0.5 -right-0.5 ring-2 ring-surface-raised" />}
    </span>
  )
}

const NOTE: Partial<Record<StepState, string>> = { done: "Done", stale: "Code changed", current: "Now", running: "Running", failed: "Failed" }

/** A step jumps the feed to its latest card; a step with nothing in the feed yet is only a name */
export function StepStrip({ p, scroller }: { p: Project; scroller: RefObject<HTMLDivElement | null> }) {
  const list = steps(p)
  const n = list.length
  const at = list.findIndex((s) => s.state === "current" || s.state === "running" || s.state === "failed")
  const finished = at === -1 && list.every((s) => s.state === "done" || s.state === "stale")
  const jump = (id: string) => {
    const el = scroller.current
    if (!el) return
    const ids = p.framework === "ts-client" ? ["build", "call"] : [id]
    const cards = [...el.querySelectorAll<HTMLElement>(ids.map((s) => `[data-step="${s}"]`).join(","))]
    const card = cards[cards.length - 1]
    if (!card) return
    glide(el, card.offsetTop - 16)
    card.classList.remove("pg-anchor-flash")
    void card.offsetWidth
    card.classList.add("pg-anchor-flash")
  }
  // Read mode: a stop ahead can be jumped to, and the stops before it are read on the way (a stop is done
  // once its answer is posted). The call is never run by a jump, only reached
  const reach = (s: { id: StepId; state: StepState }) => {
    if (!(p.read && s.state === "pending")) return jump(s.id)
    readTo(p.id, s.id)
    requestAnimationFrame(() => requestAnimationFrame(() => jump(s.id)))
  }
  const where = finished ? "Done" : `Step ${Math.max(at, 0) + 1} of ${n}`
  const name = finished || at === -1 ? null : list[at].label

  return (
    // On touch the whole strip opens the step list: the label and the segments are too thin to tap one by one
    <nav aria-label="Steps" className="relative shrink-0 px-5 pt-3 pb-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group -mx-1.5 flex h-[1.125rem] items-center gap-1.5 rounded-md px-1.5 text-[0.875rem] leading-[1.125rem] font-label outline-none hover:bg-surface-hover data-[state=open]:bg-surface-hover pointer-coarse:after:absolute pointer-coarse:after:inset-0 pointer-coarse:after:content-['']",
            FOCUS
          )}
        >
          <span className="text-muted-foreground tabular-nums">{where}</span>
          {name && (
            <>
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
              <span className="font-medium text-foreground">{name}</span>
            </>
          )}
          <span aria-hidden="true" className="flex size-3.5 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none [&>svg]:size-full">
            <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-full" />
          </span>
        </DropdownMenuTrigger>
        {/* Opens under the segments, not over them: on touch the tap that opened it would land on its first row */}
        <DropdownMenuContent align="start" alignOffset={-8} sideOffset={28} className="w-64">
          {list.map((s, i) => (
            <DropdownMenuItem
              key={s.id}
              disabled={s.state === "pending" && !p.read}
              onSelect={() => reach(s)}
              aria-current={s.state === "current" || s.state === "running" ? "step" : undefined}
              className={cn("min-h-10 gap-3 px-2.5", i === at && "bg-foreground/[0.06]")}
            >
              <Disc n={i + 1} state={s.state} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              {NOTE[s.state] && <span className="shrink-0 text-caption text-muted-foreground">{NOTE[s.state]}</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {list.map((s, i) => (
          <button
            key={s.id}
            type="button"
            disabled={s.state === "pending" && !p.read}
            onClick={() => reach(s)}
            aria-label={`Step ${i + 1} of ${n}, ${s.label}`}
            className={cn("flex h-3 items-center disabled:cursor-default pointer-coarse:pointer-events-none", FOCUS)}
          >
            <Segment i={i} n={n} state={s.state === "current" || s.state === "running" ? "lit" : s.state} />
          </button>
        ))}
      </span>
    </nav>
  )
}
