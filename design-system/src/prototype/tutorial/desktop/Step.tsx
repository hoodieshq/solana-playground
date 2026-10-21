import { useEffect, useRef, useState } from "react"
import { BookOpen, ChevronUp, CircleCheck, CircleDashed, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { STEPS } from "../data"
import { fixFor, freshLines, patchFor, useStore } from "../store"
import { InlineDiff } from "../ui/InlineDiff"
import { LessonBlocks, readingMinutes } from "../ui/LessonBlocks"
import { StepProgress } from "../ui/StepProgress"
import { ActionBar } from "./ActionBar"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { AskBox, Feed, type Msg, type Quote } from "./Feed"
import { QuickCheck } from "./QuickCheck"
import { TerminalBody, TerminalStatus } from "./Terminal"
import { Workspace } from "./Workspace"

// Shown once a session: the first proposal opens its first note on its own
let taughtNotes = false

export function Step() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  // The lesson reads in the column, open while the step waits and folded once it has passed
  const [lessonOpen, setLessonOpen] = useState(!s.passed[s.step])
  const [notes, setNotes] = useState<number[]>([])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [explained, setExplained] = useState(false)
  const [term, setTerm] = useState(false)
  // A line the terminal points to: the editor scrolls there and puts the caret on it
  const [jump, setJump] = useState<{ line: number; n: number } | null>(null)
  const ids = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  const say = (text: string, quote?: Quote) => setMsgs((m) => [...m, { id: ++ids.current, from: "assistant", text, quote }])
  const ask = (question: string, answer: string) =>
    setMsgs((m) => [...m, { id: ++ids.current, from: "you", text: question }, { id: ++ids.current, from: "assistant", text: answer }])

  // A new step starts with a clean column
  useEffect(() => {
    setLessonOpen(!s.passed[s.step])
    setMsgs([])
    setExplained(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // A run opens the terminal by itself, and a pass gets one line from the assistant about what's next
  const prev = useRef(s.phase)
  useEffect(() => {
    const was = prev.current
    prev.current = s.phase
    if (s.phase === "building" || s.phase === "deploying") {
      setTerm(true)
      setExplained(false)
    }
    if (s.phase === "passed" && (was === "building" || was === "deploying")) {
      // The lesson has done its job: fold it, so the answer and what's next are in view
      setLessonOpen(false)
      say(s.step === STEPS.length - 1 ? "That's every step. Finish the tutorial to see what you built." : `Next: ${STEPS[s.step + 1].objective}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.step])

  // New messages come in at the bottom of the column, and it follows a reply while it types
  const feed = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    const box = feed.current
    if (!el || !box) return
    let height = box.offsetHeight
    const ro = new ResizeObserver(() => {
      if (box.offsetHeight > height) el.scrollTop = el.scrollHeight
      height = box.offsetHeight
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  const busy = s.phase === "building" || s.phase === "deploying"
  // The deploy step has no code to write
  const locked = busy || s.phase === "patch" || !!step.deploy
  const proposal = s.phase === "patch" ? (s.review === "fix" ? fixFor(s) : patchFor(s)) ?? null : null
  // A step with a new idea asks its question once, before its own patch shows
  const asking = !!proposal && s.review === "patch" && !!step.predict && s.predicted[s.step] === undefined
  // Whether the answer was right, and why, stays with the quick check in the column, so the action
  // bar keeps the assistant's line about the patch (on the phone the bar carries both in turn)
  const answer = s.predicted[s.step]
  // The quick check comes in under the lesson, so bring it into view when it does
  const check = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (asking) check.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [asking])

  const allNotes = proposal?.notes.map((n) => n.line) ?? []
  // The step's focus lines are about its starting code. Once you type, they would point at the wrong lines
  const untouched = s.phase === "idle" && !!step.patch && s.files[step.file] === step.patch.before && !s.passed[s.step]
  const focus = untouched || asking ? step.focus : []
  const hint = untouched ? "Write this step here, or let the assistant draft it." : undefined

  // Notes close whenever a new proposal shows. The first one in a session opens its first note by
  // itself, which teaches the dots. After a quick check the note the question was about opens
  useEffect(() => {
    const first = proposal?.notes[0]?.line
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

  const explain = () => {
    if (!s.error) return
    setExplained(true)
    say(s.error.explain ?? step.explainError ?? step.explainStep, {
      file: step.file,
      line: s.error.line,
      code: s.files[step.file].split("\n")[s.error.line - 1]?.trim() ?? "",
    })
  }

  // ⌘B builds or deploys, 1 to 3 answer the quick check and S skips it, ⌘Enter applies a patch,
  // Enter goes on after a pass, Esc closes the notes. Plain keys stay off while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const typing = !!target?.closest("textarea, input")
      if (asking && step.predict && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const choice = ["1", "2", "3"].indexOf(e.key)
        if (choice !== -1 && choice < step.predict.options.length) return dispatch({ type: "predict", choice })
        if (e.key.toLowerCase() === "s") return dispatch({ type: "predict", choice: "skip" })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && s.phase === "patch" && !asking) {
        e.preventDefault()
        dispatch({ type: "apply" })
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        if (s.phase === "idle") dispatch(step.deploy ? { type: "deploy" } : { type: "buildOwn" })
      } else if (e.key === "Enter" && s.phase === "passed" && !target?.closest("textarea, input, button, a")) {
        dispatch({ type: "next" })
      } else if (e.key === "Escape") {
        setNotes([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [s.phase, step, asking, dispatch])

  const undo = () => {
    dispatch({ type: "undo" })
    toast("Patch undone", { duration: 4000 })
  }

  const asked = new Set(msgs.filter((m) => m.from === "you").map((m) => m.text))
  const suggestions = [{ label: "Explain this step", answer: step.explainStep }, ...step.chips].filter((c) => !asked.has(c.label))
  // Until the quick check is answered there is no patch on screen to ask about
  const placeholder = proposal && !asking ? "Ask about this patch" : s.error ? "Ask about this error" : "Ask about this step"

  const tools = (
    <>
      {proposal && !asking && allNotes.length > 0 && (
        <button
          type="button"
          aria-pressed={notes.length === allNotes.length}
          onClick={() => setNotes(notes.length === allNotes.length ? [] : allNotes)}
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground"
        >
          <span className="size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25" />
          {notes.length === allNotes.length ? "Hide notes" : "Show notes"}
        </button>
      )}
      {/* Undo sits by the code it reverts, away from Next */}
      {s.undo && (s.phase === "passed" || s.phase === "failed") && (
        <button type="button" onClick={undo} className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground">
          <RotateCcw strokeWidth={1.75} className="size-4" />
          Undo patch
        </button>
      )}
    </>
  )

  return (
    <>
      <Column label="Lesson">
        <div className="flex h-12 shrink-0 items-center border-b border-border pr-2">
          <div className="min-w-0 flex-1">
            <StepProgress tips current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Back to the tutorial page" onClick={() => dispatch({ type: "open", screen: "overview" })}>
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to the tutorial page</TooltipContent>
          </Tooltip>
        </div>

        {/* The column reads top down, as a lesson page beside the editor: the goal, the lesson, the
            task, the quick check when a patch comes, then what the assistant said */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-6">
          <p className="text-caption text-muted-foreground">{step.title}</p>
          <h1 className="mt-1 font-heading text-[1.25rem] leading-snug">{step.objective}</h1>

          {lessonOpen ? (
            <section aria-label="Lesson" className="mt-5">
              <LessonBlocks copy blocks={step.lesson} />
              {s.passed[s.step] && (
                <Button variant="ghost" className="mt-3 -ml-2 h-9 gap-1.5 px-2 text-caption text-muted-foreground" onClick={() => setLessonOpen(false)}>
                  <ChevronUp className="size-4" />
                  Hide the lesson
                </Button>
              )}
            </section>
          ) : (
            <button
              type="button"
              onClick={() => setLessonOpen(true)}
              className="mt-3 flex h-9 items-center gap-2 rounded-control border border-border-strong px-3 text-caption text-foreground transition-colors hover:bg-surface"
            >
              <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
              Show the lesson
              <span className="text-muted-foreground">· {readingMinutes(step)} min</span>
            </button>
          )}

          {/* What the step checks, ticked once it passes. How to do it sits by the buttons */}
          <section aria-labelledby="task-title" className="mt-6 rounded-panel border border-border bg-surface-panel px-4 py-3">
            <h2 id="task-title" className="text-caption text-muted-foreground">
              Your task
            </h2>
            <p className="mt-1.5 flex items-start gap-2 text-control">
              {s.passed[s.step] ? (
                <CircleCheck strokeWidth={1.75} aria-label="Done" className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CircleDashed strokeWidth={1.75} aria-label="Not done yet" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span>Done when {step.checkedBy}</span>
            </p>
          </section>

          {/* Asked before the patch shows, then kept as a record for the rest of the step */}
          {step.predict && (asking || typeof answer === "number") && (
            <div ref={check} className="scroll-mt-4">
              <QuickCheck
                predict={step.predict}
                answer={typeof answer === "number" ? answer : undefined}
                onAnswer={(choice) => dispatch({ type: "predict", choice })}
              />
            </div>
          )}
          <div ref={feed}>
            <Feed msgs={msgs} resolved={s.passed[s.step]} />
          </div>
        </div>

        <AskBox placeholder={placeholder} suggestions={suggestions} onAsk={ask} />
      </Column>

      <Workspace
        file={step.file}
        tools={tools}
        actions={<ActionBar asking={asking} explained={explained} onExplain={explain} />}
        terminal={{ open: term, onOpenChange: setTerm, status: <TerminalStatus />, body: <TerminalBody onJump={(line) => setJump((j) => ({ line, n: (j?.n ?? 0) + 1 }))} /> }}
      >
        {proposal && !asking ? (
          <InlineDiff patch={proposal} open={notes} onToggle={(line) => setNotes((n) => (n.includes(line) ? n.filter((x) => x !== line) : [...n, line]))} />
        ) : (
          <Editor
            code={s.files[step.file]}
            onChange={(code) => dispatch({ type: "edit", code })}
            readOnly={locked}
            error={s.error?.line ?? null}
            fresh={freshLines(s)}
            focus={focus}
            hint={hint}
            label={`${step.file}, ${locked ? "read only" : "editable"}`}
            jump={jump}
          />
        )}
      </Workspace>
    </>
  )
}
