import { cn } from "@/lib/utils"

import type { Patch } from "../data"
import { diffLines } from "../diff"
import { highlight } from "./CodeView"

/** A proposal shown in the file itself, not in a card: unchanged lines as code,
 * added ones green, removed ones red and struck, so you see where each change lands */
export function InlineDiff({ patch }: { patch: Patch }) {
  let n = 0
  return (
    <pre aria-label={`Proposed change to ${patch.file}`} className="min-h-0 flex-1 overflow-y-auto py-2 font-mono text-code">
      {diffLines(patch.before, patch.after).map((row, i) => {
        const number = row.kind === "removed" ? null : ++n
        return (
          <div
            key={i}
            className={cn(
              "flex border-l-2 border-transparent pr-3",
              row.kind === "added" && "border-success bg-success/10",
              row.kind === "removed" && "border-error bg-error/10"
            )}
          >
            <span className="w-10 shrink-0 pr-3 text-right text-subtle select-none">{number ?? ""}</span>
            <span
              aria-hidden="true"
              className={cn("w-3 shrink-0 select-none", row.kind === "added" ? "text-success" : row.kind === "removed" ? "text-error" : "")}
            >
              {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""}
            </span>
            <code
              className={cn(
                "min-w-0 flex-1 break-words whitespace-pre-wrap text-syntax-plain",
                row.kind === "removed" && "text-error line-through decoration-error/50"
              )}
            >
              {row.kind === "removed" ? row.text : highlight(row.text)}
            </code>
          </div>
        )
      })}
    </pre>
  )
}
