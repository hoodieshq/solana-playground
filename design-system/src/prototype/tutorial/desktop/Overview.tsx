import { useState } from "react"
import { ChevronLeft, RotateCcw } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"

import { STEPS, thumb } from "../data"
import { targetFor, useStore } from "../store"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepList } from "../ui/StepList"
import { Thumb } from "../ui/Thumb"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { Workspace } from "./Workspace"

// The program as the last step leaves it
const BUILT = targetFor(STEPS[STEPS.length - 1]) ?? ""

/** The tutorial page lives in the lesson's column, beside the project as it was left. Start and
 * Continue change only what the column holds, so stepping in doesn't move the layout */
export function Overview() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const total = STEPS.length
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const fresh = !started && !finished

  return (
    <>
      <Column label="Tutorial">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-2">
          <Button variant="ghost" className="h-9 gap-1.5 px-2 text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <ChevronLeft className="size-4" />
            Tutorials
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
            <div className="min-w-0">
              <h1 className="font-heading text-[1.375rem] leading-tight">Hello Anchor</h1>
              <p className="mt-1 text-caption text-muted-foreground">Beginner · Anchor · 10 min · by acheron</p>
            </div>
          </div>
          {/* 15, the size of the step titles: the steps are what this page is about, so the summary stays quieter */}
          <p className="mt-4 text-[0.9375rem]/[1.5] text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>
          {(started || finished) && (
            <div className="mt-5 flex items-center gap-3">
              <ObjectiveMeter value={done / total} className="h-1 flex-1" />
              <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                {done} of {total}
              </span>
            </div>
          )}
          <StepList className="mt-4" />
        </div>
        <div className="shrink-0 border-t border-border px-5 pt-4 pb-5">
          <BrandButton variant="accent" className="h-12 w-full" onClick={() => (finished ? setConfirm(true) : dispatch({ type: "start" }))}>
            {finished ? "Start again" : started ? `Continue from step ${first + 1}` : "Start"}
          </BrandButton>
          {started && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-2 flex h-9 items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
            >
              <RotateCcw strokeWidth={1.75} className="size-4" />
              Start over
            </button>
          )}
        </div>
      </Column>

      {/* Before the start the project is a single comment, so it shows the program the tutorial ends
          with instead: what you'll build. Once started, the code as it was left */}
      <Workspace
        file="src/lib.rs"
        tools={<span className="px-2 text-caption text-muted-foreground">{fresh ? "What you'll build" : "Continue to edit"}</span>}
      >
        <Editor code={fresh ? BUILT : s.files["src/lib.rs"]} readOnly dim={!fresh} label={`src/lib.rs, read only${fresh ? ", the finished program" : ""}`} />
      </Workspace>

      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </>
  )
}
