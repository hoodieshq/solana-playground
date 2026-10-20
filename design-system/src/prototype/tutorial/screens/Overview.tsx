import { useState } from "react"
import { Check, ChevronLeft, RotateCcw } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Overview() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const total = STEPS.length
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  // Steps passed and the one you're on can be opened. The ones after it wait
  const reachable = (i: number) => s.passed[i] || first === -1 || i <= first

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The large title below names the screen, so the bar keeps only the way back */}
      <TopBar
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
            <h1 className="font-heading text-display">Hello Anchor</h1>
            <p className="mt-1 text-caption text-muted-foreground">Beginner · Anchor · 10 min · by acheron</p>
          </div>
        </div>
        <p className="mt-4 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        {/* The same bar and count as Continue in the gallery and the step screen */}
        {(started || finished) && (
          <div className="mt-5 flex items-center gap-3">
            <ObjectiveMeter value={done / total} className="h-1 flex-1" />
            <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
              {done} of {total}
            </span>
          </div>
        )}

        <ol className="mt-5">
          {STEPS.map((step, i) => {
            const passed = s.passed[i]
            const current = !finished && i === first
            const open = reachable(i)
            return (
              <li key={step.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => dispatch({ type: "openStep", step: i })}
                  aria-label={`Step ${i + 1}, ${step.title}${passed ? ", passed" : current ? ", current" : ""}`}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-control px-2 py-3 text-left transition-colors duration-150 ease-standard enabled:hover:bg-surface enabled:active:bg-surface disabled:cursor-default motion-reduce:transition-none"
                >
                  {/* Done is a green ring with a check, the same weight as the current step's purple ring */}
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-caption text-muted-foreground",
                      passed && "border-success text-success",
                      current && "border-primary text-foreground"
                    )}
                  >
                    {passed ? <Check strokeWidth={2.5} className="size-3.5" /> : i + 1}
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

        {/* Starting over clears progress, so it lives away from Continue and asks first */}
        {started && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="mt-4 flex h-11 items-center gap-1.5 text-caption text-muted-foreground active:text-foreground"
          >
            <RotateCcw strokeWidth={1.75} className="size-4" />
            Start over
          </button>
        )}
      </div>

      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(var(--safe-bottom),16px)]">
        <BrandButton
          variant="accent"
          className="h-14 w-full text-control"
          onClick={() => (finished ? setConfirm(true) : dispatch({ type: "start" }))}
        >
          {finished ? "Start again" : started ? `Continue from step ${first + 1}` : "Start"}
        </BrandButton>
      </footer>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Start Hello Anchor over?</AlertDialogTitle>
            <AlertDialogDescription>
              {done === 1 ? "Your passed step" : `Your ${done} passed steps`} and the code you applied will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="h-11" onClick={() => dispatch({ type: "restart" })}>
              Start over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
