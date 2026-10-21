import { ArrowRight, Hand } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { StepStatus, workingLabel, type Lead } from "./StepStatus"

/** The bottom of a step: a big zone, after Mimo's, holding the step's status
 * and one main button that shows the state too. Write or Deploy, then
 * Building, then a green Next. The status line replaces both the "Done when"
 * line up top and the passed / not yet sheets */
export function ActionZone({ lead }: { lead?: Lead }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying"
  const passed = s.phase === "passed"
  const failed = s.phase === "failed"
  const reviewing = s.phase === "patch"
  const big = "h-14 text-control"

  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      <p role="status" aria-live="polite" className="mb-4 flex min-h-5 items-start gap-1.5 px-1 text-caption leading-relaxed text-muted-foreground">
        <StepStatus lead={lead} />
      </p>
      <div className="flex gap-2">
        {reviewing ? (
          <Button variant="secondary" className={cn(big, "px-5")} onClick={() => dispatch({ type: "close" })}>
            Discard
          </Button>
        ) : (
          // A raised hand: you have a question. In the label's colour, so the main button stays the one accent
          <Button
            variant="secondary"
            disabled={busy}
            className={cn(big, "gap-2 px-4")}
            aria-label="Ask the assistant about this step"
            onClick={() => dispatch({ type: "explain", mode: "step" })}
          >
            <Hand strokeWidth={1.75} className="size-[18px]" />
            Ask
          </Button>
        )}

        {passed ? (
          <Button
            className={cn(big, "min-w-0 flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90")}
            onClick={() => dispatch({ type: "next" })}
          >
            {last ? "Finish tutorial" : `Next: ${STEPS[s.step + 1].title}`}
            <ArrowRight strokeWidth={2.25} className="size-4" />
          </Button>
        ) : (
          <BrandButton
            variant="accent"
            disabled={busy}
            className={cn(big, "min-w-0 flex-1 gap-2")}
            onClick={() =>
              dispatch(
                reviewing
                  ? { type: "apply" }
                  : failed
                    ? { type: "explain", mode: "error" }
                    : step.deploy
                      ? { type: "deploy" }
                      : { type: "askPatch" }
              )
            }
          >
            {busy ? workingLabel(s) : reviewing ? (s.review === "fix" ? "Apply and build" : "Apply") : failed ? "Explain" : step.cta}
          </BrandButton>
        )}
      </div>
    </footer>
  )
}
