import { Check } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Predict } from "../data"
import { Prose } from "./Prose"

/** One question before the code shows, on steps that bring a new idea. Answering
 * first, then seeing the change, keeps the learner thinking instead of rubber-stamping
 * Apply (Lead-and-Reveal, Kazemitabaar et al. 2025). It can always be skipped.
 * `picked` is the answer given: the verdict shows in place, on the options themselves,
 * the right one in green with a check and a wrong pick in amber (a hint, not an error),
 * and the code comes on the next tap, so the answer is seen before it's gone */
export function PredictZone({
  predict,
  picked,
  onPick,
  onReveal,
  onSkip,
}: {
  predict: Predict
  picked: number | null
  onPick: (choice: number) => void
  onReveal: () => void
  onSkip: () => void
}) {
  const done = picked !== null
  return (
    // On a small phone with a large font the question and its options outgrow the screen: the
    // zone gives way and scrolls, never pushing the screen past its edge. Where there is room it stops
    // at most of the height, so some code stays in view
    <footer className="max-h-[70%] min-h-0 shrink overflow-y-auto overscroll-contain border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      {/* A quiet label, then the question as the main thing. No icon: the lesson asks this, not the assistant */}
      <p className="px-1 text-caption text-muted-foreground">Quick check</p>
      <h3 className="mt-1 mb-4 px-1 font-heading text-title text-foreground">{predict.question}</h3>
      <div className="flex flex-col gap-2">
        {predict.options.map((option, i) => {
          const right = i === predict.answer
          const mine = i === picked
          return (
            <button
              key={option}
              type="button"
              disabled={done}
              aria-pressed={done ? mine : undefined}
              onClick={() => onPick(i)}
              className={cn(
                // text-control needs the !: cn takes it and text-foreground for one setting and drops the first
                "flex min-h-12 items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left text-control! text-foreground transition-[background-color,border-color,opacity] duration-150 ease-standard enabled:active:bg-surface-raised disabled:cursor-default motion-reduce:transition-none",
                done && right && "border-success/50 bg-success/10",
                done && mine && !right && "border-warning/50 bg-warning/10",
                done && !right && !mine && "opacity-55"
              )}
            >
              <span className="min-w-0 flex-1">
                <Prose text={option} />
              </span>
              {done && right && <Check strokeWidth={2.25} aria-label="Right answer" className="size-4 shrink-0 text-success" />}
            </button>
          )
        })}
      </div>
      {done ? (
        <>
          <p role="status" className="mt-3 px-1 text-caption leading-relaxed text-muted-foreground">
            <Prose text={picked === predict.answer ? predict.right : predict.wrong} />
          </p>
          <BrandButton variant="accent" autoFocus className="mt-3 h-12 w-full" onClick={onReveal}>
            Show the code
          </BrandButton>
        </>
      ) : (
        <Button variant="ghost" className="mt-2 h-11 w-full text-muted-foreground" onClick={onSkip}>
          Skip and show the code
        </Button>
      )}
    </footer>
  )
}
