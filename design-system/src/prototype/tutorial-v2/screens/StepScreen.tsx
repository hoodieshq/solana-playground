import { useEffect, useRef, useState, type TouchEvent } from "react"
import { ArrowRight, ChevronLeft, ChevronUp, Code, MessageSquare, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { LESSON, LIB, STEPS } from "../data"
import { TerminalBody, TerminalStatus } from "../desktop/Terminal"
import { landingFor } from "../landing"
import { FilesSheet } from "../sheets/FilesSheet"
import { StepsSheet } from "../sheets/StepsSheet"
import { TestSheet } from "../sheets/TestSheet"
import { useStore, type State, type Turn } from "../store"
import { ChatComposer } from "../ui/ChatComposer"
import { CodeView } from "../ui/CodeView"
import { Conversation, type Jump } from "../ui/Conversation"
import { NAV_ICONS } from "../ui/navIcons"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepTrack } from "../ui/StepBar"
import { ACTION, ACTION_FILL, ACTION_SOFT, PHONE_CTA } from "../ui/type"

type Space = "chat" | "code"

/** The id of the last turn of a kind, for the Code button's dot: the assistant wrote since you looked */
const lastOf = (s: State, kind: Turn["kind"]) => [...s.thread].reverse().find((t) => t.kind === kind)?.id ?? 0

/** How far a finger has to travel sideways, and how much straighter than down, before it changes space */
const SWIPE_PX = 56

/** Whether a touch began on something that scrolls sideways itself (the chips, a long log line): that
 * drag belongs to it, not to the change of space */
function scrollsSideways(from: EventTarget | null, root: HTMLElement) {
  for (let el = from instanceof HTMLElement ? from : null; el && el !== root; el = el.parentElement) {
    const x = getComputedStyle(el).overflowX
    if ((x === "auto" || x === "scroll") && el.scrollWidth > el.clientWidth + 1) return true
  }
  return false
}

/** The phone's tutorial: the same conversation as the desktop, the same cards in the same order, in two
 * spaces. Chat is where the tutorial happens. Code is the desktop's workspace folded to a phone: the
 * open file read only with the lines just written, the way to Call once there's a program, and the
 * terminal's status at the foot, which opens to the log. Code comes in from the right, by the header's
 * button or a swipe, the way the design lead framed it; a dot on the button says the assistant wrote */
