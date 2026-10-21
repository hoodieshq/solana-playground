import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Check, Play } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { PROGRAM_ID, STEPS, shortKey } from "../data"
import { useStore } from "../store"
import { MECHANICS } from "./startHereGame/index"
import { EASE_OUT, reducedMotion } from "./startHereGame/motion"
import type { Mechanic } from "./startHereGame/types"
import { StartHereBanner } from "./StartHereBanner"
import { StartHereSurface } from "./startHereSurface"

/* The ground is the banner's, so the game and the banner read as one family */
const GROUND = {
  background:
    "radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--brand-purple) 14%, transparent), transparent 62%), color-mix(in oklab, var(--brand-purple) 6%, var(--surface-panel))",
}

const NEXT_KEY = "pg-proto-game-next"

/** The mechanic this page load shows: `?game=<id>` for a demo, otherwise the next one in order,
 * counted in storage. Without storage, any one of them */
function pickMechanic(): Mechanic | null {
  if (MECHANICS.length === 0) return null
  const wanted = new URLSearchParams(window.location.search).get("game")
  const forced = MECHANICS.find((m) => m.id === wanted)
  if (forced) return forced
  try {
    const n = Number(window.localStorage.getItem(NEXT_KEY)) || 0
    const i = ((n % MECHANICS.length) + MECHANICS.length) % MECHANICS.length
    window.localStorage.setItem(NEXT_KEY, String(i + 1))
    return MECHANICS[i]
  } catch {
    return MECHANICS[Math.floor(Math.random() * MECHANICS.length)]
  }
}

// Picked once per page load, the first time the gallery asks, so going back and forth in the
// prototype doesn't move the rotation on
let picked: Mechanic | null | undefined
// Played to the end in this page load: from then on the gallery shows the banner instead
let played = false

/** The gallery's top. A fresh visitor gets the mini game, everyone else the banner. A game played
 * through gives way to the banner the next time the gallery opens */
export function StartHere({ layout }: { layout: "phone" | "desktop" }) {
  const { s } = useStore()
  const [game] = useState(() => {
    if (played) return null
    if (picked === undefined) picked = pickMechanic()
    return picked
  })
  const fresh = s.startedAt === null && s.finishedAt === null
  return fresh && game ? <StartHereGame layout={layout} mechanic={game} /> : <StartHereBanner layout={layout} />
}

type Phase = "play" | "running" | "done"

// How long the hello takes to come back from devnet, start to log line
const TRIP = 1400

// Whole seconds since the first move, at least one
const secondsSince = (t: number | null) => (t === null ? 1 : Math.max(1, Math.round((Date.now() - t) / 1000)))
const now = () => Date.now()

/** The shell every mechanic plays in: the hook, the play area, Run, and the same ending for all of
 * them. The program goes to devnet, its log line comes back, and the banner points to the tutorial */
export function StartHereGame({ layout, mechanic }: { layout: "phone" | "desktop"; mechanic: Mechanic }) {
  const { dispatch } = useStore()
  const titleId = useId()
  const phone = layout === "phone"
  const [who, setWho] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("play")
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState("")
  const firstMove = useRef<number | null>(null)
  const startButton = useRef<HTMLButtonElement>(null)

  // The clock starts with the first touch of the play area, not when the page loads
  const mark = () => {
    firstMove.current ??= now()
  }

  const run = () => {
    if (who === null || phase !== "play") return
    setSeconds(secondsSince(firstMove.current))
    setMessage("Sending it to devnet")
    if (reducedMotion()) finish(who)
    else setPhase("running")
  }

  // Declared as a function so Run (with reduced motion) and the trip's timer can both end the game
  function finish(greeted: string | null) {
    played = true
    setPhase("done")
    setMessage(`Program log: Hello, ${greeted}! Now write it for real.`)
  }

  useEffect(() => {
    if (phase !== "running") return
    const t = window.setTimeout(() => finish(who), TRIP + 200)
    return () => window.clearTimeout(t)
  }, [phase, who])

  useEffect(() => {
    if (phase !== "done") return
    // Run goes away with the ending, so the focus moves on to Start rather than falling to the page
    if (document.activeElement === document.body || document.activeElement?.closest("[data-run]")) startButton.current?.focus({ preventScroll: true })
  }, [phase])

  const done = phase === "done"
  // Start and Skip both carry the mechanic's id (data-mechanic), so a later build can count which
  // games lead into the tutorial. The prototype only opens the overview
  const open = () => dispatch({ type: "open", screen: "overview" })

  const head = (
    <div className="min-w-0 [grid-area:head]">
      <p className={cn("flex items-center gap-1.5 text-caption", done ? "text-muted-foreground" : "text-brand-periwinkle")}>
        {done && (
          <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
            <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
          </span>
        )}
        {done ? "Preview run" : "Start here"}
      </p>
      <h2 id={titleId} className={cn("font-heading", phone ? "mt-1 text-display" : "mt-1.5 text-[2rem] leading-[1.1] tracking-[-0.02em]")}>
        {done ? "Now write it for real." : mechanic.hook}
      </h2>
      <p className={cn("font-read text-muted-foreground", phone ? "mt-1.5 text-[0.9375rem]/[1.45]" : "mt-2 max-w-[40ch] text-body")}>
        {done ? `Built in ${seconds} seconds. Hello Anchor goes through it line by line and deploys it to devnet for real.` : mechanic.line}
      </p>
      {done && <p className="mt-3 text-caption text-muted-foreground tabular-nums">10 min · {STEPS.length} steps · Beginner · Anchor</p>}
    </div>
  )

  const actions = (
    <div className={cn("flex gap-x-4 gap-y-1 [grid-area:actions]", phone ? "flex-col" : "flex-wrap items-center")}>
      {done ? (
        <BrandButton ref={startButton} data-mechanic={mechanic.id} variant="accent" className={phone ? "h-12 w-full" : "h-10 px-6"} onClick={open}>
          Start
        </BrandButton>
      ) : (
        <>
          <BrandButton
            data-run=""
            variant="accent"
            disabled={who === null || phase === "running"}
            className={cn(phone ? "h-12 w-full" : "h-10 px-5", who !== null && phase === "play" && "motion-safe:animate-pop")}
            onClick={run}
          >
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            {phase === "running" ? "Running" : "Run"}
          </BrandButton>
          {/* Never a dead end: the tutorial is one tap away whatever the game is doing */}
          <button
            type="button"
            data-mechanic={mechanic.id}
            onClick={open}
            className={cn(
              "min-h-11 text-caption text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground focus-visible:text-foreground",
              phone ? "self-center" : "self-start"
            )}
          >
            Skip to the tutorial
          </button>
        </>
      )}
    </div>
  )

  const Game = mechanic.Play
  return (
    <section
      aria-labelledby={titleId}
      style={GROUND}
      className={cn("@container relative isolate overflow-hidden rounded-card border border-brand-purple/20", phone ? "mt-5" : "mt-8")}
    >
      {/* The pixels: behind the play area when there are two columns, a corner by the label when
          there's one, so the words never sit on them */}
      {!phone && (
        <div className="hidden @min-[44rem]:block">
          <StartHereSurface layout="desktop" />
        </div>
      )}
      <div className={cn("absolute top-0 right-0 h-10 w-1/2 font-mono text-[0.75rem]", !phone && "@min-[44rem]:hidden")}>
        <StartHereSurface layout="phone" />
      </div>

      <div
        className={cn(
          "relative grid gap-6 [grid-template-areas:'head'_'play'_'actions']",
          phone ? "p-5" : "p-8 @min-[44rem]:grid-cols-[minmax(16rem,21rem)_minmax(0,1fr)] @min-[44rem]:gap-x-10 @min-[44rem]:[grid-template-areas:'head_play'_'actions_play']"
        )}
      >
        {head}
        <div className="min-w-0 self-start [grid-area:play]" onPointerDownCapture={mark} onKeyDownCapture={mark} onInputCapture={mark}>
          <Game onSolved={setWho} onRun={run} locked={phase !== "play"} announce={setMessage} />
          <Payoff phase={phase} who={who} />
        </div>
        {actions}
      </div>

      <p role="status" className="sr-only">
        {message}
      </p>
    </section>
  )
}

