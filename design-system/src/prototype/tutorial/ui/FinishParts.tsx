import { Anchor, Check, ExternalLink, Play } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementMedia } from "@/components/ui/achievement"
import { brandButtonVariants } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, STEPS, TX_SIGNATURE, shortKey, thumb } from "../data"
import { useStore } from "../store"
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

/** The last transaction, a link to it on Explorer: proof the program really runs */
export function LastTransaction({ className }: { className?: string }) {
  return (
    <section aria-labelledby="tx-title" className={className}>
      <h3 id="tx-title" className="text-caption text-muted-foreground">
        Your last transaction
      </h3>
      <a
        href={`https://explorer.solana.com/tx/${TX_SIGNATURE}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex min-h-11 items-center gap-4 rounded-control border border-border bg-surface-panel px-3 py-2 transition-colors hover:bg-surface active:bg-surface"
      >
        <code title={TX_SIGNATURE} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
          {shortKey(TX_SIGNATURE)}
        </code>
        <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
          Open in Explorer
          <ExternalLink strokeWidth={1.75} className="size-3.5" />
        </span>
      </a>
    </section>
  )
}

export function LearnedList({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {STEPS.map((step) => (
        <li key={step.id} className="flex items-start gap-2.5 text-body text-muted-foreground">
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
