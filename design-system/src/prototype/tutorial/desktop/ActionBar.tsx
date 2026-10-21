import { useEffect, useRef, type ReactNode } from "react"
import { FileDiff } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"

import { STEPS } from "../data"
import { fixFor, useStore } from "../store"
import { AssistantMark } from "../ui/AssistantMark"
import { NameField } from "../ui/NameField"
import { StepStatus, workingLabel } from "../ui/StepStatus"
import { PRIMARY_KEYS } from "./keys"
import { isCoarse, useKeyHints } from "./pointer"
import { Shortcut } from "./Shortcut"

const BTN = "h-10 gap-2 px-4"

/** The step's actions under the editor, the desktop cut of the phone's bottom zone: the step's
 * state on the left, the one place it shows, and the buttons on the right. Build checks what was
 * typed; the assistant is the second way, and it speaks in the column, not here. Once Explain has
 * answered (`explained` in the store), the main button offers the fix. ⌘Enter presses whichever
 * button shows its keys */
export function ActionBar({ asking, onExplain }: { asking: boolean; onExplain: () => void }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying" || s.phase === "calling"
  const client = step.id === "call-client"
  const fix = fixFor(s)
  // Only where there's a keyboard to press them on
  const keys = useKeyHints() ? <Shortcut keys={PRIMARY_KEYS} /> : null

  // A pass hands the focus to Next, so Enter or Space goes on from wherever it was, the editor too.
  // A build that waits for its call hands it to the name, with a mouse: on a tablet the focus would
  // bring the keyboard up over the log the learner is about to read
  const next = useRef<HTMLButtonElement>(null)
  const name = useRef<HTMLInputElement>(null)
  const was = useRef(s.phase)
  useEffect(() => {
    const ran = was.current === "building" || was.current === "deploying" || was.current === "calling"
    if (s.phase === "passed" && ran) next.current?.focus()
    if (s.phase === "call" && was.current === "building" && !isCoarse()) name.current?.focus()
    was.current = s.phase
  }, [s.phase])

  let buttons: ReactNode
  if (s.phase === "passed") {
    buttons = (
      <Button ref={next} className={`${BTN} bg-success text-success-foreground hover:bg-success/90`} onClick={() => dispatch({ type: "next" })}>
        {/* Where it leads, as on the phone. The key says how; the phone's arrow would be a second sign for the same thing */}
        {last ? "Finish tutorial" : `Next: ${STEPS[s.step + 1].title}`}
        {keys}
      </Button>
    )
  } else if (s.phase === "patch") {
    // The quick check comes first. Its answer, or Skip, brings the code and these buttons
    buttons = asking ? null : (
      <>
        <Button variant="secondary" className={BTN} onClick={() => dispatch({ type: "close" })}>
          Don't apply
        </Button>
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "apply" })}>
          {client ? "Apply and run" : "Apply and build"}
          {keys}
        </BrandButton>
      </>
    )
  } else if (s.phase === "call" || s.phase === "calling") {
    // The step's last move: call hello with a name, the way a client would. Enter in the field or
    // ⌘Enter anywhere runs it
    const calling = s.phase === "calling"
    buttons = (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          dispatch({ type: "call" })
        }}
      >
        <label htmlFor="call-name" className="text-caption whitespace-nowrap text-muted-foreground">
          Call hello
        </label>
        <NameField id="call-name" inputRef={name} className="h-10 w-44 pointer-coarse:h-11" />
        <BrandButton type="submit" variant="accent" disabled={calling || !s.draft.trim()} className={BTN}>
          {calling ? workingLabel(s) : "Run"}
          {!calling && keys}
        </BrandButton>
      </form>
    )
  } else if (s.phase === "failed") {
    // One way on: understand the error, then see the fix. Building the same code again would fail
    // the same way, so there's no button for it; typing a change brings Build back
    buttons = s.explained ? (
      fix && (
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "reviewFix" })}>
          Review the fix
          {keys}
        </BrandButton>
      )
    ) : (
      <BrandButton variant="accent" className={BTN} onClick={onExplain}>
        Explain the error
        {keys}
      </BrandButton>
    )
  } else {
    buttons = (
      <>
        {step.patch && (
          <Button variant="secondary" disabled={busy} className={BTN} onClick={() => dispatch({ type: "askPatch" })}>
            {/* In the label's colour: Build beside it is the one accent */}
            <AssistantMark className="size-[18px]" />
            Write with assistant
          </Button>
        )}
        <BrandButton variant="accent" disabled={busy} className={BTN} onClick={() => dispatch(step.deploy ? { type: "deploy" } : { type: "buildOwn" })}>
          {busy ? workingLabel(s) : step.deploy ? "Deploy to devnet" : client ? "Run the client" : "Build"}
          {!busy && keys}
        </BrandButton>
      </>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface-panel px-4 py-3">
      <p role="status" aria-live="polite" className="flex min-w-0 flex-1 items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
        {asking ? (
          <span>Answer the quick check to see the code, or skip it</span>
        ) : s.phase === "patch" ? (
          // What the change is and why, the assistant says in the column. Here only what to do with it
          <>
            <FileDiff strokeWidth={1.75} className="mt-px size-4 shrink-0" />
            <span>Read the change in {step.file.split("/").pop()}, then apply it</span>
          </>
        ) : (
          // Idle, running, failed or passed: the same line as the phone's, so each state shows once
          <StepStatus />
        )}
      </p>
      {/* Holds the bar's height when there are no buttons, so the code above doesn't jump */}
      <div className="flex h-10 shrink-0 items-center gap-2">{buttons}</div>
    </div>
  )
}