/** The end every mechanic shares: a thread from the program to devnet and back, and the program's
 * log. Before Run the log waits with a comment; after, its three lines arrive one after another
 * and the hello glows a moment. Only the log, nothing invented: no signature, units or timings */
function Payoff({ phase, who }: { phase: Phase; who: string | null }) {
  const thread = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const lines = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLSpanElement>(null)
  const sent = phase !== "play"
  const program = `Program ${shortKey(PROGRAM_ID, 4)}`

  useLayoutEffect(() => {
    if (phase !== "running" || !thread.current || !dot.current || !lines.current || !word.current) return
    const rows = [...lines.current.children].map((row, i) =>
      row.animate([{ opacity: 0, transform: "translateY(0.375rem)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: 700 + i * 140, easing: EASE_OUT, fill: "backwards" })
    )
    const runs = [
      thread.current.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 620, easing: EASE_OUT, fill: "backwards" }),
      dot.current.animate(
        [
          { top: "0%", opacity: 0 },
          { top: "10%", opacity: 1, offset: 0.1 },
          { top: "100%", opacity: 1, offset: 0.85 },
          { top: "100%", opacity: 0 },
        ],
        { duration: 760, easing: EASE_OUT }
      ),
      word.current.animate([{ backgroundColor: "rgb(20 241 149 / 0.24)" }, { backgroundColor: "rgb(20 241 149 / 0)" }], { duration: 1400, delay: 980, easing: "ease-out", fill: "backwards" }),
      ...rows,
    ]
    return () => runs.forEach((r) => r.cancel())
  }, [phase])

  // The thread runs down the column the log's "Hello" starts in: 13 characters past the strip's padding
  return (
    <div aria-hidden="true" className="font-mono text-[0.75rem]/[1.25rem]">
      <div className="relative h-8">
        <div className="absolute inset-y-0 left-[calc(1rem+13.5ch)] w-px">
          <div
            ref={thread}
            className={cn(
              "absolute inset-0 origin-top mask-[repeating-linear-gradient(to_bottom,#000_0_3px,transparent_3px_6px)]",
              sent ? "bg-linear-to-b from-brand-purple to-brand-green" : "bg-border-strong"
            )}
          />
          <div ref={dot} className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green opacity-0 shadow-[0_0_8px_var(--brand-green)]" />
        </div>
        {/* Labelled a preview: nothing really goes to devnet from this banner */}
        <div className="absolute inset-y-0 left-[calc(1rem+13.5ch-3.5px)] flex items-center gap-1 text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full border border-brand-periwinkle/70 bg-surface-well" />
          <span className="rounded-sm bg-surface-well/85 px-1">devnet preview</span>
        </div>
      </div>
      <div className="rounded-control border border-border bg-surface-well/80 px-4 py-2 break-words text-muted-foreground backdrop-blur-[6px]">
        {sent ? (
          <div ref={lines}>
            <div>{program} invoke [1]</div>
            <div>
              Program log:{" "}
              <span ref={word} className="rounded-[2px] text-success">
                Hello, {who}!
              </span>
            </div>
            <div>{program} success</div>
          </div>
        ) : (
          <div>
            <span className="text-syntax-comment">//</span> The program log shows up here
          </div>
        )}
      </div>
    </div>
  )
}
