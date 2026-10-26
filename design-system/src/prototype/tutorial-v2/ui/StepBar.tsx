import { useEffect, useRef, type CSSProperties } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { NAV_ICONS } from "./navIcons"
import { StepGlyph } from "./StepGlyph"
import { FOCUS } from "./type"

/** The brand's progress fill, the one the gallery banner draws: it starts purple and lands on green */
const PROGRESS_GRADIENT = "linear-gradient(90deg, #9945ff, #14f195)"

/** One gradient laid across all four segments: each shows its own quarter, so the gaps break a single
 * bar instead of four colours. Percent positions move the image by (box minus image) times p, which
 * for an image four boxes wide is one box per third */
const quarter = (i: number): CSSProperties => ({
  backgroundImage: PROGRESS_GRADIENT,
  backgroundSize: `${STEPS.length * 100}% 100%`,
  backgroundPosition: `${(i / (STEPS.length - 1)) * 100}% 0`,
})

/** The newly lit segments sweep in one after another, after the check has popped */
const SWEEP_AFTER = 140
const SWEEP_STAGGER = 180

/** A segment's fill, revealed left to right by its clip, so the gradient stays put while it shows.
 * `delay` holds it while the check pops */
function Segment({ i, lit, delay }: { i: number; lit: boolean; delay: number }) {
  return (
    <span aria-hidden="true" className="relative block h-0.5 overflow-hidden bg-foreground/[0.1]">
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

/** True once the first paint is behind us: checks that arrive later pop, the ones a reload finds don't */
function useMounted() {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])
  return mounted.current
}

/** How many segments are lit: a step is lit whole as you enter it, a segment filling by beats read as
 * nothing happening */
const litCount = (started: boolean, step: number, finished: boolean) => (!started ? 0 : finished ? STEPS.length : step + 1)

type BarProps = { viewing: number | null; onPick: (step: number) => void }

/** The tutorial's four steps across the top of the chat, the desktop twin of the phone header's track.
 * A chat column narrower than 24rem can't hold four labels with their checks, so it says where you are
 * in one line over the same track and keeps the four steps in a menu. The column's own width decides */
export function StepBar(props: BarProps) {
  return (
    <div className="@container shrink-0">
      <FullBar {...props} />
      <CompactBar {...props} />
    </div>
  )
}

/** A label over each segment, the fill the gallery's purple to green, the words grey. A done or current
 * step scrolls the conversation back to its divider, nothing resets; the step you're reading back,
 * when it isn't the live one, gets a quiet pill while the live step keeps its fill */
function FullBar({ viewing, onPick }: BarProps) {
  const { s } = useStore()
  const finished = s.passed.every(Boolean)
  const lit = litCount(s.started, s.step, finished)
  const delayFor = useSweep(lit)
  const mounted = useMounted()

  return (
    <nav aria-label="Tutorial steps" className="grid h-12 grid-cols-4 items-end gap-[3px] px-5 @max-[24rem]:hidden">
      {STEPS.map((step, i) => {
        const done = s.passed[i]
        const current = s.started && !finished && i === s.step && !done
        const reached = s.started && (done || i <= s.step)
        const looking = s.started && viewing === i && (finished || viewing !== s.step)
        return (
          <button
            key={step.id}
            type="button"
            disabled={!reached}
            onClick={() => onPick(i)}
            aria-current={looking ? "location" : current ? "step" : undefined}
            aria-label={`Step ${i + 1} of ${STEPS.length}, ${step.title}${done ? ", done" : current ? ", current" : ""}`}
            className={cn("group flex h-11 min-w-0 flex-col justify-end gap-[7px] pb-1.5 text-left disabled:cursor-default", FOCUS)}
          >
            <span
              className={cn(
                "-mx-1 flex h-6 max-w-[calc(100%+0.5rem)] items-center gap-1.5 self-start rounded-md px-1 text-[0.8125rem] leading-none font-label transition-colors duration-200 motion-reduce:transition-none",
                looking && "bg-surface-hover",
                looking || current ? "text-foreground" : done ? "text-muted-foreground group-hover:text-foreground" : "text-muted-foreground/75",
                current && "font-medium"
              )}
            >
              {done ? (
                <span key="check" className={cn("flex size-3 shrink-0 [&>svg]:size-full", mounted && "animate-pop motion-reduce:animate-none")}>
                  {NAV_ICONS.check}
                </span>
              ) : (
                <span className={cn("shrink-0 font-act tabular-nums lining-nums", current || looking ? "text-muted-foreground" : "text-subtle")}>{i + 1}</span>
              )}
              <span className="truncate">{step.short}</span>
            </span>
            <Segment i={i} lit={i < lit} delay={delayFor(i)} />
          </button>
        )
      })}
    </nav>
  )
}

/** The narrow column's bar: "Step 2 of 4 · Deploy" over the same track, the line opening the four
 * steps as the phone's drawer lists them. It stands as tall as the full bar, its segments on the same
 * line, so the chat doesn't move when the column crosses 24rem */
function CompactBar({ viewing, onPick }: BarProps) {
  const { s } = useStore()
  const finished = s.passed.every(Boolean)
  const lit = litCount(s.started, s.step, finished)
  const delayFor = useSweep(lit)
  const where = !s.started ? `${STEPS.length} steps` : finished ? `Done · ${STEPS.length} of ${STEPS.length}` : `Step ${s.step + 1} of ${STEPS.length}`
  const name = s.started && !finished ? STEPS[s.step].short : null

  return (
    <nav aria-label="Tutorial steps" className="hidden h-12 px-5 pt-0.5 pb-1.5 @max-[24rem]:block">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!s.started}
          className={cn(
            "group -mx-1.5 flex h-8 items-center gap-1.5 rounded-md px-1.5 text-[0.8125rem] font-label outline-none hover:bg-surface-hover disabled:hover:bg-transparent data-[state=open]:bg-surface-hover",
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
        <DropdownMenuContent align="start" className="w-64">
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
                className={cn("min-h-10 gap-3", (current || looking) && "bg-foreground/[0.06]")}
              >
                <StepGlyph i={i} done={done} current={current} className={current ? undefined : "bg-foreground/10"} />
                <span className="min-w-0 flex-1 truncate">{step.title}</span>
                {(done || current) && <span className="shrink-0 text-caption text-muted-foreground">{done ? "Done" : "Now"}</span>}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span aria-hidden="true" className="mt-1.5 grid grid-cols-4 gap-[3px]">
        {STEPS.map((step, i) => (
          <Segment key={step.id} i={i} lit={i < lit} delay={delayFor(i)} />
        ))}
      </span>
    </nav>
  )
}

/** The phone header's bottom edge: the same four segments in the same purple to green. Before Start
 * nothing is under way, and four empty segments read as a broken rule: one hairline instead */
export function StepTrack({ done }: { done: boolean }) {
  const { s } = useStore()
  const lit = litCount(s.started, s.step, done)
  const delayFor = useSweep(lit)
  if (!s.started) return <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-border" />
  return (
    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-[3px]">
      {STEPS.map((step, i) => (
        <Segment key={step.id} i={i} lit={i < lit} delay={delayFor(i)} />
      ))}
    </span>
  )
}
