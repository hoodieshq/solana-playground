import { CircleAlert, CircleCheck, CircleDashed, Lightbulb } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"

import { STEPS } from "../data"
import { fixFor, lastResult, patchFor, useStore, type State } from "../store"
import { AssistantMark } from "./AssistantMark"
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
  // Under the explanation sheet the step keeps saying where it stands: the error it explains, or the pass
  const phase = s.phase === "explain" ? (s.error ? "failed" : s.passed[s.step] ? "passed" : "idle") : s.phase

  if (phase === "building" || phase === "deploying") {
    const detail =
      phase === "deploying"
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
  if (phase === "passed" && r?.ok)
    return (
      <>
        <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        <span className="text-success">{r.note}</span>
      </>
    )
  if (phase === "failed" && s.error)
    return (
      <>
        <CircleAlert strokeWidth={1.75} className="mt-px size-4 shrink-0 text-error" />
        {/* The reason can name code, in ticks, as the assistant's messages do */}
        <span className="text-error">
          <Prose text={s.error.reason} />
        </span>
      </>
    )
  if (phase === "patch") {
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
          <AssistantMark className="mt-px size-[18px] text-brand-purple" />
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
