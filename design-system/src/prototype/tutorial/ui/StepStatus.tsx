import { useState } from "react"
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
  if (s.phase === "calling") return "Calling..."
  return STEPS[s.step].id === "call-client" ? "Running..." : "Building..."
}

const RUNS = ["building", "deploying", "calling"]

/** The pass, drawn: the ring closes from the top, clockwise, then the tick follows, so the mark reads
 * as the run finishing rather than a badge swapped in. Lucide's CircleCheck, stroke for stroke. Keyed
 * by the caller, so each pass draws once; with reduced motion it's simply there (prototype.css) */
function PassMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px size-4 shrink-0 text-success">
      <circle cx="12" cy="12" r="10" pathLength={1} transform="rotate(-90 12 12)" className="pg-pass-ring" />
      <path d="m9 12 2 2 4-4" pathLength={1} className="pg-pass-tick" />
    </svg>
  )
}

/** The step's status: one icon and one sentence. Each signal shows once: the icon (dashed,
 * spinner, check, alert) lives only here, the button carries the action and its colour */
export function StepStatus({ lead }: { lead?: Lead }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  const r = lastResult(s)
  // A pass seen live, from a run that just finished, draws its mark; one found on opening a passed
  // step doesn't. Worked out while rendering, so the first frame of the pass already draws
  const [seen, setSeen] = useState({ phase: s.phase, step: s.step, passes: 0 })
  if (seen.phase !== s.phase || seen.step !== s.step) {
    const live = s.phase === "passed" && seen.step === s.step && RUNS.includes(seen.phase)
    setSeen({ phase: s.phase, step: s.step, passes: seen.passes + (live ? 1 : 0) })
  }
  // Under the explanation sheet the step keeps saying where it stands: the error it explains, or the pass
  const phase =
    s.phase === "explain"
      ? s.error
        ? "failed"
        : s.passed[s.step] && !s.changedSincePass[s.step]
          ? "passed"
          : step.call && s.built
            ? "call"
            : "idle"
      : s.phase

  if (phase === "building" || phase === "deploying" || phase === "calling") {
    const detail =
      phase === "deploying"
        ? `${step.deploy?.stages[s.deployStage]} (${s.deployStage + 1}/${step.deploy?.stages.length})`
        : phase === "calling"
          ? step.call?.working
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
        {seen.passes > 0 ? <PassMark key={seen.passes} /> : <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />}
        {/* A step with a call passed on the call, so the call says how */}
        <span className="text-success">{step.call?.note ?? r.note}</span>
      </>
    )
  // Built, and waiting for the call that finishes the step: still dashed, it isn't done yet
  if (phase === "call" && step.call)
    return (
      <>
        <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
        <span>{step.call.ready}</span>
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
  // The step passed, then its code changed: the pass was for other code, so it waits for a build
  const run = step.id === "call-client"
  return (
    <>
      <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
      <span>
        {s.changedSincePass[s.step]
          ? `Changed since the last ${run ? "run" : "build"}. ${run ? "Run" : "Build"} to check it again.`
          : `Done when ${step.checkedBy}`}
      </span>
    </>
  )
}
