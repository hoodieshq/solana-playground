import { useEffect, useRef, type CSSProperties } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { NAV_ICONS } from "./navIcons"
import { StepGlyph } from "./StepGlyph"
import { FOCUS } from "./type"

/** One column a step: Hello Anchor and Lumberjack have four, Zero Copy three. Read at render, since
 * STEPS is the open lesson's */
const columns = (): CSSProperties => ({ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` })

/** The brand's progress fill, the one the gallery banner draws: it starts purple and lands on green */
const PROGRESS_GRADIENT = "linear-gradient(90deg, #9945ff, #14f195)"

/** One gradient laid across all the segments: each shows its own share, so the gaps break a single
 * bar instead of a colour a step. Percent positions move the image by (box minus image) times p, which
 * for an image n boxes wide is one box per n minus 1 */
const quarter = (i: number): CSSProperties => ({
  backgroundImage: PROGRESS_GRADIENT,
  backgroundSize: `${STEPS.length * 100}% 100%`,
  backgroundPosition: `${(i / (STEPS.length - 1)) * 100}% 0`,
})

/** The newly lit segments sweep in one after another, after the check has popped */
const SWEEP_AFTER = 140
const SWEEP_STAGGER = 180

/** A segment as Practicum draws its lesson progress: a 4px rounded bar on a 12% white track, its fill
 * revealed left to right by its clip, so the gradient stays put while it shows. `delay` holds it while
 * the check pops */
function Segment({ i, lit, delay }: { i: number; lit: boolean; delay: number }) {
  return (
    <span aria-hidden="true" className="relative block h-1 w-full overflow-hidden rounded-[4px] bg-foreground/[0.12]">
      <span
        style={{ ...quarter(i), clipPath: lit ? "inset(0 0 0 0)" : "inset(0 100% 0 0)", transitionDelay: lit ? `${delay}ms` : "0ms" }}
        className="absolute inset-0 transition-[clip-path] duration-(--duration-slow) ease-out motion-reduce:transition-none"
      />
    </span>
  )
}

/** Remembers how many segments were lit last time, so only the ones lit since sweep, in order */
function useSweep(lit: number) {
  const before = useRef(lit)
  const from = before.current
  useEffect(() => {
    before.current = lit
  }, [lit])
  return (i: number) => (i >= from ? SWEEP_AFTER + (i - from) * SWEEP_STAGGER : 0)
}

/** How many segments are lit: a step is lit whole as you enter it, a segment filling by beats read as
 * nothing happening */
const litCount = (started: boolean, step: number, finished: boolean) => (!started ? 0 : finished ? STEPS.length : step + 1)

type BarProps = { viewing: number | null; onPick: (step: number) => void }

/** The tutorial's steps across the top of the chat, the desktop twin of the phone header's track. As in
 * Practicum's lesson, one line of text says where you are, 14/18, and the segments sit 12px under it,
 * each a 12px tall target round a 4px bar, 4px apart. The line opens the steps as the phone's drawer
 * lists them; a reached segment takes you to its step too. A label over each segment split one
 * sentence into three. The line sits 12 under the head's rule, the same 12 as down to the segments,
 * so the line belongs to neither edge: at 8 it hung off the head and the bar read as two pieces */
export function StepBar({ viewing, onPick }: BarProps) {
  const { s } = useStore()
  const finished = s.passed.every(Boolean)
  const lit = litCount(s.started, s.step, finished)
  const delayFor = useSweep(lit)
  const where = !s.started ? `${STEPS.length} steps` : finished ? `Done · ${STEPS.length} of ${STEPS.length}` : `Step ${s.step + 1} of ${STEPS.length}`
  const name = s.started && !finished ? STEPS[s.step].short : null

  return (
    <nav aria-label="Tutorial steps" className="shrink-0 px-5 pt-3 pb-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!s.started}
          className={cn(
            "group -mx-1.5 flex h-[1.125rem] items-center gap-1.5 rounded-md px-1.5 text-[0.875rem] leading-[1.125rem] font-label outline-none hover:bg-surface-hover disabled:hover:bg-transparent data-[state=open]:bg-surface-hover",
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
          {s.started && (
            <span
              aria-hidden="true"
              className="flex size-3.5 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none [&>svg]:size-full"
            >
              {NAV_ICONS.caret}
            </span>
          )}
        </DropdownMenuTrigger>
        {/* A row keeps 10 at its sides, as above and below its 20 line: at 6 the number and Now touched the
            lit row's edges. The menu sits 8 to the left, so the numbers stand under the trigger's "Step"
            (the menu's 4 and the row's 10 against the trigger's 6) */}
        <DropdownMenuContent align="start" alignOffset={-8} className="w-64">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = !finished && i === s.step && !done
            const reached = done || i <= s.step
            const looking = viewing === i && (finished || viewing !== s.step)
            return (
              <DropdownMenuItem
                key={step.id}
                disabled={!reached}
                onSelect={() => onPick(i)}
                aria-current={looking ? "location" : current ? "step" : undefined}
                className={cn("min-h-10 gap-3 px-2.5", (current || looking) && "bg-foreground/[0.06]")}
              >
                <StepGlyph i={i} done={done} current={current} className={current ? undefined : "bg-foreground/10"} />
                <span className="min-w-0 flex-1 truncate">{step.title}</span>
                {(done || current) && <span className="shrink-0 text-caption text-muted-foreground">{done ? "Done" : "Now"}</span>}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="mt-2 grid gap-1" style={columns()}>
        {STEPS.map((step, i) => {
          const reached = s.started && (s.passed[i] || i <= s.step)
          return (
            <button
              key={step.id}
              type="button"
              disabled={!reached}
              onClick={() => onPick(i)}
              aria-label={`Step ${i + 1} of ${STEPS.length}, ${step.title}`}
              className={cn("flex h-3 items-center disabled:cursor-default", FOCUS)}
            >
              <Segment i={i} lit={i < lit} delay={delayFor(i)} />
            </button>
          )
        })}
      </span>
    </nav>
  )
}

/** The phone header's progress: the same 4px segments, 4px apart, inset 16px as Practicum's bar is,
 * under the header's "Step 1 of 3" line. Before Start nothing is under way, and empty segments read as
 * a broken rule: one hairline instead */
export function StepTrack({ done }: { done: boolean }) {
  const { s } = useStore()
  const lit = litCount(s.started, s.step, done)
  const delayFor = useSweep(lit)
  if (!s.started) return <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-border" />
  return (
    <span aria-hidden="true" className="absolute inset-x-4 bottom-2 grid gap-1" style={columns()}>
      {STEPS.map((step, i) => (
        <Segment key={step.id} i={i} lit={i < lit} delay={delayFor(i)} />
      ))}
    </span>
  )
}
