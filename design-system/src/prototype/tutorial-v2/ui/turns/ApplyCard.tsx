import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { diffLines, trimContext, type Row } from "../../diff"
import { useStore, type Turn } from "../../store"
import { highlight } from "../CodeView"
import { baseName } from "./Say"

type ApplyTurn = Extract<Turn, { kind: "apply" }>

/** A change shown before it lands: a change asked for in words is the one line it changes, old over
 * new; Show me the fix is every line it changes, with a line of the file around each run. Apply
 * writes it and lights it; it never builds or deploys on its own (D8). Keep it leaves the file as it is */
export function ApplyCard({ turn }: { turn: ApplyTurn }) {
  const { dispatch } = useStore()
  const name = baseName(turn.file)

  if (turn.done !== null)
    return (
      <div className="flex h-9 items-center gap-2 rounded-control border border-border bg-(--card-ground) px-3 text-caption text-muted-foreground">
        <Check strokeWidth={2.5} className={cn("size-3.5", turn.done === "applied" ? "text-success" : "text-subtle")} aria-hidden="true" />
        {turn.fix
          ? turn.done === "applied"
            ? `Applied the fix to ${name}`
            : `Kept ${name} as it was`
          : turn.done === "applied"
            ? `Changed line ${turn.line} of ${name}`
            : `Kept line ${turn.line} as it was`}
      </div>
    )

  // Numbered as the new file has them; a removed line has no number of its own
  let n = 0
  const rows: (Row & { n: number | null })[] = diffLines(turn.before, turn.after).map((r) => ({ ...r, n: r.kind === "removed" ? null : ++n }))
  const shown = (turn.fix ? trimContext(rows, 1) : rows.filter((r) => r.kind !== "context")) as typeof rows

  const row = (r: Row & { n: number | null }, i: number) => {
    const gap = i > 0 && shown[i - 1].n !== null && r.n !== null && r.n - shown[i - 1].n! > 1
    return (
      <div key={i}>
        {gap && <div className="h-3 border-l-2 border-transparent" aria-hidden="true" />}
        <div className={cn("flex border-l-2 pr-3", r.kind === "added" ? "border-success bg-success/10" : r.kind === "removed" ? "border-error bg-error/10" : "border-transparent")}>
          <span className="w-9 shrink-0 pr-2.5 text-right text-subtle select-none">{r.n ?? ""}</span>
          <span className={cn("w-4 shrink-0", r.kind === "added" ? "text-success" : "text-error")}>{r.kind === "added" ? "+" : r.kind === "removed" ? "−" : ""}</span>
          <code
            className={cn(
              "min-w-0 flex-1 break-words whitespace-pre-wrap",
              r.kind === "removed" ? cn("text-error decoration-error/50", r.text.trim() && "line-through") : r.kind === "context" ? "text-muted-foreground" : "text-syntax-plain"
            )}
          >
            {/* The fix keeps each line's indent, so its lines read as the file's */}
            {r.kind === "removed" ? (turn.fix ? r.text : r.text.trim()) : highlight(turn.fix ? r.text : r.text.trim())}
          </code>
        </div>
      </div>
    )
  }

  return (
    <div data-live-card className="overflow-hidden rounded-panel border border-border bg-(--card-ground)">
      <div className="flex h-7 items-center border-b border-border px-3 font-mono text-[0.75rem] text-muted-foreground">
        {turn.file}:{turn.line}
      </div>
      <div className="bg-surface-well py-1.5 font-mono text-[0.75rem] leading-[1.6]">{shown.map(row)}</div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "apply", turn: turn.id })}>
          Apply to {name}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => dispatch({ type: "keep", turn: turn.id })}>
          Keep it
        </Button>
      </div>
    </div>
  )
}
