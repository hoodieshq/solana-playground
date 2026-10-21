import { Check, Play } from "lucide-react"

import { cn } from "@/lib/utils"

/** Where you are with a tutorial, in the card's top right corner: a square to start it, the steps
 * passed while it's going, a green tinted square with a check once it's done. Only the look: the
 * card's corner button around it carries the name a screen reader hears */
export function TutorialStatus({ done, total, started, finished, className }: { done: number; total: number; started: boolean; finished: boolean; className?: string }) {
  const box = "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-control"
  if (finished)
    return (
      <span className={cn(box, "bg-success/15 text-success", className)}>
        <Check strokeWidth={2.25} className="size-4" />
      </span>
    )
  if (started)
    return (
      <span className={cn(box, "border border-border px-2.5 text-caption! text-muted-foreground tabular-nums", className)}>
        {done} of {total}
      </span>
    )
  return (
    <span className={cn(box, "border border-border bg-surface text-foreground", className)}>
      <Play strokeWidth={1.75} className="size-4" />
    </span>
  )
}
