import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Check, ChevronRight, Lightbulb, PenLine, SkipForward, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { BEATS, type Ask } from "../../data"
import { useStore, type Turn } from "../../store"
import { highlight } from "../CodeView"
import { Prose } from "../Prose"
import { HEADING, READ_CODE } from "../type"

type AskTurn = Extract<Turn, { kind: "ask" }>

const TRY = ["first try", "2nd try", "3rd try"]

/** How the question went, as its record says it. A phone's record is narrower, so a call from the
 * panel says only skipped there: the long form cut the answer itself down to two letters */
export function qualifier(t: AskTurn, phone = false) {
  if (t.done === "right") return TRY[Math.min(t.picks.length, 2)]
  if (t.done === "typed") return "typed by you"
  if (t.done === "test" && !phone) return "skipped, called from the Call panel"
  return "skipped"
}

/** A line of code too long for its row breaks before a `.`, the way a chained call is set, rather
 * than after `await`, which left the keyword alone on the first line */
function chained(nodes: ReactNode[]): ReactNode[] {
  return nodes.flatMap((n, at): ReactNode[] =>
    typeof n === "string" ? n.split(/(?=\.)/).flatMap((part, k): ReactNode[] => (k ? [<wbr key={`${at}.${k}`} />, part] : [part])) : [n]
  )
}

/** An option as its row shows it. `line` keeps it to one line, for the record's ellipsis. `ruled`
 * draws a ruled out option in one grey, code or words alike: its strings' orange would read as the
 * warning, and full white words would outshine the reason under them */
function OptionText({ ask, i, line = false, ruled = false }: { ask: Ask; i: number; line?: boolean; ruled?: boolean }) {
  if (ask.code && line) return <code className="font-mono text-[0.8125rem] leading-[1.5] whitespace-pre text-syntax-plain">{highlight(ask.options[i])}</code>
  return ask.code ? (
    <code
      // An option is one statement to read, not a file: its second line starts on the option's own edge,
      // where the editor's hang read as a misaligned line
      className={cn("block font-mono text-[0.8125rem] leading-[1.5] break-words whitespace-pre-wrap", ruled ? "text-muted-foreground" : "text-syntax-plain")}
    >
      {chained(ruled ? [ask.options[i]] : highlight(ask.options[i]))}
    </code>
  ) : (
    // A plain string: cn would drop the size token next to a text colour. A button's words set a little
    // tighter than prose
    <span className={ruled ? "text-control leading-[1.375rem] text-muted-foreground" : "text-control leading-[1.375rem] text-foreground"}>
      <Prose text={ask.options[i]} {...READ_CODE} />
    </span>
  )
}

