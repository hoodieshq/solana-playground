import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Check, Play } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { PROGRAM_ID, shortKey } from "../data"
import { useStore } from "../store"
import { view } from "../view"
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

/* The game takes exactly the banner's height, whatever it plays, so the gallery below never moves.
   Measured off StartHereBanner in its fresh state at 100%: 270px on a wide desktop, 282px where
   its words wrap (1024 and the tablet frame). In rem, so a larger font scales the box with the
   banner, and what no longer fits scrolls inside the play area. A box can't query its own width,
   so the height reads the wrapper's */
const HEIGHT = "h-[17.625rem] @min-[58rem]/start:h-[16.875rem]"

const NEXT_KEY = "pg-proto-game-next"

// The prototype's phone and tablet frames load the app in an iframe without the page's query, so
// `?game=` is read from the frame's parent too
function query(name: string) {
  const own = new URLSearchParams(window.location.search).get(name)
  if (own !== null) return own
  try {
    return window.parent === window ? null : new URLSearchParams(window.parent.location.search).get(name)
  } catch {
    return null
  }
}

/** The mechanic this page load shows: `?game=<id>` for a demo, otherwise the next one in order,
 * counted in storage, so each visitor gets them in turn. Without storage, any one of them */
function pickMechanic(): Mechanic | null {
  if (MECHANICS.length === 0) return null
  const forced = MECHANICS.find((m) => m.id === query("game"))
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

// Whether the tablet frame plays too. Measured in the frame (1152 by 792) at 100%: the play area is
// 216px tall, and the tallest of the eight mechanics takes 215 of it, so all of them fit without
// scrolling. Should a new one not fit there, this goes false and the tablet shows the banner
const ON_TABLET = true

/** The gallery's top. A fresh visitor on a desktop gets the mini game, everyone else the banner. A
 * phone always gets the banner: there's no room for a game in its height. A game played through
 * gives way to the banner the next time the gallery opens */
export function StartHere({ layout }: { layout: "phone" | "desktop" }) {
  const { s } = useStore()
  const plays = layout === "desktop" && (view !== "tablet" || ON_TABLET)
  const [game] = useState(() => {
    // Only where the game shows does the rotation move on
    if (played || !plays) return null
    if (picked === undefined) picked = pickMechanic()
    return picked
  })
  const fresh = s.startedAt === null && s.finishedAt === null
  return fresh && game ? <StartHereGame mechanic={game} /> : <StartHereBanner layout={layout} />
}

type Phase = "play" | "running" | "done"

// How long the hello takes to come back from devnet, start to log line
const TRIP = 1400

// Whole seconds since the first move, at least one
const secondsSince = (t: number | null) => (t === null ? 1 : Math.max(1, Math.round((Date.now() - t) / 1000)))
const now = () => Date.now()

/** The shell every mechanic plays in: the hook, the play area, Run, and the same ending for all of
 * them. Run swaps the play area for the program's log in the same box, so nothing around it moves */
export function StartHereGame({ mechanic }: { mechanic: Mechanic }) {
  const { dispatch } = useStore()
  const titleId = useId()
  const lineId = useId()
  const [who, setWho] = useState<string | null>(null)
  const [note, setNote] = useState<string | undefined>()
  const [phase, setPhase] = useState<Phase>("play")
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState("")
  const firstMove = useRef<number | null>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const section = useRef<HTMLElement>(null)

  // The clock starts with the first touch of the play area, not when the page loads
  const mark = () => {
    firstMove.current ??= now()
  }

  const solved = (greeted: string | null, said?: string) => {
    setWho(greeted)
    setNote(said)
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
    // Run goes away and the game locks, so focus that was in the game moves on to Start rather
    // than staying in a control that can't be used or falling to the page
    const at = document.activeElement
    if (at === document.body || (at && section.current?.contains(at))) startButton.current?.focus({ preventScroll: true })
  }, [phase])

  const done = phase === "done"
  const time = `Built in ${seconds} ${seconds === 1 ? "second" : "seconds"}`
  // Start and Skip both carry the mechanic's id (data-mechanic), so a later build can count which
  // games lead into the tutorial. The prototype only opens the overview
  const open = () => dispatch({ type: "open", screen: "overview" })

  const skip = (
    <button
      type="button"
      data-mechanic={mechanic.id}
      onClick={open}
      className="min-h-11 shrink-0 text-caption whitespace-nowrap text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground focus-visible:text-foreground"
    >
      Skip to the tutorial
    </button>
  )

  const main = done ? (
    <BrandButton ref={startButton} data-mechanic={mechanic.id} variant="accent" className="h-10 px-6" onClick={open}>
      Start
    </BrandButton>
  ) : (
    <BrandButton
      data-run=""
      variant="accent"
      disabled={who === null || phase === "running"}
      className={cn("h-10 px-5", who !== null && phase === "play" && "motion-safe:animate-pop")}
      onClick={run}
    >
      <Play className="size-3.5 fill-current" aria-hidden="true" />
      {phase === "running" ? "Running" : "Run"}
    </BrandButton>
  )

  const Game = mechanic.Play
  // The play area and the log share one box: before Run the game, after it the log
  const play = (
    <div
      className="relative min-h-0 overflow-y-auto overscroll-contain [grid-area:play]"
      onPointerDownCapture={mark}
      onKeyDownCapture={mark}
      onInputCapture={mark}
    >
      {phase === "play" ? <Game onSolved={solved} onRun={run} locked={false} announce={setMessage} /> : <Payoff phase={phase} who={who} note={note} />}
    </div>
  )

  return (
    <div className="@container/start mt-8">
      <section
        ref={section}
        aria-labelledby={titleId}
        aria-describedby={lineId}
        style={GROUND}
        className={cn("@container relative isolate overflow-hidden rounded-card border border-brand-purple/20", HEIGHT)}
      >
        {/* The pixels: behind the play area when there are two columns, a corner by the label when
            a narrow window stacks them, so the words never sit on them */}
        <div className="hidden @min-[44rem]:block">
          <StartHereSurface layout="desktop" />
        </div>
        <div className="absolute top-0 right-0 h-10 w-1/2 font-mono text-[0.75rem] @min-[44rem]:hidden">
          <StartHereSurface layout="phone" />
        </div>

        <div className="relative grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 p-8 [grid-template-areas:'head'_'play'_'actions'] @min-[44rem]:grid-cols-[clamp(14rem,40cqi,21rem)_minmax(0,1fr)] @min-[44rem]:grid-rows-[auto_1fr] @min-[44rem]:gap-x-8 @min-[44rem]:gap-y-0 @min-[44rem]:[grid-template-areas:'head_play'_'actions_play']">
          <div className="min-w-0 [grid-area:head]">
            <p className={cn("flex items-center gap-1.5 text-caption", done ? "text-muted-foreground" : "text-brand-periwinkle")}>
              {done && <DoneMark />}
              {done ? "Preview run" : "Start here"}
            </p>
            <h2 id={titleId} className="mt-1 font-heading text-display">
              {done ? "Now write it for real." : mechanic.hook}
            </h2>
            <p id={lineId} className="mt-2 font-read text-body text-muted-foreground">
              {done ? `${time}. Hello Anchor writes it line by line and deploys it for real.` : mechanic.line}
            </p>
          </div>
          {play}
          <div className="flex flex-wrap items-center gap-x-4 self-end [grid-area:actions]">
            {main}
            {!done && skip}
          </div>
        </div>

        <p role="status" className="sr-only">
          {message}
        </p>
      </section>
    </div>
  )
}

