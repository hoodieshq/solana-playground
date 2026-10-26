import { CircleCheck, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../../data"
import { useStore, type Turn } from "../../store"
import { Prose } from "../Prose"
import { ACTION, ACTION_FILL, ACTION_SOFT, PHONE_CTA, READ, READ_CODE, took } from "../type"

type WinTurn = Extract<Turn, { kind: "win" }>

/** The pass, drawn: the ring closes from the top, clockwise, then the tick follows, so the mark reads
 * as the step finishing rather than a badge swapped in. Lucide's CircleCheck, stroke for stroke.
 * With reduced motion it's simply there (prototype.css) */
export function PassMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" pathLength={1} transform="rotate(-90 12 12)" className="pg-pass-ring" />
      <path d="m9 12 2 2 4-4" pathLength={1} className="pg-pass-tick" />
    </svg>
  )
}

/** Where a win's link and the scroll to a question meet: the feed looks for the live card */
export const scrollToLive = () => {
  const el = document.querySelector<HTMLElement>("[data-feed] [data-open-ask]") ?? document.querySelector<HTMLElement>("[data-feed] [data-live-card]")
  el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  requestAnimationFrame(() => el?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }))
}

/** A step's win, the dopamine moment: the drawn check, the step done, a headline at display size and
 * three numbers from the run. One Next. It stands in the chat as the assistant's own text does, with no
 * frame: a card inside the chat's column was one edge too many. Once Next is pressed it's a line in the record.
 * On a phone Next takes the full width under the thumb, and Open Call stays off: Code's head and the act
 * card (which calls in place) are the ways to Call there, and a third one here split the moment in two */
export function WinCard({ turn, phone = false }: { turn: WinTurn; phone?: boolean }) {
  const { s, dispatch } = useStore()
  const step = STEPS[turn.step]
  const win = step.win
  const next = STEPS[turn.step + 1]

  if (turn.done)
    return (
      <div className="flex h-9 items-center gap-2 rounded-control border border-border bg-(--card-ground) px-3 text-caption">
        <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
        <span className="min-w-0 truncate text-muted-foreground">
          <span className="text-foreground">Step {turn.step + 1} done</span> · {win.headline.replace(/\.$/, "")}
        </span>
        <span className="ml-auto shrink-0 text-subtle tabular-nums">{took(turn.took)}</span>
      </div>
    )

  const viaTest = turn.via === "test"
  const openAsk = s.thread.some((t) => t.kind === "ask" && t.step === turn.step && t.done === null)
  const openCall = win.extra === "openTest" && !phone
  return (
    <section data-live-card aria-label={`Step ${turn.step + 1} done`} className="animate-pop py-6">
      <PassMark className="size-8 text-success" />
      <h3 className="mt-3 font-heading text-display text-foreground">{win.headline}</h3>
      <p className={`mt-2 ${READ}`}>
        <Prose text={viaTest && step.testWin ? step.testWin : win.line} {...READ_CODE} />
      </p>
      {(next || openCall || (viaTest && openAsk)) && (
        <div className={cn("mt-5 flex gap-2", phone ? "mt-6 flex-col items-stretch" : "flex-wrap items-center")}>
          {next && (
            <Button className={cn(ACTION, ACTION_FILL, phone && PHONE_CTA)} onClick={() => dispatch({ type: "next" })}>
              Next: {next.title}
            </Button>
          )}
          {viaTest && openAsk ? (
            <Button variant="ghost" className={cn(ACTION, ACTION_SOFT, phone && PHONE_CTA)} onClick={scrollToLive}>
              Write it in client.ts
            </Button>
          ) : (
            openCall && (
              <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => dispatch({ type: "openTest" })}>
                <Send />
                Open Call
              </Button>
            )
          )}
        </div>
      )}
    </section>
  )
}
