import { Fragment, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import type { Patch } from "../data"
import { diffLines } from "../diff"
import { hang, highlight } from "./CodeView"
import { Prose } from "./Prose"

/** A proposal shown in the file itself: unchanged lines as code, added ones
 * green, removed ones red and struck. A line the assistant explains carries a
 * purple dot; the dot, with the line number beside it, is a button that opens the
 * note right under the line, by the code it is about. The code itself stays text,
 * so it can be selected and copied. On a short screen the change can open below the fold (the fix's
 * line 15, step 4's line 9 on a phone), so the diff scrolls to its first changed line as it opens */
export function InlineDiff({ patch, open, onToggle }: { patch: Patch; open: number[]; onToggle: (line: number) => void }) {
  const notes = new Map(patch.notes.map((n) => [n.line, n.text]))
  const rows = diffLines(patch.before, patch.after)
  const first = rows.findIndex((r) => r.kind !== "context")
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    const row = el?.querySelector<HTMLElement>("[data-first-change]")
    if (!el || !row) return
    // Only when it's out of view, and then a third of the way down, so the lines above it still say where it is
    const shown = row.offsetTop >= el.scrollTop && row.offsetTop + row.offsetHeight <= el.scrollTop + el.clientHeight
    if (shown) return
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollTo({ top: Math.max(0, row.offsetTop - el.clientHeight / 3), behavior: smooth ? "smooth" : "auto" })
  }, [patch.before, patch.after])
  let n = 0
  return (
    <div ref={box} aria-label={`Proposed change to ${patch.file}`} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 font-mono text-code">
      {rows.map((row, i) => {
        const number = row.kind === "removed" ? null : ++n
        const note = number !== null ? notes.get(number) : undefined
        const shown = note !== undefined && open.includes(number!)
        const gutter = (
          <>
            <span className="w-10 shrink-0 pr-2 text-right text-subtle select-none">{number ?? ""}</span>
            <span aria-hidden="true" className="flex w-4 shrink-0 items-start justify-center pt-[0.45em]">
              {note !== undefined ? (
                <span className={cn("size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25", shown && "ring-brand-purple/50")} />
              ) : (
                <span className={cn("leading-none", row.kind === "added" ? "text-success" : row.kind === "removed" ? "text-error" : "")}>
                  {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""}
                </span>
              )}
            </span>
          </>
        )
        const line = (
          <>
            {note !== undefined ? (
              // The number and the dot, 56px wide. A finger gets it 44px tall too: the press reaches
              // past the line above and below, which the code under it doesn't need
              <button
                type="button"
                aria-expanded={shown}
                aria-label={`Note on line ${number}`}
                onClick={() => onToggle(number!)}
                className="relative flex shrink-0 text-left pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-3"
              >
                {gutter}
              </button>
            ) : (
              gutter
            )}
            <code
              style={hang(row.text)}
              className={cn(
                "min-w-0 flex-1 break-words whitespace-pre-wrap text-syntax-plain",
                row.kind === "removed" && "text-error line-through decoration-error/50"
              )}
            >
              {/* Removed lines stay one colour, but their arrows still mustn't wrap, as in highlight() */}
              {row.kind === "removed"
                ? row.text.split(/(->|=>)/).map((part, k) =>
                    k % 2 ? (
                      <span key={k} className="whitespace-nowrap">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )
                : highlight(row.text)}
            </code>
          </>
        )
        const tone = cn(
          "flex w-full border-l-2 border-transparent pr-3 text-left",
          row.kind === "added" && "border-success bg-success/10",
          row.kind === "removed" && "border-error bg-error/10"
        )
        return (
          <Fragment key={i}>
            <div className={tone} data-first-change={i === first || undefined}>
              {line}
            </div>
            {shown && (
              <p className="my-1.5 mr-3 ml-14 rounded-control border border-border bg-surface-panel px-3 py-2 font-sans text-caption text-muted-foreground">
                <Prose text={note} />
              </p>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
