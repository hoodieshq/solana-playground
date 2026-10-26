import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useStore, type Turn } from "../../store"
import { highlight } from "../CodeView"

type ApplyTurn = Extract<Turn, { kind: "apply" }>

/** A change asked for in words, shown as the one line it changes, old over new. Apply writes it and
 * lights it; it never builds or deploys on its own (D8). Keep it leaves the file as it is */
export function ApplyCard({ turn }: { turn: ApplyTurn }) {
  const { dispatch } = useStore()
  const before = turn.before.split("\n")[turn.line - 1] ?? ""
  const after = turn.after.split("\n")[turn.line - 1] ?? ""

  if (turn.done !== null)
    return (
      <div className="flex h-9 items-center gap-2 rounded-control border border-border bg-(--card-ground) px-3 text-caption text-muted-foreground">
        <Check strokeWidth={2.5} className={cn("size-3.5", turn.done === "applied" ? "text-success" : "text-subtle")} aria-hidden="true" />
        {turn.done === "applied" ? `Changed line ${turn.line} of lib.rs` : `Kept line ${turn.line} as it was`}
      </div>
    )

  const row = (kind: "removed" | "added", text: string) => (
    <div className={cn("flex border-l-2 pr-3", kind === "added" ? "border-success bg-success/10" : "border-error bg-error/10")}>
      <span className="w-9 shrink-0 pr-2.5 text-right text-subtle select-none">{kind === "added" ? turn.line : ""}</span>
      <span className={cn("w-4 shrink-0", kind === "added" ? "text-success" : "text-error")}>{kind === "added" ? "+" : "−"}</span>
      <code className={cn("min-w-0 flex-1 break-words whitespace-pre-wrap", kind === "removed" ? "text-error line-through decoration-error/50" : "text-syntax-plain")}>
        {kind === "added" ? highlight(text.trim()) : text.trim()}
      </code>
    </div>
  )

  return (
    <div data-live-card className="overflow-hidden rounded-panel border border-border bg-(--card-ground)">
      <div className="flex h-7 items-center border-b border-border px-3 font-mono text-[0.75rem] text-muted-foreground">src/lib.rs:{turn.line}</div>
      <div className="bg-surface-well py-1.5 font-mono text-[0.75rem] leading-[1.6]">
        {row("removed", before)}
        {row("added", after)}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "apply", turn: turn.id })}>
          Apply to lib.rs
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => dispatch({ type: "keep", turn: turn.id })}>
          Keep it
        </Button>
      </div>
    </div>
  )
}
