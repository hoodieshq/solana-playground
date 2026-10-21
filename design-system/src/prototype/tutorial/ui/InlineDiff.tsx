import { Fragment } from "react"

import { cn } from "@/lib/utils"

import type { Patch } from "../data"
import { diffLines } from "../diff"
import { hang, highlight } from "./CodeView"
import { Prose } from "./Prose"

/** A proposal shown in the file itself: unchanged lines as code, added ones
 * green, removed ones red and struck. A line the assistant explains carries a
 * purple dot; tapping the line opens its note right under it, by the code it is about */
export function InlineDiff({ patch, open, onToggle }: { patch: Patch; open: number[]; onToggle: (line: number) => void }) {
  const notes = new Map(patch.notes.map((n) => [n.line, n.text]))
  let n = 0
  return (
    <div aria-label={`Proposed change to ${patch.file}`} className="min-h-0 flex-1 overflow-y-auto py-2 font-mono text-code">
      {diffLines(patch.before, patch.after).map((row, i) => {
        const number = row.kind === "removed" ? null : ++n
        const note = number !== null ? notes.get(number) : undefined
        const shown = note !== undefined && open.includes(number!)
        const line = (
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
            {note !== undefined ? (
              <button type="button" aria-expanded={shown} onClick={() => onToggle(number!)} className={tone}>
                {line}
              </button>
            ) : (
              <div className={tone}>{line}</div>
            )}
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
