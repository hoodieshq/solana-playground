import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/* Something to run from the conversation: Build, Deploy, Run, Call. An icon
   tile, a title, a line of context and the button. Running, the context
   gives way to the stage ("Deploying · 2 of 3"), the button keeps its width
   with a spinner over its label, and RunCardProgress fills along the foot,
   each stage over the time it is expected to take. Once it ran it is
   RunCardRecord, one line with no button.

   horizontal puts the button beside the text while the text keeps 15rem,
   and under it, full width, once it would not. vertical stacks everything,
   for a card that carries a field or a list of its own. On a phone both
   stack and the button takes 48px under the thumb.

   It sets its words as a result's status row does, 16 at 500 over 14 in
   grey, with the cards' action button: 40 tall with a mouse, 44 under a
   finger. Like the quiz it waits on you, so bleed steps it out of the text
   column to 8px from the panel's edges. It assumes a column inset 20px from
   the panel (16 on a phone); a host with another inset sets --bleed to its
   inset less 8. The space over the card is the host's: stand it 40 under
   the text above it. */

/* The same as Quiz's bleed, so the two cards that wait on you line up */
const bleedClass = "[--bleed:12px] max-sm:[--bleed:8px] -mx-(--bleed)"

type RunCardState = "idle" | "running" | "interrupted"

const RunCardContext = React.createContext<{ state: RunCardState }>({ state: "idle" })

const runCardVariants = cva(
  "group/run-card relative flex gap-3 overflow-hidden rounded-panel border border-border bg-card-ground p-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-4",
  {
    variants: {
      orientation: {
        horizontal: "flex-wrap items-center",
        vertical: "flex-col items-stretch",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function RunCard({
  className,
  state = "idle",
  orientation = "horizontal",
  bleed = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof runCardVariants> & {
    state?: RunCardState
    /** step out of the text column to 8px from the panel's edges */
    bleed?: boolean
  }) {
  return (
    <RunCardContext.Provider value={{ state }}>
      <div
        data-slot="run-card"
        data-state={state}
        data-orientation={orientation}
        data-bleed={bleed || undefined}
        className={cn(runCardVariants({ orientation }), bleed && bleedClass, className)}
        {...props}
      />
    </RunCardContext.Provider>
  )
}

/* The icon and the words beside it, which grow before the button does. The icon keeps to the title's top, so a second line of words doesn't slide it down between them */
function RunCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="run-card-header"
      className={cn("flex min-w-0 items-start gap-3 sm:group-data-[orientation=horizontal]/run-card:grow-[999] sm:group-data-[orientation=horizontal]/run-card:basis-60", className)}
      {...props}
    />
  )
}

/* Lights a step while the run goes */
function RunCardIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="run-card-icon"
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-surface-raised text-muted-foreground transition-colors duration-150 group-data-[state=running]/run-card:bg-surface-hover group-data-[state=running]/run-card:text-foreground motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function RunCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="run-card-content" className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
}

function RunCardTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="run-card-title"
      className={cn("font-heading text-[1rem] leading-6 font-medium tracking-normal text-foreground", className)}
      {...props}
    />
  )
}

/* The context, and while it runs the stage. It is a live status then, so a
   screen reader hears each stage. Interrupted, it turns to the warning ink.
   14 on a 20 line, so a small code chip (19 tall) fits without opening it */
function RunCardDescription({ className, ...props }: React.ComponentProps<"span">) {
  const { state } = React.useContext(RunCardContext)
  return (
    <span
      data-slot="run-card-description"
      role={state === "running" ? "status" : undefined}
      className={cn("text-[0.875rem] leading-5 text-muted-foreground group-data-[state=interrupted]/run-card:text-warning-ink", className)}
      {...props}
    />
  )
}

/* The stage's count after its name: "· 2 of 3" */
function RunCardCount({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="run-card-count" className={cn("text-subtle tabular-nums", className)} {...props} />
}

/* The run's button, at the cards' action size in the heading face, so a
   filled button and an outlined one beside it line up. While the card runs,
   or when loading is set, the label stays to hold the width, unseen, and a
   spinner sits over it */
function RunCardAction({
  className,
  loading,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  const { state } = React.useContext(RunCardContext)
  const busy = loading ?? state === "running"
  return (
    <Button
      data-slot="run-card-action"
      size="lg"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        // The coarse pointer height is named again on a phone, or the 44 for a finger wins over its 48
        "relative h-10 shrink-0 gap-2 px-4 font-heading text-[0.9375rem] font-medium pointer-coarse:h-11 sm:group-data-[orientation=horizontal]/run-card:grow max-sm:h-12 max-sm:pointer-coarse:h-12",
        className
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", busy && "invisible")}>{children}</span>
      {busy && <Spinner aria-hidden="true" className="absolute inset-0 m-auto size-4" />}
    </Button>
  )
}

/* Along the foot: the run a stage at a time, each filling its share over
   duration (ms), so a deploy reads 1 of 3, 2 of 3, 3 of 3. It stops short of
   the share's end and waits there until the next stage comes. The stage is
   said in words by RunCardDescription, so the bar is not read out */
function RunCardProgress({
  className,
  style,
  stage,
  stages,
  duration = 1600,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** the stage running now, from 0 */
  stage: number
  /** how many stages the run has */
  stages: number
  /** how long this stage is expected to take, in ms */
  duration?: number
}) {
  const from = stage / stages
  const [to, setTo] = React.useState(from)
  React.useEffect(() => {
    setTo(stage / stages)
    const frame = requestAnimationFrame(() => setTo((stage + 0.92) / stages))
    return () => cancelAnimationFrame(frame)
  }, [stage, stages])
  const growing = to > from
  return (
    <span
      data-slot="run-card-progress"
      aria-hidden="true"
      style={{ transform: `scaleX(${to})`, transitionDuration: growing ? `${duration}ms` : "0ms", ...style }}
      className={cn(
        "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/30 transition-transform ease-linear motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

/* A run done, in one line: "Deployed in 4.2 s". The icon is a green tick
   unless another is given, as for a run that stopped short */
function RunCardRecord({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  return (
    <div
      data-slot="run-card-record"
      className={cn(
        "flex h-9 items-center gap-2 rounded-control border border-border bg-card-ground px-3 text-caption text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="flex shrink-0 text-subtle">
          {icon}
        </span>
      ) : (
        <Check aria-hidden="true" className="text-success" />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

export {
  RunCard,
  RunCardAction,
  RunCardContent,
  RunCardCount,
  RunCardDescription,
  RunCardHeader,
  RunCardIcon,
  RunCardProgress,
  RunCardRecord,
  RunCardTitle,
  runCardVariants,
}
