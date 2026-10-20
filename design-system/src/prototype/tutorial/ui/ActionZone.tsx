import type { ReactNode } from "react"
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, FileDiff, MessageCircle } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { lastResult, useStore } from "../store"

/** The bottom of a step: a big zone, after Mimo's, holding the step's status
 * and one main button that shows the state too. Write or Deploy, then
 * Building, then a green Next. The status line replaces both the "Done when"
 * line up top and the passed / not yet sheets.
 * Each signal shows once: the status icon (dashed, spinner, check, alert)
 * lives only in the status line, the button carries the action and its colour */
export function ActionZone() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const r = lastResult(s)
  const busy = s.phase === "building" || s.phase === "deploying"
  const passed = s.phase === "passed"
  const failed = s.phase === "failed"
  const reviewing = s.phase === "patch"

  // The button says what is happening, the status line says how far along it is
  const client = step.id === "call-client"
  const working = s.phase === "deploying" ? "Deploying..." : client ? "Running..." : "Building..."
  const detail =
    s.phase === "deploying"
      ? `${step.deploy?.stages[s.deployStage]} (${s.deployStage + 1}/${step.deploy?.stages.length})`
      : client
        ? `Running ${step.file} on devnet`
        : "Compiling hello_anchor on the build server"

  let status: ReactNode
  if (busy) {
    status = (
      <>
        <Spinner className="mt-px size-4 shrink-0" />
        <span>{detail}</span>
      </>
    )
  } else if (passed && r?.ok) {
    status = (
      <>
        <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        <span>
          <span className="text-success">{r.note}</span>
        </span>
      </>
    )
  } else if (failed && s.error) {
    status = (
      <>
        <CircleAlert strokeWidth={1.75} className="mt-px size-4 shrink-0 text-error" />
        <span>
          <span className="text-error">{s.error.reason}</span>
        </span>
      </>
    )
  } else if (reviewing) {
    status = (
      <>
        <FileDiff strokeWidth={1.75} className="mt-px size-4 shrink-0" />
        <span>Review the change above. Nothing is applied yet</span>
      </>
    )
  } else {
    status = (
      <>
        <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
        <span>Done when {step.checkedBy}</span>
      </>
    )
  }

  const big = "h-14 text-control"

  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      <p role="status" aria-live="polite" className="mb-3 flex min-h-5 items-start gap-1.5 px-1 text-caption text-muted-foreground">
        {status}
      </p>
      <div className="flex gap-2">
        {reviewing ? (
          <Button variant="secondary" className={cn(big, "px-5")} onClick={() => dispatch({ type: "close" })}>
            Discard
          </Button>
        ) : failed ? (
          <Button variant="secondary" className={cn(big, "px-4")} onClick={() => dispatch({ type: "retry" })}>
            Try again
          </Button>
        ) : (
          // A chat bubble, the same one the assistant's sheets carry. It stands in until Sole has a mark (DES-134)
          <Button
            variant="secondary"
            disabled={busy}
            className={cn(big, "gap-2 px-4")}
            aria-label="Ask the assistant about this step"
            onClick={() => dispatch({ type: "explain", mode: "step" })}
          >
            <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
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
            {busy ? working : reviewing ? (s.review === "fix" ? "Apply and build" : "Apply") : failed ? "Explain" : step.cta}
          </BrandButton>
        )}
      </div>
    </footer>
  )
}
