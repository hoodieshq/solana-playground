import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/* A lesson's steps across the top of the chat. One line of text says where
   you are, "Step 2 of 4 · Deploy" at 14/18, and opens the steps in a menu;
   under it a segment a step, one purple to green fill laid across them all,
   so the gaps break a single bar rather than colour each step. A label over
   each segment split one sentence into three, so there is none.
   Each segment is a 12px tall button round a 4px bar, 4px apart, and a
   reached one takes you to its step. The line sits 12 under the head's rule
   (pt-3) and the bar 12 under the line (mt-2 plus the target's 4), so the
   line belongs to neither edge. Side padding is the host's.
   StepTrackBar is the same segments as a phone header's bottom edge.
   Not Stepper, a switch between the loop's four stages that changes what is
   shown, and not StepRail, which runs down the side and is no way back. */

type StepTrackStatus = "done" | "current" | "reached" | "upcoming"

type StepTrackStep = {
  /** the short name in the line, "Deploy" */
  label: string
  /** the full name in the menu and the segment's label; the label when left out */
  title?: string
  /** done, the live step, reached (a way back, not done), or upcoming (not reached yet) */
  status: StepTrackStatus
}

type StepTrackMessages = {
  /** "Step 2 of 4" */
  step: (n: number, of: number) => string
  /** before the first step is under way */
  steps: (of: number) => string
  /** once every step is done */
  finished: (of: number) => string
  /** after a done step in the menu */
  done: string
  /** after the live step in the menu */
  current: string
}

const MESSAGES: StepTrackMessages = {
  step: (n, of) => `Step ${n} of ${of}`,
  steps: (of) => `${of} steps`,
  finished: (of) => `Done · ${of} of ${of}`,
  done: "Done",
  current: "Now",
}

/* The newly lit segments sweep in one after another */
const SWEEP_AFTER = 140
const SWEEP_STAGGER = 180

