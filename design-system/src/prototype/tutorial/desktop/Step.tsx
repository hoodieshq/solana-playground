import { useEffect, useId, useReducer, useRef, useState } from "react"
import { BookOpen, ChevronUp, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { fixFor, freshLines, patchFor, useStore } from "../store"
import { stepTx } from "../tx"
import { InlineDiff } from "../ui/InlineDiff"
import { LessonBlocks, readingMinutes } from "../ui/LessonBlocks"
import { StepProgress } from "../ui/StepProgress"
import { ActionBar } from "./ActionBar"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { AskBox, Feed, type Msg, type Quote } from "./Feed"
import { primaryFor } from "./keys"
import { isCoarse, useCoarse } from "./pointer"
import { QuickCheck } from "./QuickCheck"
import { TerminalBody, TerminalStatus } from "./Terminal"
import { Workspace } from "./Workspace"

const RESTORE_TIP = "Puts the file back as it was before the first change applied on this step"

// Shown once a session: the first proposal opens its first note on its own
let taughtNotes = false

// What the column said on each step, kept while the page is open, so going back to a step finds
// its conversation where it was. `spoke` holds the proposal summaries already said there, so Don't
// apply and opening the same patch again doesn't repeat one. Keyed by the run too: Start over
// begins every step with a clean column
type Thread = { msgs: Msg[]; spoke: Set<string> }
const threads = new Map<string, Thread>()
let ids = 0
function threadFor(key: string) {
  let t = threads.get(key)
  if (!t) threads.set(key, (t = { msgs: [], spoke: new Set() }))
  return t
}

export function Step() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const coarse = useCoarse()
  // The lesson reads in the column, open while the step waits and folded once it has passed
  const [lessonOpen, setLessonOpen] = useState(!s.passed[s.step])
  const [notes, setNotes] = useState<number[]>([])
  const [term, setTerm] = useState(false)
  // A line the editor scrolls to. From the terminal it puts the caret there too; at a step's start
  // it does only where a keyboard is out anyway, since on a tablet the caret brings one up
  const [jump, setJump] = useState<{ line: number; n: number; caret?: boolean } | null>(null)
  const thread = threadFor(`${s.startedAt}:${s.step}`)
  const msgs = thread.msgs
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const scroller = useRef<HTMLDivElement>(null)
  // Whether the column has more below what shows, for the fade at its foot
  const [more, setMore] = useState(false)

  const add = (...more: Msg[]) => {
    thread.msgs = [...thread.msgs, ...more]
    rerender()
  }
  const say = (text: string, quote?: Quote) => add({ id: ++ids, from: "assistant", text, quote })
  const ask = (question: string, answer: string) => add({ id: ++ids, from: "you", text: question }, { id: ++ids, from: "assistant", text: answer })

  /** The assistant's take on the failure, with the line it's about */
  const explanation = () => {
    if (!s.error) return
    say(s.error.explain ?? step.explainError ?? step.explainStep, {
      file: step.file,
      line: s.error.line,
      code: s.files[step.file].split("\n")[s.error.line - 1]?.trim() ?? "",
    })
  }

  // A new step opens on its own conversation, and with its code's lines lit. A line the last step's
  // terminal pointed to is dropped, or the next editor to mount would jump to it. An error explained
  // in the other view, the phone's sheet, comes back as the column's message, so Review the fix
  // still has what it follows
  useEffect(() => {
    setLessonOpen(!s.passed[s.step])
    const writes = s.phase === "idle" && !!step.patch && !s.passed[s.step]
    setJump(writes ? { line: step.focus[0] ?? 1, n: 0, caret: !isCoarse() } : null)
    if (s.phase === "failed" && s.explained && !thread.msgs.some((m) => m.from === "assistant" && m.quote)) explanation()
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
    // A call to devnet comes back quicker than a build
    if (s.phase === "calling") {
      const t = window.setTimeout(() => dispatch({ type: "called" }), 1600)
      return () => window.clearTimeout(t)
    }
  }, [s.phase, s.deployStage, dispatch])

  // A run opens the terminal by itself, and a pass folds the lesson
  const prev = useRef(s.phase)
  useEffect(() => {
    const was = prev.current
    prev.current = s.phase
    if (s.phase === "building" || s.phase === "deploying" || s.phase === "calling") setTerm(true)
    if (s.phase === "passed" && (was === "building" || was === "deploying" || was === "calling")) {
      // The lesson has done its job: fold it. The assistant says nothing here: the green button
      // already names the next step
      setLessonOpen(false)
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

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1)
    check()
    el.addEventListener("scroll", check, { passive: true })
    // The column and the feed change size as replies type and the lesson folds
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (feed.current) ro.observe(feed.current)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [lessonOpen, s.step, s.phase])

  const busy = s.phase === "building" || s.phase === "deploying" || s.phase === "calling"
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
    if (!asking) return
    // The lesson's code answers the question, so it folds while the question is asked: think first
    setLessonOpen(false)
    check.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [asking])

  const allNotes = proposal?.notes.map((n) => n.line) ?? []
  // The step's focus lines are about its starting code. Once you type, they would point at the wrong lines
  const untouched = s.phase === "idle" && !!step.patch && s.files[step.file] === step.patch.before && !s.passed[s.step]
  const focus = untouched || asking ? step.focus : []

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
    if (!s.error || s.explained) return
    dispatch({ type: "explained" })
    explanation()
  }

  // ⌘Enter presses the action bar's main button in every state, from the editor too: building
  // without leaving the code is what the key is for. 1 to 3 answer the quick check and S skips it,
  // plain Enter goes on after a pass, Esc closes the notes. Plain keys stay off while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const typing = !!target?.closest("textarea, input")
      if (asking && step.predict && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const choice = ["1", "2", "3"].indexOf(e.key)
        if (choice !== -1 && choice < step.predict.options.length) return dispatch({ type: "predict", choice })
        if (e.key.toLowerCase() === "s") return dispatch({ type: "predict", choice: "skip" })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        // The question box sends on its own Enter, so the key stays its own there
        if (e.repeat || target?.closest('[data-slot="composer"]')) return
        const action = primaryFor(s, asking)
        if (!action) return
        e.preventDefault()
        if (action === "explain") explain()
        else dispatch(action)
      } else if (e.key === "Enter" && s.phase === "passed" && !target?.closest("textarea, input, button, a, [role='separator']")) {
        dispatch({ type: "next" })
      } else if (e.key === "Escape") {
        setNotes([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, step, asking, dispatch])

  // The assistant speaks in the column only: what a proposal changes comes in as its message, and
  // the action bar under the code just says what to do with it
  const summary = proposal && !asking ? proposal.summary : null
  useEffect(() => {
    if (summary && !thread.spoke.has(summary)) {
      thread.spoke.add(summary)
      say(summary)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  // The error read as one thing in two places: the compiler's line in the terminal and the line in
  // the editor light each other while either is hovered
  const [linked, setLinked] = useState<{ from: "log" | "editor"; line: number } | null>(null)
  const link = (from: "log" | "editor") => (line: number | null) => setLinked(line === null ? null : { from, line })

  const restoreTip = useId()
  const undo = () => {
    dispatch({ type: "undo" })
    toast("File restored", { duration: 4000 })
  }

  const asked = new Set(msgs.filter((m) => m.from === "you").map((m) => m.text))
  // While a failed build waits for Explain, "Explain this step" would sit beside the Explain button
  // meaning something else, so it steps aside until the error is explained
  const failing = s.phase === "failed" && !s.explained
  // Questions about the error only once there has been one, the planned one too, then ahead of the
  // rest: asked before the build, "Why does hello need a struct?" would be about code nobody has seen
  // fail. Then the lesson's, then the general one. The box shows what fits in a row
  const suggestions = [
    ...(s.failedOnce[s.step] ? (step.errorChips ?? []) : []),
    ...step.chips,
    ...(failing ? [] : [{ label: "Explain this step", answer: step.explainStep }]),
  ].filter((c) => !asked.has(c.label))
  // Until the quick check is answered there is no patch on screen to ask about
  const placeholder = proposal && !asking ? "Ask about this patch" : s.error ? "Ask about this error" : "Ask about this step"

  const tools = (
    <>
      {proposal && !asking && allNotes.length > 0 && (
        <button
          type="button"
          aria-pressed={notes.length === allNotes.length}
          onClick={() => setNotes(notes.length === allNotes.length ? [] : allNotes)}
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground pointer-coarse:h-11"
        >
          <span className="size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25" />
          {notes.length === allNotes.length ? "Hide notes" : "Show notes"}
        </button>
      )}
      {step.deploy && <span className="px-2 text-caption text-muted-foreground">Read only on this step</span>}
      {/* Sits by the code it puts back, away from the action bar. Only once a build has failed: on a
          pass there's nothing to get out of, and putting the file back would undo the pass */}
      {s.undo?.step === s.step && s.phase === "failed" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={undo}
              aria-describedby={restoreTip}
              className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground pointer-coarse:h-11"
            >
              <RotateCcw strokeWidth={1.75} className="size-4" />
              {/* What it takes out: the assistant's change, or what you wrote over it */}
              {s.applied === "patch" || s.applied === "fix" ? "Undo the patch" : "Restore my code"}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{RESTORE_TIP}</TooltipContent>
        </Tooltip>
      )}
      {/* The tip is only there on hover, so the button carries what it says too */}
      <span id={restoreTip} hidden>
        {RESTORE_TIP}
      </span>
    </>
  )

  return (
    <>
      <Workspace
        file={step.file}
        tools={tools}
        actions={<ActionBar asking={asking} onExplain={explain} />}
        terminal={{
          open: term,
          onOpenChange: setTerm,
          status: <TerminalStatus />,
          // A tap on the compiler's line asks for that line, so the caret goes there, on a tablet too
          body: (
            <TerminalBody
              onJump={(line) => setJump((j) => ({ line, n: (j?.n ?? 0) + 1, caret: true }))}
              onPoint={link("log")}
              lit={s.error && linked?.from === "editor" ? linked.line : null}
            />
          ),
          tall: !!stepTx(s),
        }}
      >
        {proposal && !asking ? (
          <InlineDiff patch={proposal} open={notes} onToggle={(line) => setNotes((n) => (n.includes(line) ? n.filter((x) => x !== line) : [...n, line]))} />
        ) : (
          <Editor
            code={s.files[step.file]}
            onChange={(code) => dispatch({ type: "edit", code })}
            readOnly={locked}
            // A deploy changes no code: the file is there to look at, so it steps back
            dim={!!step.deploy}
            error={s.error ? { line: s.error.line, column: s.error.column, span: s.error.span } : null}
            lit={!!s.error && linked?.from === "log" && linked.line === s.error.line}
            onPoint={link("editor")}
            fresh={freshLines(s)}
            focus={focus}
            label={`${step.file}, ${locked ? "read only" : "editable"}`}
            // How to start, where the code will go. It goes with the first character
            placeholder={step.patch && !locked ? "Type the code from the lesson here, or press Write with assistant" : undefined}
            jump={jump}
            onJumped={() => setJump(null)}
          />
        )}
      </Workspace>

      {/* After the code, as in the product: nav, editor, then the assistant's column on the right */}
      <Column label="Lesson">
        <div className="flex h-12 shrink-0 items-center border-b border-border pr-2">
          <div className="min-w-0 flex-1">
            {/* A finger gets no hover tips, so there the steps show their numbers */}
            <StepProgress tips numbered={coarse} current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 pointer-coarse:size-11" aria-label="Back to the tutorial page" onClick={() => dispatch({ type: "open", screen: "overview" })}>
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to the tutorial page</TooltipContent>
          </Tooltip>
        </div>

        {/* The column reads top down, as a lesson page beside the editor: the goal, the lesson, the
            quick check when a patch comes, then what the assistant said. How the step stands shows
            once, in the action bar under the code */}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} data-feed-scroller className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
          {/* Where the step sits in the tutorial. The bar above counts the steps passed */}
          <p className="text-caption text-muted-foreground">
            Step {s.step + 1} of {STEPS.length} · {step.title}
          </p>
          <h1 className="mt-1 font-heading text-[1.25rem] leading-snug">{step.objective}</h1>

          {lessonOpen ? (
            // Set off from the step's goal by more than its own sections are from each other, and
            // named, so its first heading doesn't read as the goal's subtitle
            <section aria-label="Lesson" className="mt-8">
              <p className="mb-3 text-caption text-muted-foreground">Lesson · {readingMinutes(step)} min</p>
              <div>
                {/* Each block the editor's code already holds gets checked off, as you type it */}
                <LessonBlocks column blocks={step.lesson} file={s.files[step.file]} />
              </div>
              {s.passed[s.step] && (
                <Button variant="ghost" className="mt-3 -ml-2 h-9 gap-1.5 px-2 text-muted-foreground pointer-coarse:h-11" onClick={() => setLessonOpen(false)}>
                  <ChevronUp className="size-4" />
                  Hide the lesson
                </Button>
              )}
            </section>
          ) : (
            <button
              type="button"
              onClick={() => setLessonOpen(true)}
              className="mt-3 flex h-9 items-center gap-2 rounded-control border border-border-strong px-3 text-caption text-foreground transition-colors hover:bg-surface pointer-coarse:h-11"
            >
              <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
              {/* One span, so the dot gets a plain space on both sides rather than the flex gap before it */}
              <span>
                Read the lesson <span className="text-muted-foreground">· {readingMinutes(step)} min</span>
              </span>
            </button>
          )}

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
        {/* Text running on under the field fades out, but only while there's more below */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface-base to-transparent transition-opacity duration-200 ease-standard motion-reduce:transition-none",
            more ? "opacity-100" : "opacity-0"
          )}
        />
        </div>

        <AskBox placeholder={placeholder} suggestions={suggestions} onAsk={ask} />
      </Column>
    </>
  )
}
