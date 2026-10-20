import { Button } from "@/components/ui/button"

import type { Predict } from "../data"
import { Prose } from "../sheets/LessonSheet"

/** One question before the code shows, on steps that bring a new idea. Answering
 * first, then seeing the change, keeps the learner thinking instead of rubber-stamping
 * Apply (Lead-and-Reveal, Kazemitabaar et al. 2025). It can always be skipped */
export function PredictZone({ predict, onAnswer }: { predict: Predict; onAnswer: (choice: number | "skip") => void }) {
  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      {/* A quiet label, then the question as the main thing. No icon: the lesson asks this, not the assistant */}
      <p className="px-1 text-caption text-muted-foreground">Quick check</p>
      <h3 className="mt-1 mb-4 px-1 font-heading text-title text-foreground">{predict.question}</h3>
      <div className="flex flex-col gap-2">
        {predict.options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(i)}
            className="flex min-h-12 items-center rounded-control border border-border bg-surface px-3 py-2 text-left text-control text-foreground transition-colors duration-150 ease-standard active:bg-surface-raised motion-reduce:transition-none"
          >
            <span>
              <Prose text={option} chip="bg-surface-raised" />
            </span>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-2 h-11 w-full text-control text-muted-foreground" onClick={() => onAnswer("skip")}>
        Skip and show the code
      </Button>
    </footer>
  )
}
