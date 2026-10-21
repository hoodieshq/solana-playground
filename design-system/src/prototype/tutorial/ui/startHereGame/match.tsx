import { useRef, useState, type KeyboardEvent } from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { highlight } from "../CodeView"
import { EASE_OUT, reducedMotion } from "./motion"
import type { PlayProps } from "./types"

/* Match the macros: four names from every Anchor program to what each one does. Tap a name, then
   its meaning, or the other way round. The idea is the vocabulary of the first program */

// `means` is the label, short enough for one line in a narrow column; `says` is the same in a
// sentence, for the reply after a miss
const PAIRS = [
  { id: "program", code: "#[program]", means: "holds your instructions", says: "it holds your instructions" },
  { id: "msg", code: "msg!", means: "writes to the program log", says: "it writes to the program log" },
  { id: "id", code: "declare_id!", means: "sets the program's address", says: "it sets the program's address" },
  { id: "ctx", code: "Context", means: "an instruction's accounts", says: "it carries an instruction's accounts" },
]

// The meanings in another order than the names, set by hand so no row starts out matched
const MEANINGS = ["id", "ctx", "program", "msg"]

type Side = "code" | "means"

export function MatchGame({ onSolved, locked, announce }: PlayProps) {
  const [matched, setMatched] = useState<string[]>([])
  const [held, setHeld] = useState<{ side: Side; id: string } | null>(null)
  const [reply, setReply] = useState<string | null>(null)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  const name = (id: string) => PAIRS.find((p) => p.id === id)!

  const tap = (side: Side, id: string) => {
    if (locked || matched.includes(id)) return
    if (!held || held.side === side) {
      // A first pick, or a change of mind on the same side
      setHeld(held?.id === id && held.side === side ? null : { side, id })
      return
    }
    const code = side === "code" ? id : held.id
    const means = side === "means" ? id : held.id
    setHeld(null)
    if (code === means) {
      const next = [...matched, code]
      setMatched(next)
      setReply(null)
      if (next.length === PAIRS.length) {
        onSolved("World")
        announce(`${name(code).code}: ${name(code).means}. All four matched, Run is ready.`)
      } else announce(`${name(code).code}: ${name(code).means}. Matched.`)
      return
    }
    // The meaning that was tried belongs to another name: say whose it is
    const el = buttons.current[`${side}:${id}`]
    if (el && !reducedMotion()) el.animate([{ transform: "none" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 220, easing: EASE_OUT })
    const text = `That one is ${name(means).code}: ${name(means).says}.`
    setReply(text)
    announce(`Not a match. ${text}`)
  }

  const keys = (e: KeyboardEvent) => {
    if (e.key === "Escape" && held) {
      setHeld(null)
      announce("Cleared")
    }
  }

  const cell = (side: Side, id: string) => {
    const p = name(id)
    const done = matched.includes(id)
    const picked = held?.side === side && held.id === id
    return (
      <button
        key={`${side}:${id}`}
        ref={(el) => {
          buttons.current[`${side}:${id}`] = el
        }}
        type="button"
        disabled={locked}
        aria-pressed={picked}
        aria-label={`${side === "code" ? p.code : p.means}${done ? ", matched" : ""}`}
        onClick={() => tap(side, id)}
        onKeyDown={keys}
        className={cn(
          "flex h-8 min-w-0 items-center gap-2 rounded-control border px-2.5 text-left backdrop-blur-[6px] transition-colors duration-150 ease-standard motion-reduce:transition-none",
          side === "code" ? "font-mono text-[0.75rem]" : "text-caption",
          done
            ? "border-brand-green/40 bg-[color-mix(in_oklab,var(--brand-green)_10%,var(--surface-well))]"
            : picked
              ? "border-brand-periwinkle/70 bg-[color-mix(in_oklab,var(--brand-periwinkle)_14%,var(--surface-well))]"
              : "border-border bg-surface-raised/90 hover:bg-surface-hover"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", side === "code" ? "text-syntax-plain" : "text-foreground")}>{side === "code" ? highlight(p.code) : p.means}</span>
        {done && <Check strokeWidth={2.25} className="size-3.5 shrink-0 text-success" aria-hidden="true" />}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* A matched pair stays on its own rows; the check on both says they belong together */}
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-x-2 gap-y-1.5">
        <div role="group" aria-label="Names" className="contents">
          {PAIRS.map((p, i) => (
            <div key={p.id} style={{ gridColumn: 1, gridRow: i + 1 }} className="grid">
              {cell("code", p.id)}
            </div>
          ))}
        </div>
        <div role="group" aria-label="Meanings" className="contents">
          {MEANINGS.map((id, i) => (
            <div key={id} style={{ gridColumn: 2, gridRow: i + 1 }} className="grid">
              {cell("means", id)}
            </div>
          ))}
        </div>
      </div>
      {/* Two lines kept for the reason, so it never moves the rows */}
      <p className="min-h-10 px-1 font-mono text-[0.75rem]/[1.25rem] text-muted-foreground">
        {reply && (
          <>
            <span className="text-syntax-comment">//</span> {reply}
          </>
        )}
      </p>
    </div>
  )
}
