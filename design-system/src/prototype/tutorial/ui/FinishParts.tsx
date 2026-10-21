import { Anchor, Check, Play } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementMedia } from "@/components/ui/achievement"
import { brandButtonVariants } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, STEPS, shortKey, thumb } from "../data"
import { useStore } from "../store"
import { lastTx } from "../tx"
import { PrintedReceipt } from "./Receipt"
import { Thumb } from "./Thumb"

/** The flow's peak: the badge pops in once, on the design system's pop curve, and simply appears with reduced motion */
export function FinishBadge() {
  return (
    <Achievement className="mx-auto w-auto" role="img" aria-label="Badge earned: First Anchor program">
      <AchievementMedia className="size-16 shadow-glow duration-[440ms] ease-pop animate-in fade-in zoom-in-50 motion-reduce:animate-none">
        <Anchor />
      </AchievementMedia>
    </Achievement>
  )
}

/** One summary card, three columns split by hairlines: big numbers, small labels */
export function FinishStats({ className }: { className?: string }) {
  const { s } = useStore()
  const total = STEPS.length
  const minutes = s.startedAt && s.finishedAt ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : 1
  const tiles = [
    { value: `${s.passed.filter(Boolean).length}/${total}`, label: "steps" },
    { value: `${s.firstTry.filter(Boolean).length}/${total}`, label: "first try" },
    { value: `${minutes} min`, label: "to finish" },
  ]
  return (
    <dl className={cn("grid grid-cols-3 divide-x divide-border rounded-panel border border-border bg-surface-panel", className)}>
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col-reverse items-center px-2 py-3 text-center">
          <dt className="text-caption text-muted-foreground">{t.label}</dt>
          <dd className="font-heading text-[1.375rem] leading-tight tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The finish opens on what the program said back, the learner's own name in it, in the code's
 * type: the tutorial's outcome in its own words. Progress saved before step 4 asked for a name
 * falls back to step 3's Hello, World! */
export function FinishHeadline({ as: Tag = "h1", className }: { as?: "h1" | "h2"; className?: string }) {
  const { s } = useStore()
  const tx = lastTx(s)
  return (
    <div className={cn("text-center", className)}>
      <Tag className="font-mono text-[1.75rem] leading-tight font-medium tracking-tight break-words text-foreground">
        <span className="sr-only">Tutorial complete. Your program said </span>
        {tx.said}
      </Tag>
      <p className="mt-2 text-caption text-muted-foreground">
        from transaction <span className="font-mono">{shortKey(tx.signature)}</span>
      </p>
    </div>
  )
}

/** The last transaction as a printed receipt: proof the program really runs, and something to share */
export function LastTransaction({ className }: { className?: string }) {
  const { s } = useStore()
  return <PrintedReceipt tx={lastTx(s)} when={s.finishedAt} className={className} />
}

export function LearnedList({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {STEPS.map((step) => (
        // The reading weight, as in the lesson; grey stays, it's a secondary list
        <li key={step.id} className="flex items-start gap-2.5 text-body font-read text-muted-foreground">
          <Check strokeWidth={2.25} className="mt-1 size-4 shrink-0 text-success" />
          {step.learned}
        </li>
      ))}
    </ul>
  )
}

/** The whole card starts the next tutorial, the same card and ring as Continue in the gallery */
export function UpNextCard({ className }: { className?: string }) {
  return (
    <section aria-labelledby="next-title" className={className}>
      <h3 id="next-title" className="mb-2 text-caption text-muted-foreground">
        Up next
      </h3>
      <button
        type="button"
        onClick={() => toast("Only Hello Anchor is in this prototype")}
        aria-label={`Start ${NEXT_TUTORIAL.name}`}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"
      >
        <Thumb src={thumb(NEXT_TUTORIAL.slug, NEXT_TUTORIAL.ext)} className="size-14" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title">{NEXT_TUTORIAL.name}</span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            {NEXT_TUTORIAL.level} · {NEXT_TUTORIAL.framework}
          </span>
        </span>
        <span aria-hidden="true" className={cn(brandButtonVariants({ variant: "ring", size: "icon" }), "size-11")}>
          <Play className="size-4 fill-current" />
        </span>
      </button>
    </section>
  )
}