const columns = (count: number): React.CSSProperties => ({ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` })

/* Remembers which segments were lit last render, so only the ones lit since sweep, in order */
function useSweep(lit: boolean[]) {
  const before = React.useRef(lit)
  const was = before.current
  React.useEffect(() => {
    before.current = lit
  })
  let order = 0
  return lit.map((on, i) => (on && !was[i] ? SWEEP_AFTER + order++ * SWEEP_STAGGER : 0))
}

/* One step's share of the track: a 4px rounded bar on a 12% white track.
   The gradient is laid across all of them and each shows its own part; the
   fill is revealed left to right by its clip, so the colour stays put while
   it shows. delay holds it for the sweep */
function StepTrackSegment({
  className,
  index,
  count,
  lit,
  delay = 0,
  ...props
}: React.ComponentProps<"span"> & { index: number; count: number; lit: boolean; delay?: number }) {
  return (
    <span
      data-slot="step-track-segment"
      data-lit={lit || undefined}
      aria-hidden="true"
      className={cn("relative block h-1 w-full overflow-hidden rounded-[4px] bg-foreground/[0.12]", className)}
      {...props}
    >
      <span
        className="absolute inset-0 bg-gradient-product-flat transition-[clip-path] duration-(--duration-slow) ease-out motion-reduce:transition-none"
        style={{
          backgroundSize: `${count * 100}% 100%`,
          backgroundPosition: `${(index / Math.max(1, count - 1)) * 100}% 0`,
          clipPath: lit ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transitionDelay: lit ? `${delay}ms` : "0ms",
        }}
      />
    </span>
  )
}

/* A step's mark in a list of steps (the menu, a phone's steps drawer): its
   number on a grey disc, a lighter disc while current, a check once done.
   viewing rings the disc of the step being read back */
function StepTrackIndicator({
  className,
  index,
  status = "upcoming",
  viewing = false,
  ...props
}: React.ComponentProps<"span"> & { index: number; status?: StepTrackStatus; viewing?: boolean }) {
  return (
    <span
      data-slot="step-track-indicator"
      data-status={status}
      data-viewing={viewing || undefined}
      aria-hidden="true"
      className={cn(
        "relative grid size-5 shrink-0 place-items-center rounded-full bg-foreground/10 text-[0.6875rem] leading-none font-act text-muted-foreground tabular-nums lining-nums",
        "data-[status=current]:bg-foreground/20 data-[status=current]:text-foreground data-[status=upcoming]:text-subtle",
        "data-viewing:outline-[1.5px] data-viewing:outline-offset-2 data-viewing:outline-foreground/45 data-viewing:outline-solid",
        className
      )}
      {...props}
    >
      {status === "done" ? <Check className="size-3" strokeWidth={3.25} /> : index + 1}
    </span>
  )
}

function StepTrack({
  className,
  steps,
  viewing = null,
  onStepSelect,
  messages,
  "aria-label": label = "Steps",
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  steps: StepTrackStep[]
  /** the step being read back, when it is not the live one */
  viewing?: number | null
  /** a reached step was picked, from the menu or its segment */
  onStepSelect?: (index: number) => void
  messages?: Partial<StepTrackMessages>
}) {
  const say = { ...MESSAGES, ...messages }
  const count = steps.length
  const lit = steps.map((s) => s.status !== "upcoming")
  const delays = useSweep(lit)

  const started = lit.some(Boolean)
  const finished = count > 0 && steps.every((s) => s.status === "done")
  const at = steps.findIndex((s) => s.status === "current")
  const where = at === -1 ? lit.lastIndexOf(true) : at
  const looking = (i: number) => viewing === i && steps[i]?.status !== "current" && started

  return (
    <nav data-slot="step-track" aria-label={label} className={cn("shrink-0 pt-3 pb-1", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger
          data-slot="step-track-line"
          disabled={!started}
          className="group/step-track-line -mx-1.5 flex h-[1.125rem] max-w-[calc(100%+0.75rem)] items-center gap-1.5 rounded-md px-1.5 text-[0.875rem] leading-[1.125rem] font-label outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:hover:bg-transparent data-[state=open]:bg-surface-hover"
        >
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {!started ? say.steps(count) : finished ? say.finished(count) : say.step(where + 1, count)}
          </span>
          {started && !finished && (
            <>
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
              <span className="truncate font-medium text-foreground">{steps[where].label}</span>
            </>
          )}
          {started && (
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/step-track-line:rotate-180 motion-reduce:transition-none"
            />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" alignOffset={-8} className="w-64">
          {steps.map((step, i) => {
            const current = step.status === "current"
            const back = looking(i)
            return (
              <DropdownMenuItem
                key={i}
                data-slot="step-track-menu-item"
                data-status={step.status}
                disabled={step.status === "upcoming"}
                onSelect={() => onStepSelect?.(i)}
                aria-current={back ? "location" : current ? "step" : undefined}
                className={cn("min-h-10 gap-3 px-2.5", (current || back) && "bg-foreground/[0.06]")}
              >
                <StepTrackIndicator index={i} status={step.status} viewing={back} />
                <span className="min-w-0 flex-1 truncate">{step.title ?? step.label}</span>
                {(step.status === "done" || current) && (
                  <span className="shrink-0 text-caption text-muted-foreground">{current ? say.current : say.done}</span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span data-slot="step-track-list" className="mt-2 grid gap-1" style={columns(count)}>
        {steps.map((step, i) => {
          const current = step.status === "current"
          const back = looking(i)
          return (
            <button
              key={i}
              type="button"
              data-slot="step-track-item"
              data-status={step.status}
              disabled={step.status === "upcoming"}
              onClick={() => onStepSelect?.(i)}
              aria-current={back ? "location" : current ? "step" : undefined}
              aria-label={`${say.step(i + 1, count)}, ${step.title ?? step.label}`}
              className="flex h-3 items-center outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
            >
              <StepTrackSegment index={i} count={count} lit={lit[i]} delay={delays[i]} />
            </button>
          )
        })}
      </span>
    </nav>
  )
}

/* The track alone, a phone header's bottom edge: the same 4px segments, 4px
   apart, inset 16 from the sides and 8 off the bottom, under the header's
   "Step 1 of 4" line. Set the header relative. With nothing lit yet empty
   segments read as a broken rule, so it draws the header's hairline instead */
function StepTrackBar({ className, count, lit, ...props }: React.ComponentProps<"span"> & { count: number; lit: number }) {
  const on = Array.from({ length: count }, (_, i) => i < lit)
  const delays = useSweep(on)
  if (lit <= 0)
    return <span data-slot="step-track-bar" aria-hidden="true" className={cn("absolute inset-x-0 bottom-0 h-px bg-border", className)} {...props} />
  return (
    <span
      data-slot="step-track-bar"
      aria-hidden="true"
      className={cn("absolute inset-x-4 bottom-2 grid gap-1", className)}
      style={columns(count)}
      {...props}
    >
      {on.map((isLit, i) => (
        <StepTrackSegment key={i} index={i} count={count} lit={isLit} delay={delays[i]} />
      ))}
    </span>
  )
}

export { StepTrack, StepTrackBar, StepTrackIndicator, StepTrackSegment }
export type { StepTrackMessages, StepTrackStatus, StepTrackStep }
