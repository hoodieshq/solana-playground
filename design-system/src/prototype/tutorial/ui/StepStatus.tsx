import { CircleAlert, CircleCheck, CircleDashed, Lightbulb, MessageCircle } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"

import { STEPS } from "../data"
import { fixFor, lastResult, patchFor, useStore, type State } from "../store"
import { Prose } from "./Prose"
import { Typed } from "./Typed"

/** After a prediction: whether it was right, and why. It replaces the assistant's summary */
export type Lead = { text: string; right: boolean }

/** What the main button says while something runs */
export function workingLabel(s: State) {
  if (s.phase === "deploying") return "Deploying..."
  return STEPS[s.step].id === "call-client" ? "Running..." : "Building..."
}

/** The step's status: one icon and one sentence. Each signal shows once: the icon (dashed,
 * spinner, check, alert) lives only here, the button carries the action and its colour */
export function StepStatus({ lead }: { lead?: Lead }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  const r = lastResult(s)

  if (s.phase === "building" || s.phase === "deploying") {
    const detail =
      s.phase === "deploying"
        ? `${step.deploy?.stages[s.deployStage]} (${s.deployStage + 1}/${step.deploy?.stages.length})`
        : step.id === "call-client"
          ? `Running ${step.file} on devnet`
          : "Compiling hello_anchor on the build server"
    return (
      <>
        <Spinner className="mt-px size-4 shrink-0" />
        <span>{detail}</span>
      </>
    )
  }
  if (s.phase === "passed" && r?.ok)
    return (
      <>
        <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        <span className="text-success">{r.note}</span>
      </>
    )
  if (s.phase === "failed" && s.error)
    return (
      <>
        <CircleAlert strokeWidth={1.75} className="mt-px size-4 shrink-0 text-error" />
        <span className="text-error">{s.error.reason}</span>
      </>
    )
  if (s.phase === "patch") {
    // The assistant speaks here, by the buttons, so nothing sits over the code
    const proposal = s.review === "fix" ? fixFor(s) : patchFor(s)
    return (
      <>
        {/* A right answer, a wrong one (a hint, not an error), or the assistant speaking */}
        {lead?.right ? (
          <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        ) : lead ? (
          <Lightbulb strokeWidth={1.75} className="mt-px size-4 shrink-0 text-warning" />
        ) : (
          <MessageCircle strokeWidth={1.75} className="mt-px size-4 shrink-0 text-brand-purple" />
        )}
        <span className="text-foreground">
          {lead ? <Prose text={lead.text} /> : <Typed key={proposal?.summary} text={proposal?.summary ?? ""} />}
        </span>
      </>
    )
  }
  return (
    <>
      <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
      <span>Done when {step.checkedBy}</span>
    </>
  )
}
