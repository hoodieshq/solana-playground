import { Button } from "@/components/ui/button"

import type { Predict } from "../data"
import { Prose } from "../ui/Prose"

/** The phone's quick check, in the lesson's column: a quiet label, the question, three options of
 * one shape, Skip. Answering before the code shows keeps the learner thinking (Lead-and-Reveal) */
export function QuickCheck({ predict, onAnswer }: { predict: Predict; onAnswer: (choice: number | "skip") => void }) {
  return (
    <section aria-labelledby="quick-check" className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
      <p className="text-caption text-muted-foreground">Quick check</p>
      <h3 id="quick-check" className="mb-2 font-heading text-title text-foreground">
        {predict.question}
      </h3>
      {predict.options.map((option, i) => (
        <button
          key={option}
          type="button"
          onClick={() => onAnswer(i)}
          className="flex min-h-11 items-center rounded-control border border-border bg-surface px-3 py-2 text-left text-control text-foreground transition-colors duration-150 ease-standard hover:bg-surface-raised motion-reduce:transition-none"
        >
          <span>
            <Prose text={option} />
          </span>
        </button>
      ))}
      <Button variant="ghost" className="mt-1 h-10 self-start px-2 text-caption text-muted-foreground" onClick={() => onAnswer("skip")}>
        Skip and show the code
      </Button>
    </section>
  )
}
