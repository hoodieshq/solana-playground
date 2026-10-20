import { Anchor, Check, X } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementLabel, AchievementMedia } from "@/components/ui/achievement"
import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"

import { NEXT_TUTORIAL, STEPS, thumb } from "../data"
import { useStore } from "../store"
import { TopBar } from "../ui/TopBar"

export function Finish() {
  const { s, dispatch } = useStore()
  const passed = s.passed.filter(Boolean).length
  const firstTry = s.firstTry.filter(Boolean).length
  const minutes = s.startedAt && s.finishedAt ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : 1

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-6">
        <Achievement className="mx-auto w-auto">
          <AchievementMedia className="size-20">
            <Anchor />
          </AchievementMedia>
          <AchievementLabel>First Anchor program</AchievementLabel>
        </Achievement>
        <h2 className="mt-4 text-center font-heading text-display">Tutorial complete</h2>
        <p className="mt-1 text-center text-body text-muted-foreground">Your first Anchor program is live on devnet.</p>

        <dl className="mt-6 grid grid-cols-3 gap-2">
          {[
            { v: `${passed}/${STEPS.length}`, l: "steps" },
            { v: String(firstTry), l: "first try" },
            { v: `${minutes} min`, l: "time" },
          ].map((t) => (
            <div key={t.l} className="rounded-panel bg-surface-panel p-3 text-center">
              <dt className="sr-only">{t.l}</dt>
              <dd className="font-heading text-title">{t.v}</dd>
              <dd className="text-caption text-subtle">{t.l}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-caption text-subtle">What you learned</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {STEPS.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-body">
              <Check className="mt-1 size-4 shrink-0 text-success" />
              {step.learned}
            </li>
          ))}
        </ul>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-center gap-3">
          <img src={thumb(NEXT_TUTORIAL.slug, NEXT_TUTORIAL.ext)} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-caption text-subtle">
              Up next · {NEXT_TUTORIAL.level} · {NEXT_TUTORIAL.framework}
            </p>
            <p className="truncate text-control">{NEXT_TUTORIAL.name}</p>
          </div>
        </div>
        <BrandButton variant="accent" className="mt-3 h-11 w-full" onClick={() => toast("Only Hello Anchor is in this prototype")}>
          Start {NEXT_TUTORIAL.name}
        </BrandButton>
        <Button variant="ghost" className="mt-1 h-11 w-full text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          Back to tutorials
        </Button>
      </footer>
    </div>
  )
}
