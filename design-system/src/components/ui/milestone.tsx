import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* A step passed, the moment in the flow: a check whose ring draws closed and
   then its tick, a headline at display size, one line and the way on. No
   frame: it stands in the conversation as the assistant's own text does.
   Once the way on is taken it folds to MilestoneRecord, one line with the
   time. Give the root an aria-label, "Step 1 done". The mark, then 16 to
   the headline, 9 to its line and 24 to the actions, so mark, headline and
   line read as one group top down. A headline carries no full stop. */

function Milestone({ className, ...props }: React.ComponentProps<"section">) {
  return <section data-slot="milestone" className={cn("animate-pop py-6 motion-reduce:animate-none", className)} {...props} />
}

/* The pass, drawn: Lucide's CircleCheck stroke for stroke, the ring from the
   top clockwise, the tick after it. With reduced motion it is simply whole */
function MilestoneMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      data-slot="milestone-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-8 text-success", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" pathLength={1} transform="rotate(-90 12 12)" className="[stroke-dasharray:1] animate-draw motion-reduce:animate-none" />
      <path
        d="m9 12 2 2 4-4"
        pathLength={1}
        className="[stroke-dasharray:1] [animation:draw_140ms_var(--ease-out-value)_180ms_both] motion-reduce:[animation:none]"
      />
    </svg>
  )
}

/* The display size on a 32 line: its own 1.15 left the line at 32.2 and
   every gap under it a fraction */
function MilestoneTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="milestone-title" className={cn("mt-4 font-heading text-display leading-8 text-foreground", className)} {...props} />
}

function MilestoneDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="milestone-description"
      className={cn("mt-[9px] text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80", className)}
      {...props}
    />
  )
}

/* 24 under the line on every screen; full width under the thumb on a phone */
function MilestoneActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="milestone-actions"
      className={cn("mt-6 flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch", className)}
      {...props}
    />
  )
}

/* The milestone once passed: "Step 1 done · Your program is live", and the
   time it took at the end */
function MilestoneRecord({
  className,
  meta,
  children,
  ...props
}: React.ComponentProps<"div"> & { meta?: React.ReactNode }) {
  return (
    <div
      data-slot="milestone-record"
      className={cn(
        "flex h-9 items-center gap-2 rounded-control border border-border bg-card-ground px-3 text-caption text-muted-foreground",
        className
      )}
      {...props}
    >
      <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />
      <span className="min-w-0 flex-1 truncate [&_strong]:font-normal [&_strong]:text-foreground">{children}</span>
      {meta && <span className="shrink-0 text-subtle tabular-nums">{meta}</span>}
    </div>
  )
}

export { Milestone, MilestoneActions, MilestoneDescription, MilestoneMark, MilestoneRecord, MilestoneTitle }
