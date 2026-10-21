import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

import type { Predict } from "../data"
import { Prose } from "../ui/Prose"

/** The phone's quick check, in the lesson's column: a quiet label, the question, three options of
 * one shape, Skip. Answering before the code shows keeps the learner thinking (Lead-and-Reveal).
 * Once answered it stays, as a record: the right option in green with a check, a wrong pick in
 * amber (a hint, not an error), the rest faded, and why under them. The phone has no room to keep it */
export function QuickCheck({ predict, answer, onAnswer }: { predict: Predict; answer?: number; onAnswer: (choice: number | "skip") => void }) {
  const done = answer !== undefined
  return (
    <section aria-labelledby="quick-check" className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
      <p className="text-caption text-muted-foreground">Quick check</p>
      <h3 id="quick-check" className="mb-2 font-heading text-title text-foreground">
        {predict.question}
      </h3>
      {predict.options.map((option, i) => {
        const right = i === predict.answer
        const picked = i === answer
        return (
          <button
            key={option}
            type="button"
            disabled={done}
            aria-pressed={done ? picked : undefined}
            onClick={() => onAnswer(i)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left text-control text-foreground transition-colors duration-150 ease-standard enabled:hover:bg-surface-raised disabled:cursor-default motion-reduce:transition-none",
              done && right && "border-success/50 bg-success/10",
              done && picked && !right && "border-warning/50 bg-warning/10",
              done && !right && !picked && "opacity-55"
            )}
          >
            <span className="min-w-0 flex-1">
              <Prose text={option} />
            </span>
            {/* The key that picks it, 1 to 3 */}
            {!done && <Kbd>{i + 1}</Kbd>}
            {done && right && <Check strokeWidth={2.25} aria-label="Right answer" className="size-4 shrink-0 text-success" />}
          </button>
        )
      })}
      {done ? (
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          <Prose text={answer === predict.answer ? predict.right : predict.wrong} />
        </p>
      ) : (
        <Button variant="ghost" className="mt-1 h-10 self-start px-2 text-caption text-muted-foreground" onClick={() => onAnswer("skip")}>
          Skip and show the code
          <Kbd>S</Kbd>
        </Button>
      )}
    </section>
  )
}
