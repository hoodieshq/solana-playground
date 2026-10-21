import { useEffect, useState } from "react"
import { BookOpen, ChevronLeft, Monitor, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { ContinueSheet } from "../sheets/ContinueSheet"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { LessonSheet } from "../sheets/LessonSheet"
import { fixFor, freshLines, patchFor, useStore } from "../store"
import { shownLog, stepTx } from "../tx"
import { ActionZone } from "../ui/ActionZone"
import { BuildLog } from "../ui/BuildLog"
import { ProgramId } from "../ui/ProgramId"
import { arriving } from "../tx"
import { Receipt } from "../ui/Receipt"
import { CodeView } from "../ui/CodeView"
import { InlineDiff } from "../ui/InlineDiff"
import { readingMinutes } from "../ui/LessonBlocks"
import { PredictZone } from "../ui/PredictZone"
import { StepProgress } from "../ui/StepProgress"

// Shown once a session: the first proposal opens its first note on its own
let taughtNotes = false

// A quiet action at the right end of the tabs row: 44px to hit, a word and an icon to read
const TOOL = "ml-auto flex h-11 shrink-0 items-center gap-1.5 px-1 text-caption text-muted-foreground active:text-foreground"

export function StepScreen() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [tab, setTab] = useState<"code" | "output">("code")
  const [lesson, setLesson] = useState(false)
  const [computer, setComputer] = useState(false)
  // Which line notes are open
  const [notes, setNotes] = useState<number[]>([])
  // The quick check's answer while its verdict shows, before the code does
  const [picked, setPicked] = useState<number | null>(null)
  // Whether the verdict still speaks for the patch on screen. It's for the patch the answer came
  // with: once that patch is closed or undone, opening it again brings the assistant's line
  const [verdict, setVerdict] = useState(false)

  useEffect(() => {
    setTab("code")
    setLesson(false)
    setComputer(false)
    setPicked(null)
    setVerdict(false)
  }, [s.step])

  useEffect(() => {
    if (s.phase === "building") {
      const t = window.setTimeout(() => dispatch({ type: "built" }), 2400)
      return () => window.clearTimeout(t)
    }
    if (s.phase === "deploying") {
      const t = window.setTimeout(() => dispatch({ type: "deployStage" }), 1100)
      return () => window.clearTimeout(t)
    }
    if (s.phase === "calling") {
      const t = window.setTimeout(() => dispatch({ type: "called" }), 1600)
      return () => window.clearTimeout(t)
    }
  }, [s.phase, s.deployStage, dispatch])

  // Deploying, running the client and calling hello change no code: what they produce is the
  // program id and the transaction, in the Output tab. So when they pass, the step opens on it. A
  // patch or a fix is read in the file, never with the output open over it
  const showsOutput = !!step.deploy || step.id === "call-client" || !!step.call
  useEffect(() => {
    if (s.phase === "passed" && showsOutput) setTab("output")
    if (s.phase === "patch") setTab("code")
    // A verdict belongs to the patch it came with. Don't apply, Undo or a build ends it
    if (s.phase !== "patch") {
      setVerdict(false)
      setPicked(null)
    }
  }, [s.phase, s.review, s.step, showsOutput])

  // Restore is for a build that failed: after a pass there's nothing to take back. It undoes the
  // assistant's patch or fix, so it says so; code you wrote yourself is "your code"
  const restorable = s.undo?.step === s.step && s.phase === "failed"
  const undoesPatch = s.applied === "patch" || s.applied === "fix"
  const undo = () => {
    dispatch({ type: "undo" })
    setTab("code")
    toast(undoesPatch ? "Patch undone" : "File restored", { duration: 4000 })
  }

  const proposal = s.phase === "patch" ? (s.review === "fix" ? fixFor(s) : patchFor(s)) ?? null : null
  // A step with a new idea asks its question once, before its own patch shows
  const asking = !!proposal && s.review === "patch" && !!step.predict && s.predicted[s.step] === undefined
  const answer = s.predicted[s.step]
  const lead =
    verdict && s.phase === "patch" && s.review === "patch" && step.predict && typeof answer === "number"
      ? answer === step.predict.answer
        ? { text: step.predict.right, right: true }
        : { text: step.predict.wrong, right: false }
      : undefined
  const allNotes = proposal?.notes.map((n) => n.line) ?? []
  // What the last patch added stays tinted while it is checked and until the next action
  const fresh = freshLines(s)
  // An untouched file says what will fill it, so the empty space reads as intended
  const hint =
    s.phase === "idle" && step.patch && s.files[step.file] === step.patch.before && !s.passed[s.step]
      ? "The assistant will write this step here."
      : undefined
  const focus = (s.phase === "idle" && !s.passed[s.step] && !s.undo) || asking ? step.focus : []

  // Notes close whenever a new proposal shows. The very first one in a session opens its
  // first note by itself, which teaches the dots without a line of instructions
  useEffect(() => {
    const first = proposal?.notes[0]?.line
    // After an answer, right or wrong, the code opens on the line the question was about
    if (!asking && s.review === "patch" && step.predict && typeof s.predicted[s.step] === "number") {
      taughtNotes = true
      setNotes([step.predict.line])
    } else if (!asking && first !== undefined && !taughtNotes) {
      taughtNotes = true
      setNotes([first])
    } else {
      setNotes([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.review, s.step, asking])

  const minutes = readingMinutes(step)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The bar and the way out share one row, as a lesson app keeps them: on a small phone a row
          given back to the code is two or three lines of it. The tutorial's name is a tap away, in
          the overview the back button opens */}
      <header className="flex h-phone-head shrink-0 items-center border-b border-border px-1.5">
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Tutorial overview" onClick={() => dispatch({ type: "open", screen: "overview" })}>
          <ChevronLeft className="size-6" />
        </Button>
        <div className="min-w-0 flex-1">
          <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />
        </div>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          <X className="size-5" />
        </Button>
      </header>

      <section className="border-b border-border px-4 pt-2 pb-3">
        {/* Where the step sits, as on desktop, with the lesson at the row's end. The lesson opens in a
            sheet, so the code stays where it is. Its reading time says what it costs. Sized by the
            row's own width, which a larger font narrows: there it keeps the book and the minutes */}
        <div className="@container flex h-9 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
            Step {s.step + 1} of {STEPS.length} · {step.title}
          </p>
          <button
            type="button"
            onClick={() => setLesson(true)}
            aria-label={`Read the lesson, ${minutes} min`}
            // The chip shows at 36px; the strip around it makes the 44 a finger needs
            className="relative flex h-9 shrink-0 items-center gap-2 rounded-control border border-border-strong px-3 text-caption text-foreground before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] active:bg-surface"
          >
            <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
            {/* One span, so the dot gets a plain space on both sides rather than the flex gap before it */}
            <span aria-hidden="true">
              <span className="@max-xs:hidden">Read the lesson · </span>
              <span className="text-muted-foreground @max-xs:text-foreground">{minutes} min</span>
            </span>
          </button>
        </div>
        {/* Two lines at most: the lesson says the rest */}
        <h2 className="mt-1 line-clamp-2 text-title">{step.objective}</h2>
      </section>

      {/* 8px on top so the tabs sit evenly between the line above and the code. Sized by its own
          width too: on a narrow row the tool at its end keeps a short word */}
      <div className="@container flex items-center px-4 pt-2">
        <div role="tablist" aria-label="Views" className="flex shrink-0 gap-1 text-caption">
          {(["code", "output"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("flex h-11 items-center text-muted-foreground", tab === t && "text-foreground")}
            >
              {/* The pill is what shows, the button around it is the 44px target */}
              <span className={cn("flex h-8 items-center gap-1.5 rounded-control px-3 @max-xs:px-2.5", tab === t && "bg-surface-raised")}>
                {/* Output, not Build: it holds the client's run as well as the build and the deploy */}
                {t === "code" ? step.file.split("/").pop() : "Output"}
                {t === "output" && s.log.length > 0 && (
                  // Typing on desktop clears the error but keeps the log, so the dot follows whether the step
                  // passed. A build that waits for its call passed too
                  <span className={cn("size-1.5 rounded-full", s.error || (!s.passed[s.step] && !s.built) ? "bg-error" : "bg-success")} />
                )}
              </span>
            </button>
          ))}
        </div>
        {/* Every note at once, for reading the whole change. Tapping a dotted line opens just that one */}
        {proposal && !asking && tab === "code" && allNotes.length > 0 && (
          <button type="button" aria-pressed={notes.length === allNotes.length} onClick={() => setNotes(notes.length === allNotes.length ? [] : allNotes)} className={TOOL}>
            <span className="size-[7px] shrink-0 rounded-full bg-brand-purple ring-3 ring-brand-purple/25" />
            {notes.length === allNotes.length ? "Hide notes" : "Show notes"}
          </button>
        )}
        {/* The way out for someone who wants to type: while a step waits for its patch */}
        {step.patch && s.phase === "idle" && !s.passed[s.step] && (
          <button type="button" onClick={() => setComputer(true)} className={TOOL}>
            <Monitor strokeWidth={1.75} className="size-4 shrink-0" />
            <span className="@max-xs:hidden">Write it yourself</span>
            <span className="hidden @max-xs:inline">Type it</span>
          </button>
        )}
        {/* Undo sits by the code it reverts, away from the main button and big enough to tap */}
        {restorable && (
          <button type="button" onClick={undo} className={TOOL}>
            <RotateCcw strokeWidth={1.75} className="size-4 shrink-0" />
            <span className="@max-xs:hidden">{undoesPatch ? "Undo the patch" : "Restore my code"}</span>
            <span className="hidden @max-xs:inline">{undoesPatch ? "Undo" : "Restore"}</span>
          </button>
        )}
      </div>

      {/* A proposal shows in place, as a diff of the file. The assistant speaks from the bottom zone */}
      {tab === "output" ? (
        // After a deploy the program id sits under the log in one line, with Copy and Explorer; after
        // a transaction, its receipt. A passed step opened again shows its log, which leaving the step
        // cleared. The log and what follows it scroll as one, so a receipt never squeezes the log
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-surface-well">
          <BuildLog wrapErrors log={shownLog(s)} className="flex-none" />
          {step.deploy && s.passed[s.step] && <ProgramId className="mx-4 mb-3" />}
          {stepTx(s) && <Receipt tx={stepTx(s)!} print={arriving(s.txAt)} className="mx-4 mb-4 shrink-0" />}
        </div>
      ) : proposal && !asking ? (
        <InlineDiff patch={proposal} open={notes} onToggle={(line) => setNotes((n) => (n.includes(line) ? n.filter((x) => x !== line) : [...n, line]))} />
      ) : (
        <CodeView code={s.files[step.file]} focus={focus} error={s.error?.line ?? null} fresh={fresh} hint={hint} />
      )}

      {asking && step.predict ? (
        <PredictZone
          predict={step.predict}
          picked={picked}
          onPick={setPicked}
          onReveal={() => {
            if (picked === null) return
            setVerdict(true)
            dispatch({ type: "predict", choice: picked })
          }}
          onSkip={() => dispatch({ type: "predict", choice: "skip" })}
        />
      ) : (
        <ActionZone lead={lead} />
      )}

      <LessonSheet
        open={lesson}
        onClose={() => setLesson(false)}
        onAsk={() => {
          setLesson(false)
          dispatch({ type: "explain", mode: "step" })
        }}
      />
      <ContinueSheet open={computer} onClose={() => setComputer(false)} />
      <ExplainSheet />
    </div>
  )
}