function DoneMark() {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
      <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
    </span>
  )
}

/** The end every mechanic shares, in the play area's own box: a thread down to devnet and the
 * program's log coming back, its three lines one after another, the hello glowing a moment. Only
 * the log, nothing invented: no signature, units or timings. `note` is a mechanic's line above it,
 * like the guess a player made */
function Payoff({ phase, who, note }: { phase: Phase; who: string | null; note?: string }) {
  const thread = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const lines = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLSpanElement>(null)
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

  // The thread runs down the column the log's "Hello" starts in: 13 characters past the padding
  return (
    <div aria-hidden="true" className="font-mono text-[0.75rem]/[1.25rem]">
      <div className="relative h-8">
        <div className="absolute inset-y-0 left-[calc(0.75rem+13.5ch)] w-px">
          <div
            ref={thread}
            className="absolute inset-0 origin-top bg-linear-to-b from-brand-purple to-brand-green mask-[repeating-linear-gradient(to_bottom,#000_0_3px,transparent_3px_6px)]"
          />
          <div ref={dot} className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green opacity-0 shadow-[0_0_8px_var(--brand-green)]" />
        </div>
        {/* Labelled a preview: nothing really goes to devnet from this banner */}
        <div className="absolute inset-y-0 left-[calc(0.75rem+13.5ch-3.5px)] flex items-center gap-1 text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full border border-brand-periwinkle/70 bg-surface-well" />
          <span className="rounded-sm bg-surface-well/85 px-1 whitespace-nowrap">devnet preview</span>
        </div>
      </div>
      <div className="rounded-panel border border-border bg-surface-well/85 px-3 py-2 break-words text-muted-foreground backdrop-blur-[6px]">
        {/* The mechanic's line, there before the log arrives, so the two can be compared */}
        {note && (
          <p className="mb-1 truncate border-b border-border pb-1">
            <span className="text-syntax-comment">//</span> {note}
          </p>
        )}
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
      </div>
    </div>
  )
}