export function StepScreen() {
  const { s, dispatch } = useStore()
  const [space, setSpace] = useState<Space>("chat")
  const [jump, setJump] = useState<Jump>(null)
  const [steps, setSteps] = useState(false)
  const [files, setFiles] = useState(false)
  const [test, setTest] = useState(false)
  const [startOver, setStartOver] = useState(false)
  // The log under the status strip starts folded: Code opens on the code, and the strip already says how the run went
  const [log, setLog] = useState(false)
  const step = STEPS[s.step]
  const finished = s.thread.some((t) => t.kind === "finish")

  // What was new when you last looked at Code. Opening the screen counts as having seen it
  const wroteAt = lastOf(s, "wrote")
  const [seen, setSeen] = useState(wroteAt)
  useEffect(() => {
    if (space === "code") setSeen(wroteAt)
  }, [space, wroteAt])

  // Show in lib.rs, a compiler line or a file from the tree bring Code in with the lines lit. A reveal
  // from before the screen opened stays where it is
  const revealAt = useRef(s.reveal?.at ?? 0)
  useEffect(() => {
    if (!s.reveal || s.reveal.at <= revealAt.current) return
    revealAt.current = s.reveal.at
    if (!s.reveal.top) setSpace("code")
  }, [s.reveal])

  // Call, from Code's head or from an answer that offers it, opens the drawer. Closing it goes back to the file it was on
  const before = useRef(s.open === "test" ? LIB : s.open)
  const was = useRef(s.open)
  useEffect(() => {
    if (s.open === "test" && was.current !== "test") setTest(true)
    if (s.open !== "test") before.current = s.open
    was.current = s.open
  }, [s.open])
  // A Call panel left open on the desktop doesn't pop the drawer on arrival
  useEffect(() => {
    if (s.open === "test") dispatch({ type: "openFile", file: STEPS[s.step].file in s.files ? STEPS[s.step].file : LIB })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const closeTest = () => {
    setTest(false)
    if (s.open === "test") dispatch({ type: "openFile", file: before.current })
  }

  // A sideways swipe changes space: left brings Code in, right takes it back to Chat. Only a clear,
  // mostly level stroke counts, so scrolling the chat never flips it, and a stroke from the screen's
  // left edge is left to the browser's own back gesture
  const area = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touch.current = e.touches.length === 1 && t.clientX > 20 && area.current && !scrollsSideways(e.target, area.current) ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const from = touch.current
    touch.current = null
    const t = e.changedTouches[0]
    if (!from || !t) return
    const dx = t.clientX - from.x
    const dy = t.clientY - from.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 2) return
    if (dx < 0 && space === "chat") setSpace("code")
    if (dx > 0 && space === "code") setSpace("chat")
  }

  const preview = !s.started
  // Under the Call drawer the code stays on the file you were reading: falling back to lib.rs swapped
  // client.ts out from behind the sheet the moment Call was pressed
  const file = s.open === "test" ? before.current : preview && !(s.open in s.files) ? LIB : s.open
  // Before Start lib.rs shows the finished program; another file shows itself, read only
  const code = preview && file === LIB ? LESSON.preview : (s.files[file] ?? "")
  const wrote = s.wrote?.file === file ? s.wrote : null
  const reveal = s.reveal?.file === file && !s.reveal.top ? s.reveal : null
  // Lines shown again stay lit until the next run lands, as written ones do until the next action
  const ranAt = [...s.thread].reverse().find((t) => t.kind === "result")?.at ?? 0
  const relit = reveal && !reveal.caret && reveal.at > (wrote?.at ?? 0) && reveal.at > ranAt
  const lit = relit ? { lines: reveal.lines, at: reveal.at } : wrote ? { lines: wrote.lines, at: wrote.at } : null
  const landing = preview ? null : landingFor(s, file)
  const jumpTo = [reveal ? { line: reveal.lines[0] ?? 1, at: reveal.at } : null, wrote?.lines[0] ? { line: wrote.lines[0], at: wrote.at } : null]
    .filter((j): j is NonNullable<typeof j> => j !== null)
    .sort((a, b) => b.at - a.at)[0]
  const deployed = s.deployedLib !== null
  const onCode = space === "code"
  // Once the tutorial is done nothing new is waiting in Code, so the dot doesn't linger over the finish
  const dot = !onCode && !finished && wroteAt > seen

  const toStep = (i: number) => {
    setSpace("chat")
    setJump((j) => ({ step: i, n: (j?.n ?? 0) + 1 }))
  }

  // Where you are, under the tutorial's name: the step's short name, so the line never cuts
  const where = !s.started ? `${STEPS.length} steps · ${LESSON.minutes} min` : finished ? `Done · ${STEPS.length} of ${STEPS.length}` : `Step ${s.step + 1} of ${STEPS.length} · ${step.short}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 64, not the app's 56: two lines of title and a 36 button need 14 above and below, or the button
          sits on the progress edge */}
      <header className="relative flex h-16 shrink-0 items-center gap-1 pr-4 pl-1">
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Back to tutorials" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          <ChevronLeft className="size-6" />
        </Button>
        {/* The name and where you are, one button: it opens the steps */}
        <button
          type="button"
          onClick={() => setSteps(true)}
          aria-label={`${LESSON.card.name}, ${where}. Show the steps`}
          className="flex h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-lg px-1.5 text-left outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand-purple"
        >
          <span className="max-w-full truncate font-heading text-[0.9375rem] leading-[1.3] font-medium text-foreground">{LESSON.card.name}</span>
          <span className="max-w-full truncate text-caption text-muted-foreground">{where}</span>
        </button>
        {/* The one way across besides the swipe: it names the space it takes you to. Drawn as the desktop's
            workspace tools, 36 tall, so it sits clear of the progress edge and under the title in weight;
            the finger still gets 44 from the layer around it */}
        <Button
          variant="ghost"
          onClick={() => setSpace(onCode ? "chat" : "code")}
          aria-label={onCode ? "Back to the chat" : dot ? "Show the code, new lines written" : "Show the code"}
          className={cn(
            "relative h-9 shrink-0 gap-1.5 rounded-[10px] px-3 text-[0.875rem] font-act pointer-coarse:h-9 after:absolute after:-inset-1 after:content-['']",
            ACTION_SOFT
          )}
        >
          {onCode ? <MessageSquare className="size-4" aria-hidden="true" /> : <Code className="size-4" aria-hidden="true" />}
          {onCode ? "Chat" : "Code"}
          {dot && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 animate-pulse-dot rounded-full bg-brand-purple [animation-iteration-count:2]" />}
        </Button>
        {/* The tutorial's progress, drawn once as the header's bottom edge, in the desktop bar's colours.
            It stands in for the header's rule, so nothing else repeats it */}
        <StepTrack done={finished} />
      </header>

      <div ref={area} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="relative flex min-h-0 flex-1 overflow-clip">
        {/* Both spaces stay mounted side by side, so the chat keeps its place while you read the code.
            The one out of view is inert: no focus, no reader, nothing tabbed into */}
        <div
          style={{ transform: onCode ? "translateX(-50%)" : undefined }}
          className="flex w-[200%] shrink-0 transition-transform duration-300 ease-standard motion-reduce:transition-none"
        >
          <section aria-label="Chat" inert={onCode} className="flex w-1/2 min-w-0 flex-col">
            <Conversation jump={jump} className="px-4" phone />
            {/* Before Start the one thing to do is Start, so it takes the composer's place under the thumb: a
                field beside it was a second way in, and the button mid screen sat out of reach */}
            {s.started ? (
              <ChatComposer phone />
            ) : (
              <div className="shrink-0 px-4 pt-3 pb-[calc(var(--safe-bottom)+12px)]">
                <Button className={cn(ACTION, ACTION_FILL, PHONE_CTA)} onClick={() => dispatch({ type: "start" })}>
                  Start step 1
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </section>

          <section aria-label="Code" inert={!onCode} className="flex w-1/2 min-w-0 flex-col bg-(--code-ground)">
            <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface-base pr-4 pl-2">
              {/* The file's name opens the tree: the way back from client.ts to lib.rs */}
              <button
                type="button"
                onClick={() => setFiles(true)}
                aria-label={`${file}. Show the files`}
                aria-expanded={files}
                className="flex h-11 min-w-0 items-center gap-1.5 rounded-lg px-2 outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand-purple"
              >
                <span className="truncate font-mono text-code text-foreground">{file.split("/").pop()}</span>
                <span aria-hidden="true" className="grid size-[1.375rem] shrink-0 place-items-center rounded-md bg-surface-hover text-muted-foreground">
                  <span className="flex size-3.5 [&>svg]:size-full">{NAV_ICONS.caret}</span>
                </span>
              </button>
              {/* No "Read only" on the phone: nothing here can be typed into anyway, and the grey label beside
                  Call read as a second button. Before Start it still says what you're looking at */}
              {preview && <span className="min-w-0 truncate px-1 text-caption text-muted-foreground">Finished program</span>}
              {/* Call sits where the desktop's tool button does: on the workspace, once there's a program to call */}
              {deployed && (
                <Button
                  variant="ghost"
                  // Ghosted: in a 48 row a filled 36 button had no air round it. The text is the button, and the
                  // finger still gets 44 from the layer around it
                  className="relative -mr-3 ml-auto h-9 shrink-0 gap-1.5 rounded-[10px] px-3 text-[0.875rem] font-act text-foreground/90 pointer-coarse:h-9 after:absolute after:-inset-1 after:content-[''] hover:bg-foreground/[0.06] active:bg-foreground/[0.08]"
                  onClick={() => dispatch({ type: "openTest" })}
                >
                  <Send className="size-4" aria-hidden="true" />
                  Call
                </Button>
              )}
            </div>
            <CodeView
              key={file}
              code={code}
              fresh={preview ? [] : (lit?.lines ?? [])}
              arrive={lit?.at ?? 0}
              landing={landing}
              error={s.error?.file === file ? s.error : null}
              jump={preview ? null : (jumpTo ?? null)}
              hint={!preview && !landing && code.trim() === "" ? "The assistant writes the call here when you pick the answer in Chat." : undefined}
              className="pl-2"
            />
            {/* The terminal, as on the desktop: its status always at the foot, the log under it on a tap */}
            <div className="shrink-0 border-t border-border bg-surface-base pb-[var(--safe-bottom)]">
              <button
                type="button"
                aria-expanded={log}
                aria-controls="phone-terminal"
                onClick={() => setLog(!log)}
                className="flex h-11 w-full items-center gap-2 px-4 text-left text-caption text-muted-foreground outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <TerminalStatus />
                </span>
                <span className="sr-only">{log ? "Hide the log" : "Show the log"}</span>
                <ChevronUp aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none", log && "rotate-180")} />
              </button>
              {log && (
                <div id="phone-terminal" className="max-h-[42dvh] overflow-y-auto overscroll-contain border-t border-border">
                  <TerminalBody phone />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <StepsSheet open={steps} onClose={() => setSteps(false)} onPick={toStep} onStartOver={() => setStartOver(true)} />
      <StartOverDialog
        open={startOver}
        onOpenChange={(o) => {
          setStartOver(o)
          // A new start opens on the chat, where the intro is
          if (!o) setSpace("chat")
        }}
      />
      <FilesSheet open={files} onClose={() => setFiles(false)} />
      <TestSheet open={test} onClose={closeTest} />
    </div>
  )
}
