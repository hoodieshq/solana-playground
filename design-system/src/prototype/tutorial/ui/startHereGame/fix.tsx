import { useLayoutEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { highlight } from "../CodeView"
import { EASE_OUT, reducedMotion } from "./motion"
import { CodeCard, ContextLine, Gutter } from "./parts"
import type { PlayProps } from "./types"

/* Fix the build: the one idea is that an Anchor instruction's Context names a struct of accounts,
   and that struct has to exist. The error is the one rustc gives for it, word for word */

const SIGNATURE = "pub fn hello(_ctx: Context<Hello>) -> Result<()> {"
const ADDED = ["#[derive(Accounts)]", "pub struct Hello {}"]

type Fix = { id: string; label: string; code: string; why: string; right?: boolean }

// The right one sits in the middle, so neither the first nor the last pick is a giveaway
const FIXES: Fix[] = [
  { id: "import", label: "Import Hello", code: "use anchor_lang::Hello;", why: "anchor_lang has no Hello to import. It's yours to define." },
  { id: "struct", label: "Add struct Hello", code: ADDED.join(" "), why: "Hello lists the accounts hello takes: none.", right: true },
  { id: "unit", label: "Use Context<()>", code: "Context<()>", why: "Context needs a struct that derives Accounts, and () doesn't." },
]

/** Four lines are kept under the signature for the build's answer, whatever it is: the error, the
 * reason a fix didn't work, or the two lines that fixed it. So the card never changes height */
export function FixGame({ onSolved, locked, announce }: PlayProps) {
  const [tried, setTried] = useState<string[]>([])
  const [last, setLast] = useState<Fix | null>(null)
  const added = useRef<HTMLDivElement>(null)
  const fixed = last?.right === true

  const pick = (fix: Fix) => {
    if (fixed || locked) return
    setLast(fix)
    if (fix.right) {
      onSolved("World")
      announce(`Builds. ${fix.why} Run is ready.`)
    } else {
      setTried((t) => (t.includes(fix.id) ? t : [...t, fix.id]))
      announce(`Doesn't build. ${fix.why}`)
    }
  }

  // The two new lines rise into the file once, where the fix put them
  useLayoutEffect(() => {
    if (!fixed || !added.current || reducedMotion()) return
    const a = added.current.animate([{ opacity: 0, transform: "translateY(0.375rem)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: EASE_OUT })
    return () => a.cancel()
  }, [fixed])

  // `Hello` in the signature carries the editor's squiggle until the struct exists
  const [before, after] = SIGNATURE.split("Hello>")
  const signature = fixed ? (
    highlight(SIGNATURE)
  ) : (
    <>
      {highlight(before)}
      <span className="text-syntax-type underline decoration-error decoration-wavy underline-offset-[3px]">Hello</span>
      {highlight(`>${after}`)}
    </>
  )

  return (
    <div className="flex flex-col gap-2">
      <CodeCard>
        <p className="sr-only">Line 1: {SIGNATURE}</p>
        <ContextLine n={1} plain>
          {signature}
        </ContextLine>
        <div className="h-20 overflow-hidden">
          {fixed ? (
            <div ref={added}>
              {/* The fix's lines keep a faint green, the way a diff shows what was added */}
              <div className="-mx-3 bg-success/8 px-3">
                {ADDED.map((code, i) => (
                  <div key={code} className="flex whitespace-pre text-syntax-plain">
                    <Gutter n={i + 6} />
                    {highlight(code)}
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground">
                <span className="text-syntax-comment">//</span> <span className="text-success">Builds.</span> {last.why}
              </p>
            </div>
          ) : (
            <div className="break-words">
              <p className="text-error">error[E0412]: cannot find type `Hello` in this scope</p>
              {last ? (
                <p className="text-muted-foreground">
                  <span className="text-syntax-comment">//</span> {last.why}
                </p>
              ) : (
                <p className="text-muted-foreground">{"  --> src/lib.rs:1:28"}</p>
              )}
            </div>
          )}
        </div>
      </CodeCard>

      <ul aria-label="Fixes" className="flex flex-wrap gap-2">
        {FIXES.map((fix) => {
          const wrong = tried.includes(fix.id)
          const chosen = fixed && fix.right
          return (
            <li key={fix.id}>
              <button
                type="button"
                disabled={(fixed && !fix.right) || locked}
                aria-pressed={chosen}
                // The label says what the fix does; the code it would add is read out too
                aria-label={`${fix.label}: ${fix.code}${wrong ? ", doesn't build" : chosen ? ", builds" : ""}`}
                onClick={() => pick(fix)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-control border px-3 text-caption backdrop-blur-[6px] transition-colors duration-150 ease-standard motion-reduce:transition-none",
                  chosen ? "border-success/50 bg-[color-mix(in_oklab,var(--success)_12%,var(--surface-well))] text-foreground" : "border-border bg-surface-raised/90 text-foreground hover:bg-surface-hover",
                  // Said in words and with a mark, not by the colour or the dashed edge alone
                  wrong && "border-dashed bg-surface-well/90 text-muted-foreground line-through decoration-muted-foreground/60",
                  fixed && !fix.right && "opacity-60"
                )}
              >
                {wrong && <X strokeWidth={2} className="size-3.5" aria-hidden="true" />}
                {chosen && <Check strokeWidth={2.25} className="size-3.5 text-success" aria-hidden="true" />}
                {fix.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
