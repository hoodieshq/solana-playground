import { Anchor, Check, Play, X } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementMedia } from "@/components/ui/achievement"
import { brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, STEPS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Finish() {
  const { s, dispatch } = useStore()
  const total = STEPS.length
  const passed = s.passed.filter(Boolean).length
  const firstTry = s.firstTry.filter(Boolean).length
  const minutes = s.startedAt && s.finishedAt ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : 1

  const tiles = [
    { value: `${passed}/${total}`, label: "steps" },
    { value: `${firstTry}/${total}`, label: "first try" },
    { value: `${minutes} min`, label: "to finish" },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X className="size-5" />
          </Button>
        }
      />
      {/* No bottom bar here: what comes next is a section of its own, with room around it */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-8 pb-[calc(var(--safe-bottom)+16px)]">
        {/* The flow's peak: the badge pops in once, on the design system's pop curve, and simply appears with reduced motion */}
        <Achievement className="mx-auto w-auto">
          <AchievementMedia className="size-20 shadow-glow duration-[440ms] ease-pop animate-in fade-in zoom-in-50 motion-reduce:animate-none">
            <Anchor />
          </AchievementMedia>
        </Achievement>
        <h2 className="mt-5 text-center font-heading text-display">Tutorial complete</h2>
        <p className="mx-auto mt-2 max-w-[30ch] text-center text-body text-muted-foreground">
          Your program is live on devnet, and you earned the First Anchor program badge.
        </p>

        <dl className="mt-7 grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col-reverse rounded-panel border border-border bg-surface-panel p-3 text-center">
              <dt className="text-caption text-muted-foreground">{t.label}</dt>
              <dd className="font-heading text-title tabular-nums">{t.value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-caption text-muted-foreground">What you learned</h3>
        <ul className="mt-3 flex flex-col gap-2.5">
          {STEPS.map((step) => (
            <li key={step.id} className="flex items-start gap-2.5 text-body text-muted-foreground">
              <Check strokeWidth={2.25} className="mt-1 size-4 shrink-0 text-success" />
              {step.learned}
            </li>
          ))}
        </ul>

        <section aria-labelledby="next-title" className="mt-8">
          <h3 id="next-title" className="mb-3 text-caption text-muted-foreground">
            Up next
          </h3>
          {/* The whole card starts the next tutorial, the same card and ring as Continue in the gallery */}
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

        <Button variant="secondary" className="mt-8 h-14 w-full text-control" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          Back to tutorials
        </Button>
      </div>
    </div>
  )
}
