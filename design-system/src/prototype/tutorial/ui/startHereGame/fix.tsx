import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { highlight, hang } from "../CodeView"
import { EASE_OUT, reducedMotion } from "./motion"
import { CodeCard, Gutter, Reply } from "./parts"
import type { PlayProps } from "./types"

/* Fix the build: the one idea is that an Anchor instruction's Context names a struct of accounts,
   and that struct has to exist. The error is the one rustc gives for it, word for word */

const SIGNATURE = "pub fn hello(_ctx: Context<Hello>) -> Result<()> {"
const BODY = ['    msg!("Hello, World!");', "    Ok(())", "}"]
const ADDED = ["#[derive(Accounts)]", "pub struct Hello {}"]

type Fix = { id: string; what: string; code: string; why: string; right?: boolean }

// The right one sits in the middle, so neither the first nor the last pick is a giveaway
const FIXES: Fix[] = [
  { id: "import", what: "Import it", code: "use anchor_lang::Hello;", why: "anchor_lang has no Hello to import. It's yours to define." },
  { id: "struct", what: "Add it under the function", code: ADDED.join("\n"), why: "Hello lists the accounts hello takes. It takes none, so it's empty.", right: true },
  { id: "unit", what: "Change the type", code: "Context<()>", why: "Context needs a struct that derives Accounts, and () doesn't." },
]

export function FixGame({ onSolved, locked, announce }: PlayProps) {
  const errorId = useId()
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

  // Lines wrap on a narrow phone instead of hiding `Hello` past the edge, and what wraps hangs
  // in from the line's own indent
  const line = (n: number, raw: string, code: ReactNode = highlight(raw)) => (
    <div key={n} className="flex break-words whitespace-pre-wrap text-syntax-plain">
      <Gutter n={n} />
      <span className="min-w-0 flex-1" style={hang(raw)}>
        {code}
      </span>
    </div>
  )

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
    <div>
      <CodeCard
        reply={
          fixed ? (
            <Reply>
              <span className="text-success">Builds.</span> {last.why}
            </Reply>
          ) : (
            <div id={errorId} className="break-words">
              <p className="text-error">error[E0412]: cannot find type `Hello` in this scope</p>
              <p className="text-muted-foreground">{"  --> src/lib.rs:1:28"}</p>
              {last && (
                <p className="mt-1">
                  <span className="text-syntax-comment">//</span> {last.why}
                </p>
              )}
            </div>
          )
        }
      >
        {line(1, SIGNATURE, signature)}
        {BODY.map((code, i) => line(i + 2, code))}
        {fixed && (
          <div ref={added}>
            {line(5, "")}
            {/* The fix's lines keep a faint green, the way a diff shows what was added */}
            <div className="-mx-4 bg-success/8 px-4">{ADDED.map((code, i) => line(i + 6, code))}</div>
          </div>
        )}
      </CodeCard>

      <ul aria-label="Fixes" aria-describedby={errorId} className="mt-3 flex flex-col gap-2">
        {FIXES.map((fix) => {
          const wrong = tried.includes(fix.id)
          const chosen = fixed && fix.right
          return (
            <li key={fix.id}>
              <button
                type="button"
                disabled={(fixed && !fix.right) || locked}
                aria-pressed={chosen}
                onClick={() => pick(fix)}
                className={cn(
                  "flex min-h-11 w-full items-start gap-3 rounded-control border px-3 py-2.5 text-left backdrop-blur-[6px] transition-colors duration-150 ease-standard motion-reduce:transition-none",
                  // Nearly solid, so the pixels behind don't show through the code
                  chosen ? "border-success/50 bg-[color-mix(in_oklab,var(--success)_10%,var(--surface-well))]" : "border-border bg-surface-raised/90 hover:bg-surface-hover",
                  wrong && "border-dashed bg-surface-well/90",
                  fixed && !fix.right && "opacity-60"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-caption text-muted-foreground">{fix.what}</span>
                  <code className={cn("mt-0.5 block font-mono text-[0.75rem]/[1.25rem] break-words whitespace-pre-wrap", wrong ? "text-muted-foreground line-through decoration-muted-foreground/60" : "text-syntax-plain")}>
                    {highlight(fix.code)}
                  </code>
                </span>
                {/* Said in words, not by the colour or the dashed edge alone */}
                {wrong && (
                  <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
                    <X strokeWidth={2} className="size-3.5" aria-hidden="true" />
                    doesn't build
                  </span>
                )}
                {chosen && (
                  <span className="flex shrink-0 items-center gap-1 text-caption text-success">
                    <Check strokeWidth={2.25} className="size-3.5" aria-hidden="true" />
                    builds
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
