import { Check, Play } from "lucide-react"

import { cn } from "@/lib/utils"

/** Where you are with a tutorial, in the card's top right corner: a square to start it, the steps
 * passed while it's going, a green tinted square with a check once it's done. Only the look: the
 * card's corner button around it carries the name a screen reader hears */
export function TutorialStatus({ done, total, started, finished, className }: { done: number; total: number; started: boolean; finished: boolean; className?: string }) {
  // A quiet filled square, a step lighter than the card, no outline: it should read as a control
  // without competing with the name beside it
  const box = "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[0.5rem]"
  if (finished)
    return (
      <span className={cn(box, "bg-success/15 text-success", className)}>
        <Check strokeWidth={2.25} className="size-4" />
      </span>
    )
  if (started)
    return (
      <span className={cn(box, "bg-surface-raised px-2.5 text-[0.8125rem] text-muted-foreground tabular-nums", className)}>
        {done} of {total}
      </span>
    )
  return (
    <span className={cn(box, "bg-surface-raised text-foreground", className)}>
      <Play strokeWidth={1.75} className="size-4" />
    </span>
  )
}
