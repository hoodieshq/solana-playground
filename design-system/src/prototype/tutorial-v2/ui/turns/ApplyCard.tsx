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
  return <ApplyCardView {...turn} onApply={() => dispatch({ type: "apply", turn: turn.id })} onKeep={() => dispatch({ type: "keep", turn: turn.id })} />
}

/** `fix` is the project's patch card (Spec 04): Apply, Discard and Review in file, then Undo patch. The
 * lesson's card keeps its "Apply to lib.rs" and "Keep it" (Spec 04's tutorial card) */
type ViewProps = Pick<ApplyTurn, "file" | "line" | "before" | "after"> & {
  done: ApplyTurn["done"] | "undone"
  fix?: boolean
  onApply: () => void
  onKeep: () => void
  onUndo?: () => void
  onReview?: () => void
}

/** The card itself, for any chat that proposes a change: the lesson's, and the one beside a project's code */
export function ApplyCardView({ onApply, onKeep, onUndo, onReview, ...turn }: ViewProps) {
  const name = baseName(turn.file)

  if (turn.done !== null)
    return (
      <div className="flex h-9 items-center gap-2 rounded-control border border-border bg-(--card-ground) pr-1 pl-3 text-caption text-muted-foreground">
        <Check strokeWidth={2.5} className={cn("size-3.5", turn.done === "applied" ? "text-success" : "text-subtle")} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
        {turn.fix
          ? turn.done === "applied"
            ? `Applied to ${name}`
            : turn.done === "undone"
              ? "Undone"
              : "Discarded"
          : turn.done === "applied"
            ? `Changed line ${turn.line} of ${name}`
            : `Kept line ${turn.line} as it was`}
        </span>
        {turn.fix && turn.done === "applied" && onUndo && (
          <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-foreground" onClick={onUndo}>
            Undo patch
          </Button>
        )}
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
      <div className="flex h-7 items-center border-b border-border px-3 font-mono text-13 text-muted-foreground">
        {turn.file}:{turn.line}
      </div>
      <div className="bg-surface-well py-1.5 font-mono text-13 leading-5">{shown.map(row)}</div>
      {/* The card's actions on a grey foot, as every card in the chat has them (Almaz, 10 Nov) */}
      <div className="flex items-center gap-2 border-t border-border bg-surface-panel px-3 py-2">
        <Button variant="outline" size="sm" onClick={onApply}>
          {turn.fix ? "Apply" : `Apply to ${name}`}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onKeep}>
          {turn.fix ? "Discard" : "Keep it"}
        </Button>
        {turn.fix && onReview && (
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onReview}>
            Review in file
          </Button>
        )}
      </div>
    </div>
  )
}
