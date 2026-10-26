import { ArrowUpRight, FileCode, FilePlus2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { cn } from "@/lib/utils"

import { useStore, type Turn } from "../../store"
import { highlight } from "../CodeView"
import { baseName } from "./Say"

type WroteTurn = Extract<Turn, { kind: "wrote" }>

/** "lines 5 to 13", "line 10" */
export const range = (lines: number[]) => (lines.length === 0 ? "" : lines.length === 1 ? `line ${lines[0]}` : `lines ${lines[0]} to ${lines[lines.length - 1]}`)

/** A file the assistant touched, and the way back to the lines: the whole card opens the tab, brings
 * the lines into view and lights them again. Its first three lines show
 * here, so the chat keeps a record of what was written even with another file open. On a phone the
 * created file's row is a thumb's height */
export function WroteCard({ turn, phone = false }: { turn: WroteTurn; phone?: boolean }) {
  const { s, dispatch } = useStore()
  const name = baseName(turn.file)
  const show = () => dispatch({ type: "reveal", file: turn.file, lines: turn.lines })

  if (turn.created)
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: "openFile", file: turn.file })}
        aria-label={`Open ${name}`}
        className={cn(
          "flex h-9 w-full items-center gap-2 overflow-hidden rounded-control border border-border bg-(--card-ground) px-3 text-left hover:border-border-strong",
          phone && "h-11"
        )}
      >
        <FilePlus2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="shrink-0 text-caption text-muted-foreground">Created</span>
        {/* The path gives way on a narrow row, never the tag: it was pushed past the card's edge on a phone */}
        <span className="min-w-0 truncate font-mono text-[0.75rem] text-foreground">{turn.file}</span>
        <Tag className="ml-auto shrink-0">New file</Tag>
      </button>
    )

  // The lines as written: the file may have moved on since
  const rows = (s.files[turn.file] ?? "").split("\n")
  const text = (n: number, k: number) => turn.preview?.[k] ?? rows[n - 1] ?? ""
  // A run from the first line written: a blank line between two written ones keeps its place, so
  // 1 and 3 don't read as a gap
  const first = turn.lines[0] ?? 1
  const last = turn.lines[turn.lines.length - 1] ?? first
  const shown = Array.from({ length: Math.min(3, last - first + 1) }, (_, i) => first + i)
  const more = last - shown[shown.length - 1]
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={show}
        aria-label={`Show ${range(turn.lines)} in ${name}`}
        className="w-full overflow-hidden rounded-control border border-border bg-(--card-ground) text-left transition-colors duration-100 hover:border-border-strong motion-reduce:transition-none"
      >
        <span className="flex h-8 items-center gap-2 px-3">
          <FileCode className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-[0.75rem] text-foreground">{turn.file}</span>
          <span className="truncate text-[0.75rem] text-muted-foreground">{range(turn.lines)}</span>
          {/* The whole card opens the lines: the arrow says so, without a footer of its own */}
          <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </span>
        {turn.appended && <span className="block border-t border-border px-3 py-1.5 text-[0.75rem] text-warning-ink">I put it at the end: your own lines are kept.</span>}
        {/* The code on the card's own ground, one shade for the whole card */}
        <span className="block pb-2 font-mono text-[0.75rem] leading-[1.6]">
          {shown.map((n) => {
            const k = turn.lines.indexOf(n)
            return (
              <span key={n} className="flex pr-3">
                <span className="w-9 shrink-0 pr-2.5 text-right text-subtle select-none">{n}</span>
                {/* Wrapped, not cut: the program id is the point of declare_id! */}
                <span className="min-w-0 flex-1 whitespace-pre-wrap text-syntax-plain [overflow-wrap:anywhere]">{k === -1 ? (rows[n - 1] ?? "") : highlight(text(n, k))}</span>
              </span>
            )
          })}
          {more > 0 && (
            <span className="block pl-9 text-subtle">
              {more} more {more === 1 ? "line" : "lines"}
            </span>
          )}
        </span>
      </button>
      {turn.appended && (
        <Button variant="ghost" size="xs" className={cn("w-fit text-muted-foreground", phone && "h-11 px-3")} onClick={() => dispatch({ type: "resetFile" })}>
          Reset {name} to this step's start
        </Button>
      )}
    </div>
  )
}
