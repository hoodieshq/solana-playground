import { useState } from "react"
import { ChevronLeft, RotateCcw } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepList } from "../ui/StepList"
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
        {/* 15, the size of the step titles: the steps are what this page is about, so the summary stays quieter */}
        <p className="mt-4 text-[0.9375rem]/[1.5] text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        {/* The same bar and count as Continue in the gallery and the step screen */}
        {(started || finished) && (
          <div className="mt-5 flex items-center gap-3">
            <ObjectiveMeter value={done / total} className="h-1 flex-1" />
            <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
              {done} of {total}
            </span>
          </div>
        )}

        <StepList className="mt-5" />

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
          className="h-14 w-full"
          onClick={() => (finished ? setConfirm(true) : dispatch({ type: "start" }))}
        >
          {finished ? "Start again" : started ? `Continue from step ${first + 1}` : "Start"}
        </BrandButton>
      </footer>

      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </div>
  )
}
