import { Check } from "lucide-react"

/** Where you are with a tutorial, at the card's right end. The line under the name describes the
 * tutorial itself, so your own progress stays out of it: a check in a circle once it's done, the
 * steps passed while it's going. Screen readers get it in words */
export function TutorialStatus({ done, total, finished }: { done: number; total: number; finished: boolean }) {
  if (finished)
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <Check strokeWidth={2.5} className="size-4" aria-hidden="true" />
        <span className="sr-only">Completed</span>
      </span>
    )
  return (
    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
      <span className="sr-only">In progress, </span>
      {done} of {total}
    </span>
  )
}
