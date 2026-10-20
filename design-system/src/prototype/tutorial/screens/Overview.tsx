import { Check, ChevronLeft } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { TopBar } from "../ui/TopBar"

export function Overview() {
  const { s, dispatch } = useStore()
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const label = finished ? "Start over" : started ? `Continue from step ${first + 1}` : "Start"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Back to tutorials" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <ChevronLeft className="size-6" />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <p className="text-caption text-muted-foreground">Beginner · Anchor · about 10 min</p>
        <h2 className="mt-1 font-heading text-display">Hello Anchor</h2>
        <p className="mt-1 text-caption text-muted-foreground">by acheron</p>
        <p className="mt-3 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        <ol className="mt-6">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = !finished && i === (first === -1 ? 0 : first) && started
            return (
              <li key={step.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-caption text-muted-foreground",
                    done && "border-success bg-success text-success-foreground",
                    current && "border-primary text-foreground"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-control">{step.title}</span>
                  <span className="block text-caption text-muted-foreground">{step.objective}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(var(--safe-bottom),12px)]">
        <BrandButton
          variant="accent"
          className="h-11 w-full"
          onClick={() => dispatch({ type: finished ? "restart" : "start" })}
        >
          {label}
        </BrandButton>
        {started && (
          <Button variant="ghost" className="mt-1 h-11 w-full text-muted-foreground" onClick={() => dispatch({ type: "restart" })}>
            Start over
          </Button>
        )}
      </footer>
    </div>
  )
}
