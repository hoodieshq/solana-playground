import { Check, ChevronLeft } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Overview() {
  const { s, dispatch } = useStore()
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const label = finished ? "Start over" : started ? `Continue from step ${first + 1}` : "Start"
  // Steps passed and the one you're on can be opened. The ones after it wait
  const reachable = (i: number) => s.passed[i] || first === -1 || i <= first

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
        <div className="flex items-center gap-4">
          <Thumb src={thumb("hello-anchor", "jpg")} className="size-16" />
          <div className="min-w-0">
            <h2 className="font-heading text-display">Hello Anchor</h2>
            <p className="mt-1 text-caption text-muted-foreground">Beginner · Anchor · 10 min · by acheron</p>
          </div>
        </div>
        <p className="mt-4 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        <ol className="mt-6">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = !finished && i === first
            const open = reachable(i)
            return (
              <li key={step.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => dispatch({ type: "openStep", step: i })}
                  aria-label={`Step ${i + 1}, ${step.title}${done ? ", passed" : current ? ", current" : ""}`}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-control px-2 py-3 text-left transition-colors duration-150 ease-standard enabled:hover:bg-surface enabled:active:bg-surface disabled:cursor-default motion-reduce:transition-none"
                >
                  {/* Done is a green ring with a check, the same weight as the current step's purple ring */}
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-caption text-muted-foreground",
                      done && "border-success text-success",
                      current && "border-primary text-foreground"
                    )}
                  >
                    {done ? <Check strokeWidth={2.5} className="size-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-control">{step.title}</span>
                    <span className="block text-caption text-muted-foreground">{step.objective}</span>
                  </span>
                </button>
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
