import { useState } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { highlight } from "../CodeView"
import type { PlayProps } from "./types"
import { PLAY_WORDS } from "./words"

/* Which one builds: two bodies for hello, one character apart. The idea is how a Rust function
   returns: the last expression without a semicolon is the value, so `Ok(())` returns the Result
   and `Ok(());` returns nothing. The error is rustc's own */

const OPTIONS = [
  { id: "a", lines: ['msg!("Hello, World!");', "Ok(());"], builds: false, why: "error[E0308]: mismatched types. The ; makes Ok(()) a statement, so hello returns ()." },
  { id: "b", lines: ['msg!("Hello, World!");', "Ok(())"], builds: true, why: "Builds. Without the ;, Ok(()) is the Result hello returns." },
]

export function WhichGame({ onSolved, locked, announce }: PlayProps) {
  const [tried, setTried] = useState<string[]>([])
  const [last, setLast] = useState<(typeof OPTIONS)[number] | null>(null)
  const solved = last?.builds === true

  const pick = (o: (typeof OPTIONS)[number]) => {
    if (locked || solved) return
    setLast(o)
    setTried((t) => (t.includes(o.id) ? t : [...t, o.id]))
    if (o.builds) {
      onSolved("World")
      announce(`${o.why} Run is ready.`)
    } else announce(`Doesn't build. ${o.why} Try the other one.`)
  }

  return (
    <div className="@container/which flex flex-col gap-2 font-mono text-[0.75rem]/[1.25rem]">
      <p className="self-start rounded-sm bg-surface-well/85 backdrop-blur-[6px] px-2 text-muted-foreground">
        {/* The comment's slashes in the editor's grey, its words a step lighter so they pass AA */}
        <span className="text-syntax-comment">//</span> hello returns <span className="text-syntax-type">Result</span>
        {"<()>"}
      </p>
      <ul aria-label="Two versions of hello's body" className="grid gap-2 @min-[26rem]/which:grid-cols-2">
        {OPTIONS.map((o, i) => {
          const wrong = tried.includes(o.id) && !o.builds
          const chosen = solved && o.builds
          return (
            <li key={o.id} className="grid">
              <button
                type="button"
                disabled={locked || (solved && !o.builds)}
                aria-pressed={chosen}
                aria-label={`Version ${i + 1}: ${o.lines.join(" ")}${wrong ? ", doesn't build" : chosen ? ", builds" : ""}`}
                onClick={() => pick(o)}
                className={cn(
                  "relative rounded-panel border px-3 py-2 text-left backdrop-blur-[6px] transition-colors duration-150 ease-standard motion-reduce:transition-none",
                  chosen ? "border-success/50 bg-[color-mix(in_oklab,var(--success)_10%,var(--surface-well))]" : "border-border bg-surface-well/90 hover:bg-surface-raised",
                  wrong && "border-dashed"
                )}
              >
                {/* Once the other one builds, this one's code steps back; its verdict stays at full
                    strength, so the words say it at AA, not the fade alone */}
                <span className={cn("block", solved && !o.builds && "opacity-60")}>
                  {o.lines.map((line) => (
                    <span key={line} className="block whitespace-pre text-syntax-plain">
                      {"    "}
                      {highlight(line)}
                    </span>
                  ))}
                </span>
                {/* The mark says it in a word too, not by colour alone. Bottom right, beside the short Ok line */}
                {(wrong || chosen) && (
                  <span className={cn(PLAY_WORDS, "absolute right-2.5 bottom-2 flex items-center gap-1", chosen ? "text-success" : "text-muted-foreground")}>
                    {chosen ? <Check strokeWidth={2.25} className="size-3.5" aria-hidden="true" /> : <X strokeWidth={2} className="size-3.5" aria-hidden="true" />}
                    {chosen ? "builds" : "doesn't build"}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {/* Two lines kept for the build's answer, so it never moves the versions. Backed, so it reads over the pixels */}
      <p className={cn("min-h-10 px-2", last && "rounded-sm bg-surface-well/85 backdrop-blur-[6px]", last?.builds ? "text-success" : last ? "text-error" : "text-muted-foreground")}>{last?.why}</p>
    </div>
  )
}
