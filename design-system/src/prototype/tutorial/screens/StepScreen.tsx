import { useEffect, useState } from "react"
import { BookOpen, ChevronLeft, Monitor, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS, type Step } from "../data"
import { diffLines } from "../diff"
import { ContinueSheet } from "../sheets/ContinueSheet"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { LessonSheet } from "../sheets/LessonSheet"
import { useStore } from "../store"
import { ActionZone } from "../ui/ActionZone"
import { BuildLog } from "../ui/BuildLog"
import { CodeView } from "../ui/CodeView"
import { InlineDiff } from "../ui/InlineDiff"
import { PredictZone } from "../ui/PredictZone"
import { StepProgress } from "../ui/StepProgress"
import { TopBar } from "../ui/TopBar"

/** About 200 words a minute, rounded up, never under a minute */
function readingMinutes(step: Step) {
  const words = step.lesson.reduce((n, b) => n + (b.kind === "code" ? b.code : b.text).split(/\s+/).length, 0)
  return Math.max(1, Math.ceil(words / 200))
}

// Shown once a session: the first proposal opens its first note on its own
let taughtNotes = false

export function StepScreen() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [tab, setTab] = useState<"code" | "build">("code")
  const [lesson, setLesson] = useState(false)
  const [computer, setComputer] = useState(false)
  // Which line notes are open, and the prediction made on each step that asks one
  const [notes, setNotes] = useState<number[]>([])
  const [predicted, setPredicted] = useState<Record<number, number | "skip">>({})


  useEffect(() => {
    setTab("code")
    setLesson(false)
    setComputer(false)
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
  }, [s.phase, s.deployStage, dispatch])

  // Deploying and running the client change no code: what they produce is the program id and
  // the transaction, in the Build log. So when they pass, the step opens on that log
  const showsOutput = !!step.deploy || step.id === "call-client"
  useEffect(() => {
    if (s.phase === "passed" && showsOutput) setTab("build")
  }, [s.phase, s.step, showsOutput])

  const undo = () => {
    dispatch({ type: "undo" })
    toast("Patch undone", { duration: 4000 })
  }

  const proposal = s.phase === "patch" ? (s.review === "fix" ? step.fix : step.patch) ?? null : null
  // A step with a new idea asks its question once, before its own patch shows
  const asking = !!proposal && s.review === "patch" && !!step.predict && predicted[s.step] === undefined
  const answer = predicted[s.step]
  const lead =
    s.phase === "patch" && s.review === "patch" && step.predict && typeof answer === "number"
      ? answer === step.predict.answer
        ? { text: step.predict.right, right: true }
        : { text: step.predict.wrong, right: false }
      : undefined
  const allNotes = proposal?.notes.map((n) => n.line) ?? []
  // What the last patch added stays tinted while it is checked and until the next action
  const appliedPatch = s.applied === "fix" ? step.fix : s.applied === "patch" ? step.patch : undefined
  const fresh =
    appliedPatch && (s.phase === "building" || s.phase === "passed" || s.phase === "failed")
      ? diffLines(appliedPatch.before, appliedPatch.after).reduce<{ n: number; lines: number[] }>(
          (acc, row) => {
            if (row.kind === "removed") return acc
            acc.n++
            if (row.kind === "added") acc.lines.push(acc.n)
            return acc
          },
          { n: 0, lines: [] }
        ).lines
      : []
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
    if (!asking && s.review === "patch" && step.predict && typeof predicted[s.step] === "number") {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Tutorial overview" onClick={() => dispatch({ type: "open", screen: "overview" })}>
            <ChevronLeft className="size-6" />
          </Button>
        }
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X className="size-5" />
          </Button>
        }
      />

      <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />

      {/* 9px here, the chip's own 4px and the 1px line make 14 above it, the same as below */}
      <section className="border-b border-border px-4 pb-[9px]">
        <h2 className="line-clamp-3 text-title">{step.objective}</h2>
        {/* The lesson opens in a sheet, so the code stays where it is. A chip, not a footnote: it's the
            tutorial's teaching, and the reading time says what it costs */}
        <button type="button" onClick={() => setLesson(true)} className="mt-1 flex min-h-11 items-center">
          <span className="flex h-9 items-center gap-2 rounded-control border border-border-strong px-3 text-caption text-foreground">
            <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
            Read the lesson
            <span className="text-muted-foreground">· {readingMinutes(step)} min</span>
          </span>
        </button>
      </section>

      {/* 8px on top so the tabs sit evenly between the line above and the code */}
      <div className="flex items-center px-4 pt-2">
        <div role="tablist" aria-label="Views" className="flex gap-1 text-caption">
        {(["code", "build"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("flex h-11 items-center text-muted-foreground", tab === t && "text-foreground")}
          >
            {/* The pill is what shows, the button around it is the 44px target */}
            <span className={cn("flex h-8 items-center gap-1.5 rounded-control px-3", tab === t && "bg-surface-raised")}>
              {t === "code" ? step.file.split("/").pop() : "Build"}
              {t === "build" && s.log.length > 0 && (
                <span className={cn("size-1.5 rounded-full", s.error ? "bg-error" : "bg-success")} />
              )}
            </span>
          </button>
        ))}
        </div>
        {/* Every note at once, for reading the whole change. Tapping a dotted line opens just that one */}
        {proposal && !asking && tab === "code" && allNotes.length > 0 && (
          <button
            type="button"
            aria-pressed={notes.length === allNotes.length}
            onClick={() => setNotes(notes.length === allNotes.length ? [] : allNotes)}
            className="ml-auto flex h-11 items-center gap-1.5 px-1 text-caption text-muted-foreground active:text-foreground"
          >
            <span className="size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25" />
            {notes.length === allNotes.length ? "Hide notes" : "Show notes"}
          </button>
        )}
        {/* The way out for someone who wants to type: while a step waits for its patch */}
        {step.patch && s.phase === "idle" && !s.passed[s.step] && (
          <button
            type="button"
            onClick={() => setComputer(true)}
            className="ml-auto flex h-11 items-center gap-1.5 px-1 text-caption text-muted-foreground active:text-foreground"
          >
            <Monitor strokeWidth={1.75} className="size-4" />
            Write it yourself
          </button>
        )}
        {/* Undo sits by the code it reverts, away from the main button and big enough to tap */}
        {s.undo && (s.phase === "passed" || s.phase === "failed") && (
          <button
            type="button"
            onClick={undo}
            className="ml-auto flex h-11 items-center gap-1.5 px-1 text-caption text-muted-foreground active:text-foreground"
          >
            <RotateCcw strokeWidth={1.75} className="size-4" />
            Undo patch
          </button>
        )}
      </div>

      {/* A proposal shows in place, as a diff of the file. The assistant speaks from the bottom zone */}
      {tab === "build" ? (
        <BuildLog log={s.log} />
      ) : proposal && !asking ? (
        <InlineDiff patch={proposal} open={notes} onToggle={(line) => setNotes((n) => (n.includes(line) ? n.filter((x) => x !== line) : [...n, line]))} />
      ) : (
        <CodeView code={s.files[step.file]} focus={focus} error={s.error?.line ?? null} fresh={fresh} hint={hint} />
      )}

      {asking && step.predict ? (
        <PredictZone predict={step.predict} onAnswer={(choice) => setPredicted((p) => ({ ...p, [s.step]: choice }))} />
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
