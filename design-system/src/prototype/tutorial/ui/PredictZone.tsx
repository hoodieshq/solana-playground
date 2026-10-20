import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { Predict } from "../data"

/** One question before the code shows, on steps that bring a new idea. Answering
 * first, then seeing the change, keeps the learner thinking instead of rubber-stamping
 * Apply (Lead-and-Reveal, Kazemitabaar et al. 2025). It can always be skipped */
export function PredictZone({ predict, onAnswer }: { predict: Predict; onAnswer: (choice: number | "skip") => void }) {
  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      <p className="mb-3 flex items-start gap-1.5 px-1 text-caption text-muted-foreground">
        <MessageCircle strokeWidth={1.75} className="mt-px size-4 shrink-0 text-brand-purple" />
        <span>
          <span className="text-foreground">Before you see it: </span>
          {predict.question}
        </span>
      </p>
      <div className="flex flex-col gap-2">
        {predict.options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(i)}
            className="flex min-h-12 items-center rounded-control border border-border bg-surface px-3 py-2 text-left font-mono text-caption text-foreground transition-colors duration-150 ease-standard active:bg-surface-raised motion-reduce:transition-none"
          >
            {option}
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-1 h-11 w-full text-control text-muted-foreground" onClick={() => onAnswer("skip")}>
        Skip and show the code
      </Button>
    </footer>
  )
}