/** The question and its three rows in their final states, as the record shows them when opened */
function Settled({ ask, t }: { ask: Ask; t: AskTurn }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <p className="px-0.5 text-caption text-muted-foreground">
        <Prose text={ask.question} {...READ_CODE} />
      </p>
      {ask.options.map((_, i) => {
        const right = i === ask.answer
        const wrong = t.picks.includes(i)
        return (
          <div
            key={i}
            className={cn(
              "flex min-h-10 items-start gap-3 rounded-lg border px-3 py-2",
              right ? "border-success/40 bg-success/5" : wrong ? "border-error/25 bg-error/[0.05]" : "border-border"
            )}
          >
            <span className="mt-px grid size-6 shrink-0 place-items-center rounded-sm bg-muted text-[0.75rem] font-act text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <OptionText ask={ask} i={i} ruled={wrong} />
              {ask.why[i] && (
                <span className="mt-1 block text-caption text-muted-foreground">
                  <Prose text={ask.why[i]!} {...READ_CODE} />
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** A resolved question: one line, the answer it ended on and how, which opens to the three rows */
function AskRecord({ ask, t, phone }: { ask: Ask; t: AskTurn; phone: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "group/rec flex min-h-9 w-full items-center gap-2 rounded-control border border-border bg-(--card-ground) px-3 py-1.5 text-left text-caption hover:border-border-strong",
          phone && "min-h-11"
        )}
      >
        {/* Four records down the thread each say which question they answer */}
        <span className="shrink-0 font-label text-[0.75rem] text-subtle tabular-nums">{ask.n ? `Q${ask.n}` : "Fix"}</span>
        {/* Green only for an answer the learner gave: a skipped question was passed by, not got right */}
        {t.done === "right" || t.done === "typed" ? (
          <Check strokeWidth={2.5} className="size-3.5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <SkipForward strokeWidth={2} className="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">
          <OptionText ask={ask} i={ask.answer} line />
        </span>
        <span className="shrink-0 text-subtle">· {qualifier(t, phone)}</span>
        <ChevronRight
          className={cn(
            "ml-auto size-3.5 shrink-0 text-subtle transition-transform duration-150 group-hover/rec:text-foreground motion-reduce:transition-none",
            open && "rotate-90"
          )}
          aria-hidden="true"
        />
      </button>
      {open && <Settled ask={ask} t={t} />}
    </div>
  )
}

/** The hero of the chat: a question with three options. A right pick lights green, holds half a
 * second and the card folds into its record while the assistant writes the code. A wrong pick turns
 * red, as a failed build does, with one sentence of why, shakes once and stays open; after two, the last option is lit.
 * Keys 1 to 3 pick, the arrows move, S skips, H asks for the hint. `keys` is whether this card owns them right now */
export function AskCard({ turn, keys, busy, arriving, phone = false }: { turn: AskTurn; keys: boolean; busy: boolean; arriving: boolean; phone?: boolean }) {
  const { dispatch } = useStore()
  const ask = BEATS[turn.beat] as Ask
  const titleId = useId()
  const reasonId = useId()
  const [right, setRight] = useState<number | null>(null)
  const [shake, setShake] = useState<{ i: number; n: number } | null>(null)
  const box = useRef<HTMLElement>(null)
  const typeIt = () => dispatch({ type: "typeIt", turn: turn.id })
  const rows = useRef<(HTMLButtonElement | null)[]>([])

  const left = [0, 1, 2].filter((i) => !turn.picks.includes(i))
  const lastOne = turn.picks.length === 2 ? left[0] : null

  // It takes the focus as it arrives, so the keys work at once; the page doesn't scroll for it
  useEffect(() => {
    if (!arriving || !box.current) return
    const typing = document.activeElement?.closest("textarea, input")
    if (!typing) box.current.focus({ preventScroll: true })
  }, [arriving])

  const pick = (i: number) => {
    if (right !== null || turn.picks.includes(i) || busy) return
    if (i === ask.answer) {
      setRight(i)
      window.setTimeout(() => dispatch({ type: "answer", turn: turn.id, choice: i }), 500)
      return
    }
    dispatch({ type: "answer", turn: turn.id, choice: i })
    setShake({ i, n: (shake?.n ?? 0) + 1 })
    // The focus moves on to the next row still to pick
    const next = [0, 1, 2].find((k) => k > i && k !== i && !turn.picks.includes(k)) ?? [0, 1, 2].find((k) => k !== i && !turn.picks.includes(k))
    if (next !== undefined) requestAnimationFrame(() => rows.current[next]?.focus())
  }

  useEffect(() => {
    if (!keys) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      if (target?.closest("textarea, input, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return
      const n = ["1", "2", "3"].indexOf(e.key)
      if (n !== -1) {
        e.preventDefault()
        pick(n)
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        dispatch({ type: "skip", turn: turn.id })
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault()
        dispatch({ type: "hint", turn: turn.id })
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const at = rows.current.findIndex((r) => r === document.activeElement)
        const order = [0, 1, 2]
        const from = at === -1 ? (e.key === "ArrowDown" ? -1 : 3) : at
        const to = e.key === "ArrowDown" ? order.find((k) => k > from) : [...order].reverse().find((k) => k < from)
        if (to !== undefined) {
          e.preventDefault()
          rows.current[to]?.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (turn.done !== null) return <AskRecord ask={ask} t={turn} phone={phone} />

  return (
    <section
      ref={box}
      tabIndex={-1}
      data-live-card
      aria-labelledby={titleId}
      // The one colour in the interface: Solana's gradient rings the card that waits on you, and only
      // while it waits. Answered, it's a grey record like the rest
      // Room as the intro card has it: the same inset, a clear gap under the question, rows apart
      className={cn("rounded-panel gradient-stroke shadow-[0_8px_24px_rgb(0_0_0/0.3)] outline-none [--stroke-fill:var(--card-ground)]", phone ? "p-4 pb-2.5" : "p-5 pb-3")}
    >
      {/* A step over the 16px headings and the 15px text before it: the question is what you answer,
          so it reads as the card's own title, not one more line of the explanation */}
      <h3 id={titleId} className={cn(HEADING, "mb-4 text-[1.125rem] leading-[1.35]")}>
        <Prose text={ask.question} {...READ_CODE} />
      </h3>
      <div role="group" aria-labelledby={titleId} className={cn("flex flex-col gap-2", busy && "pointer-events-none opacity-50")}>
        {ask.options.map((_, i) => {
          const wrong = turn.picks.includes(i)
          const isRight = right === i
          return (
            <button
              key={i}
              ref={(el) => {
                rows.current[i] = el
              }}
              type="button"
              onClick={() => pick(i)}
              aria-disabled={wrong || undefined}
              aria-describedby={wrong ? `${reasonId}-${i}` : undefined}
              className={cn(
                // A radio list: the ring says pick one, with no arrow to read as "go" or to sit over long code
                // The mark 16px from the side, as the words are from the other; under a finger 2px taller
                "group/opt flex min-h-11 w-full items-start gap-3 rounded-lg border py-3 pr-4 pl-3.5 text-left pointer-coarse:py-3.5 transition-colors duration-100 outline-none active:translate-y-px motion-reduce:transition-none",
                isRight
                  ? "border-success/50 bg-success/10"
                  : wrong
                    ? // Ruled out, it mirrors the right pick a step quieter: one red field, a faint edge and tint,
                      // so the reason reads and the rest stay brighter. Wrong is wrong in one colour, a failed
                      // build or a wrong pick
                      "cursor-default border-error/25 bg-error/[0.05]"
                    : "border-border bg-foreground/[0.02] hover:border-foreground/25 hover:bg-foreground/[0.05] focus-visible:border-foreground/25 focus-visible:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple",
                lastOne === i && !isRight && "border-foreground/30 bg-foreground/[0.04]",
                shake?.i === i && "pg-shake"
              )}
              // A new key per wrong pick plays the shake again
              data-shake={shake?.i === i ? shake.n : undefined}
            >
              <span
                className={cn(
                  // One line of the option tall, code's or words', so the mark sits on the first line's middle
                  // whether it wraps or not. As wide as the right pick's square, the ring 1px inside it
                  "grid w-[1.125rem] shrink-0 place-items-center rounded-sm text-[0.75rem] font-act lining-nums tabular-nums",
                  ask.code ? "h-[1.21875rem]" : "h-[1.375rem]",
                  isRight ? "text-success-foreground" : wrong ? "text-error" : "text-muted-foreground group-hover/opt:text-foreground group-focus-visible/opt:text-foreground"
                )}
              >
                {/* A radio's ring says "pick one" where a figure read as a line number. Keys 1 to 3 still pick, with no number shown for them */}
                {/* The right pick fills a square of its own, the ring's width, not the slot's wider box. A wrong
                    one gets the same square, tinted rather than filled, so the two answers share one shape */}
                {isRight ? (
                  <span className="grid size-[1.125rem] animate-pop place-items-center rounded-[5px] bg-success">
                    <Check strokeWidth={2.75} className="size-3" />
                  </span>
                ) : wrong ? (
                  <span className="grid size-[1.125rem] place-items-center rounded-[5px] bg-error/15">
                    <X strokeWidth={2.75} className="size-3" />
                  </span>
                ) : (
                  <span className="size-4 rounded-full border-[1.5px] border-muted-foreground/70 transition-colors group-hover/opt:border-foreground group-focus-visible/opt:border-foreground" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {/* The words' line height on the block as well, or its own taller strut sets the lines apart.
                    Words that wrap break into even lines, so no word is left alone on the second */}
                <span className={cn("block leading-[1.375rem]", !ask.code && "text-balance")}>
                  <OptionText ask={ask} i={i} ruled={wrong} />
                </span>
                {wrong && ask.why[i] && (
                  <span
                    id={`${reasonId}-${i}`}
                    // The row describes itself with it, so it stays out of the row's name: the name is the option
                    aria-hidden="true"
                    // The reason keeps the option's own left edge and opens on a verdict, so it reads as the
                    // tutor's word on the option, not more of it. A plain string: cn would drop text-caption
                    className={`${phone ? "mt-2.5" : "mt-2"} block animate-in text-caption text-foreground/80 duration-150 fade-in slide-in-from-top-1 motion-reduce:animate-none`}
                  >
                    <span className="font-medium text-foreground">Not quite.</span> <Prose text={ask.why[i]!} {...READ_CODE} />
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {turn.picks.length > 0 ? `Not quite. ${ask.why[turn.picks[turn.picks.length - 1]] ?? ""}` : ""}
      </p>
      {/* Ghost buttons pulled out by their own padding, so the labels stand on the options' edge. Type
          it myself only where a pick writes code; Hint and Skip are the quieter pair, and Hint goes once
          it has been given, since the answer stays in the chat above */}
      <div className="-mx-2.5 mt-3 flex items-center gap-1">
        {/* A phone has no editor to type in, so it offers no way to: the pick, Hint and Skip are the honest set there */}
        {ask.writes && !phone && (
          <Button variant="ghost" size="sm" className="text-muted-foreground pointer-coarse:h-11" onClick={typeIt}>
            <PenLine />
            Type it myself
          </Button>
        )}
        {!turn.hinted && (
          <Button
            variant="ghost"
            size="sm"
            // On the phone there's no Type it myself, so Hint takes the options' left edge and Skip the far end
            className={cn("text-subtle hover:text-muted-foreground pointer-coarse:h-11", !phone && "ml-auto")}
            onClick={() => dispatch({ type: "hint", turn: turn.id })}
          >
            <Lightbulb />
            Hint
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn("text-subtle hover:text-muted-foreground pointer-coarse:h-11", (turn.hinted || phone) && "ml-auto")}
          onClick={() => dispatch({ type: "skip", turn: turn.id })}
        >
          Skip
        </Button>
      </div>
    </section>
  )
}
