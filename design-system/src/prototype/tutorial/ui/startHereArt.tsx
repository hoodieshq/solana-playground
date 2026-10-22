import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Check } from "lucide-react"

import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { lastTx } from "../tx"

/* The banner's picture, on the right of the words over the pattern. Three takes on it, to compare
   in review: ?art=steps (the default) lists what you'll do, ?art=receipt shows what you'll get, and
   ?art=brand is only Playground's mark. Each is one piece, so nothing has to be read as a sequence.
   Every size is in rem, so a larger font scales the picture with the words */

type Art = "steps" | "receipt" | "brand"

const asked = new URLSearchParams(location.search).get("art")
const ART: Art = asked === "receipt" || asked === "brand" ? asked : "steps"

// The cards blur the pixels behind them, so their words read on a calm ground, as the editor's do
const CARD = "border border-border bg-surface-well/75 backdrop-blur-[6px]"

// The ease-out from the motion tokens, as a string for the Web Animations API
const EASE_OUT = "cubic-bezier(0.22, 0.61, 0.24, 1)"

// Each take plays once per page load: coming back to the gallery shouldn't replay it
let swept = false
let printed = false

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/* The steps' names in a few words each, so all four fit the card on one line. The objectives say
   the same at length, and stand in for a step this list doesn't know yet */
const SHORT: Record<string, string> = {
  "write-program": "Write the program",
  deploy: "Build & deploy to devnet",
  "call-client": "Call it from a client",
  "greet-by-name": "Give hello a name",
}

/** A light passing down the list once, row by row, so the eye follows it through all four steps.
 * Nothing waits on it, and with reduced motion the list is simply there */
function useSweep() {
  const rows = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (swept || reduced()) return
    const runs = rows.current.flatMap((row, i) =>
      row ? [row.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 700, delay: 450 + i * 140, easing: EASE_OUT })] : []
    )
    // Marked as played only once the last row has run. React's dev mode mounts twice, and the
    // first, cancelled run mustn't use up the only one
    runs.at(-1)?.finished.then(() => (swept = true)).catch(() => {})
    return () => runs.forEach((r) => r.cancel())
  }, [])

  return rows
}

/** The tutorial as a small Playground window: four steps, ticked as they pass. The one to do next
 * is lit, so fresh it's the first, and finished every row carries a tick */
function StepsArt() {
  const { s } = useStore()
  const rows = useSweep()
  const finished = s.finishedAt !== null
  const next = finished ? -1 : s.passed.findIndex((p) => !p)

  return (
    <div className={cn(CARD, "rounded-panel")}>
      <div className="flex h-8 items-center gap-2 border-b border-border px-4 text-[0.75rem] text-muted-foreground">
        <LogoMark className="size-3.5" />
        Hello Anchor
      </div>
      <ol className="flex flex-col gap-0.5 p-2">
        {STEPS.map((step, i) => {
          const passed = finished || s.passed[i]
          const current = i === next
          return (
            <li
              key={step.id}
              className={cn("relative flex h-9 items-center gap-3 rounded-control px-2 text-[0.8125rem] leading-5", current ? "bg-brand-purple/12 text-foreground" : passed ? "text-foreground/80" : "text-muted-foreground")}
            >
              {/* The sweep's light, a layer of its own so it never fights the lit row's ground */}
              <span ref={(el) => void (rows.current[i] = el)} className="absolute inset-0 rounded-control bg-brand-purple/16 opacity-0" />
              <span
                className={cn(
                  "relative flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] tabular-nums",
                  passed ? "bg-success/15 text-success" : current ? "border border-brand-periwinkle text-brand-periwinkle" : "border border-border-strong"
                )}
              >
                {passed ? <Check strokeWidth={2.5} className="size-3" /> : i + 1}
              </span>
              <span className="relative min-w-0 truncate font-label">{SHORT[step.id] ?? step.objective}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** One transaction as the tutorial leaves it: what ran, that Kora paid, that it landed, and the
 * line the program wrote. Finished, it's the learner's own last call, their name in it */
function ReceiptArt() {
  const { s } = useStore()
  const said = s.finishedAt !== null ? lastTx(s).said : "Hello, World!"
  // Read once, as it mounts, so it doesn't stop halfway when the banner renders again
  const [printing] = useState(() => !printed && !reduced())
  useEffect(() => void (printed = true), [])

  let i = 0
  // A row's place in the print order, 60ms apart, as the finish's receipt prints (see prototype.css)
  const at = () => ({ "data-print": "", style: { "--i": i++ } as CSSProperties })
  const row = "flex justify-between gap-4 py-0.5"

  return (
    // The torn foot is its bottom edge, the same as the finish's printed receipt
    <div className={cn(CARD, "pg-receipt rounded-t-panel border-b-0 px-4 pt-3 font-mono text-[0.75rem] leading-5")}>
      <div className={cn("flex flex-col", printing && "pg-print")}>
        <p {...at()} className="flex justify-between gap-4 pb-2 font-sans text-[0.8125rem]">
          <span className="text-foreground">Transaction</span>
          <span className="text-muted-foreground">devnet</span>
        </p>
        <dl className="contents">
          <div {...at()} className={row}>
            <dt className="text-muted-foreground">Program</dt>
            <dd className="text-foreground">hello_anchor</dd>
          </div>
          {/* The network's fee is still charged, so the row says whose it is: yours is nothing */}
          <div {...at()} className={row}>
            <dt className="text-muted-foreground">Your fee</dt>
            <dd className="text-foreground">
              0 SOL <span className="text-muted-foreground">· paid by Kora</span>
            </dd>
          </div>
          <div {...at()} className={row}>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="flex items-center gap-1.5 text-success">
              <span className="size-1.5 rounded-full bg-success" />
              Confirmed
            </dd>
          </div>
        </dl>
        {/* The line the program wrote, the reason to read a receipt at all. A long name wraps */}
        <p {...at()} className="mt-2 border-t border-dashed border-border-strong pt-2 break-words text-muted-foreground">
          Program log: <span className="text-success">{said}</span>
        </p>
      </div>
    </div>
  )
}

/** Playground's mark and nothing else: the play shape cut from Solana's three bars, in its ring,
 * filled with Solana's purple going to green. A disc of the well behind it keeps the mark off the
 * pixels, and a soft light of purple round the disc ties it to the pattern */
function BrandArt() {
  const id = `start-here-mark`
  return (
    <div className="flex h-48 items-center justify-center">
      {/* The gradient lives in a sizeless SVG of its own: LogoMark draws its path, and fills it from here */}
      <svg className="absolute size-0">
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-purple)" />
          <stop offset="0.55" stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-green)" />
        </linearGradient>
      </svg>
      <div className={cn(CARD, "flex size-40 items-center justify-center rounded-full border-brand-purple/25 shadow-[0_0_3rem_-0.5rem_var(--brand-purple)]")}>
        <LogoMark className="size-24" style={{ fill: `url(#${id})` }} />
      </div>
    </div>
  )
}

/** The picture the URL asks for. It only decorates: the words beside it say everything it does */
export function StartHereArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none">
      {ART === "receipt" ? <ReceiptArt /> : ART === "brand" ? <BrandArt /> : <StepsArt />}
    </div>
  )
}
