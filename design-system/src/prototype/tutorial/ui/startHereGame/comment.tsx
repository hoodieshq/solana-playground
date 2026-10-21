import { useState, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, shortKey } from "../../data"
import { highlight } from "../CodeView"
import { CodeCard, Gutter } from "./parts"
import type { PlayProps } from "./types"

/* Get it to build: comment out lines until the program builds. The idea is how a program file is
   put together: one prelude, one declare_id!, items only, and the #[program] module. Two lines
   don't belong, and the build answers every change at once, with rustc's own words */

const ID = `declare_id!("${shortKey(PROGRAM_ID, 4)}");`

const LINES = ["use anchor_lang::prelude::*;", ID, ID, 'let greeting = "Hello";', "#[program]", "pub mod hello_anchor {"]

type Build = { ok: boolean; text: string }

/** What the build says for the lines left in. Errors come in the order rustc reports them: the
 * parser first, then names */
function build(off: boolean[]): Build {
  const on = (i: number) => !off[i]
  if (on(3)) return { ok: false, text: "error: expected item, found keyword `let`" }
  if (on(4) && !on(5)) return { ok: false, text: "error: expected item after attributes" }
  if (!on(0) && (on(1) || on(2))) return { ok: false, text: "error: cannot find macro `declare_id` in this scope" }
  if (on(1) && on(2)) return { ok: false, text: "error[E0428]: the name `ID` is defined multiple times" }
  if (!on(1) && !on(2)) return { ok: false, text: "error[E0425]: cannot find value `ID` in this scope" }
  if (!on(5)) return { ok: false, text: "// Builds, but the program is gone: nothing to call." }
  if (!on(4)) return { ok: false, text: "// Builds, but without #[program] there's nothing to call." }
  return { ok: true, text: "// Builds." }
}

export function CommentGame({ onSolved, locked, announce }: PlayProps) {
  const [off, setOff] = useState<boolean[]>(LINES.map(() => false))
  const status = build(off)

  const toggle = (i: number) => {
    if (locked) return
    const next = off.map((v, k) => (k === i ? !v : v))
    setOff(next)
    const b = build(next)
    onSolved(b.ok ? "World" : null)
    announce(`Line ${i + 1} ${next[i] ? "commented out" : "back in"}. ${b.text.replace(/^\/\/ /, "")}${b.ok ? " Run is ready." : ""}`)
  }

  // Cmd or Ctrl and / is the editor's own shortcut for it; the arrows move between lines
  const keys = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      toggle(i)
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const rows = e.currentTarget.parentElement?.parentElement?.querySelectorAll<HTMLButtonElement>("button")
      rows?.[(i + (e.key === "ArrowDown" ? 1 : LINES.length - 1)) % LINES.length]?.focus()
    }
  }

  return (
    <div className="@container/comment">
      <CodeCard
        reply={
          // Two lines kept where the card is narrow, so a longer error never moves the card
          <p className={cn("min-h-10 @min-[32rem]/comment:min-h-5", status.ok ? "text-success" : status.text.startsWith("//") ? "text-muted-foreground" : "text-error")}>
            {status.text}
          </p>
        }
      >
        <ul aria-label="Program lines">
          {LINES.map((code, i) => (
            <li key={i}>
              {/* The whole line is the button, so the target is the line, not only its number */}
              <button
                type="button"
                aria-pressed={off[i]}
                aria-label={`Line ${i + 1}: ${code}${i === 5 ? " … }" : ""}. ${off[i] ? "Commented out" : "Comment out"}`}
                disabled={locked}
                onClick={() => toggle(i)}
                onKeyDown={(e) => keys(e, i)}
                className="group flex h-6 w-full items-center overflow-hidden rounded-sm text-left whitespace-pre outline-none hover:bg-surface-raised/60 focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Gutter n={i + 1} />
                {off[i] ? (
                  // The slashes say it's off; the line itself stays a readable grey, AA on the card
                  <span className="truncate text-muted-foreground">
                    <span className="text-syntax-comment">{"// "}</span>
                    {code}
                    {i === 5 && " ⋯ }"}
                  </span>
                ) : (
                  <span className="truncate text-syntax-plain">
                    {highlight(code)}
                    {/* The module's body is folded, the way an editor shows it */}
                    {i === 5 && (
                      <>
                        {" "}
                        <span className="rounded-sm bg-surface-raised px-1 text-muted-foreground">⋯</span> {"}"}
                      </>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </CodeCard>
    </div>
  )
}
