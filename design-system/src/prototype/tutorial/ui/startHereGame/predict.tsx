import { useId, useState } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../CodeView"
import { CodeCard, Gutter } from "./parts"
import type { PlayProps } from "./types"

/* Predict the log: one question, three outputs, and Run shows what the log really says. No
   verdict: the guess sits above the real log and the player compares. The idea is what msg!
   writes and where it ends up: a line in the program's log, prefixed by the runtime */

const GUESSES = ["Hello, World!", 'log: "Hello, World!"', "Program log: Hello, World!"]

export function PredictGame({ onSolved, locked, announce }: PlayProps) {
  const name = useId()
  const [guess, setGuess] = useState<number | null>(null)

  const choose = (i: number) => {
    if (locked) return
    setGuess(i)
    onSolved("World", `your guess: ${GUESSES[i]}`)
    announce(`Guess: ${GUESSES[i]}. Run shows what the log says.`)
  }

  return (
    <div className="flex flex-col gap-2">
      <CodeCard>
        <div className="flex whitespace-pre text-syntax-plain">
          <Gutter n={10} />
          {highlight('    msg!("Hello, World!");')}
        </div>
      </CodeCard>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-caption text-muted-foreground">What does the program log show?</legend>
        <div className="flex flex-col gap-1.5">
          {GUESSES.map((g, i) => (
            <label
              key={g}
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2.5 rounded-control border px-3 font-mono text-[0.75rem] backdrop-blur-[6px] transition-colors duration-150 ease-standard has-focus-visible:ring-2 has-focus-visible:ring-ring/60 motion-reduce:transition-none",
                guess === i ? "border-brand-periwinkle/60 bg-[color-mix(in_oklab,var(--brand-periwinkle)_12%,var(--surface-well))]" : "border-border bg-surface-raised/90 hover:bg-surface-hover"
              )}
            >
              <input type="radio" name={name} checked={guess === i} disabled={locked} onChange={() => choose(i)} className="size-3.5 accent-[var(--brand-periwinkle)]" />
              <span className="truncate text-syntax-plain">{g}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
