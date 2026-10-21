import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"

import { STEPS } from "../data"
import { fixFor, useStore } from "../store"
import { AssistantMark } from "../ui/AssistantMark"
import { StepStatus, workingLabel } from "../ui/StepStatus"

const BTN = "h-10 gap-2 px-4 text-control"

/** The step's actions under the editor, the desktop cut of the phone's bottom zone: the status on
 * the left, the buttons on the right. Build checks what was typed; the assistant is the second way.
 * `explained` is set once Explain has answered, then the main button offers the fix */
export function ActionBar({ asking, explained, onExplain }: { asking: boolean; explained: boolean; onExplain: () => void }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying"
  const fix = fixFor(s)

  let buttons: ReactNode
  if (s.phase === "passed") {
    buttons = (
      <Button className={`${BTN} bg-success text-success-foreground hover:bg-success/90`} onClick={() => dispatch({ type: "next" })}>
        {last ? "Finish tutorial" : "Next step"}
        <ArrowRight strokeWidth={2.25} className="size-4" />
      </Button>
    )
  } else if (s.phase === "patch") {
    // The quick check comes first. Its answer, or Skip, brings the code and these buttons
    buttons = asking ? null : (
      <>
        <Button variant="secondary" className={BTN} onClick={() => dispatch({ type: "close" })}>
          Discard
        </Button>
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "apply" })}>
          {step.id === "call-client" ? "Apply and run" : "Apply and build"}
        </BrandButton>
      </>
    )
  } else if (s.phase === "failed") {
    buttons = explained ? (
      fix && (
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "reviewFix" })}>
          Review the fix
        </BrandButton>
      )
    ) : (
      <BrandButton variant="accent" className={BTN} onClick={onExplain}>
        Explain
      </BrandButton>
    )
  } else {
    buttons = (
      <>
        {step.patch && (
          <Button variant="secondary" disabled={busy} className={BTN} onClick={() => dispatch({ type: "askPatch" })}>
            {/* In the label's colour: Build beside it is the one accent */}
            <AssistantMark />
            Write with assistant
          </Button>
        )}
        <BrandButton variant="accent" disabled={busy} className={BTN} onClick={() => dispatch(step.deploy ? { type: "deploy" } : { type: "buildOwn" })}>
          {busy ? workingLabel(s) : step.deploy ? "Deploy to devnet" : step.id === "call-client" ? "Run the client" : "Build"}
          {!busy && <Kbd className="bg-white/15! text-current!">⌘B</Kbd>}
        </BrandButton>
      </>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface-panel px-4 py-3">
      <p role="status" aria-live="polite" className="flex min-w-0 flex-1 items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
        {asking ? <span>Answer the quick check to see the code, or skip it</span> : <StepStatus />}
      </p>
      {/* Holds the bar's height when there are no buttons, so the code above doesn't jump */}
      <div className="flex h-10 shrink-0 items-center gap-2">{buttons}</div>
    </div>
  )
}
