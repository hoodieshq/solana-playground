import { useEffect, useRef } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

import type { Predict } from "../data"
import { Prose } from "../ui/Prose"
import { useKeyHints } from "./pointer"

/** The phone's quick check, in the lesson's column: a quiet label, the question, three options of
 * one shape, Skip. Answering before the code shows keeps the learner thinking (Lead-and-Reveal).
 * Once answered it stays, as a record: the right option in green with a check, a wrong pick in
 * amber (a hint, not an error), the rest faded, and why under them. The phone has no room to keep it */
export function QuickCheck({ predict, answer, onAnswer }: { predict: Predict; answer?: number; onAnswer: (choice: number | "skip") => void }) {
  const done = answer !== undefined
  // 1 to 3 and S name keys, so they show only where there's a keyboard
  const hints = useKeyHints()
  // The question takes the focus as it comes in, so the keyboard answers it straight away. The column
  // scrolls it into view by itself, smoothly, so the focus doesn't jump the scroll
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!done) first.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    // No rule above it: the gap from the lesson over it is enough
    <section aria-labelledby="quick-check" className="mt-8 flex flex-col gap-2">
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
            ref={i === 0 ? first : undefined}
            type="button"
            disabled={done}
            aria-pressed={done ? picked : undefined}
            onClick={() => onAnswer(i)}
            className={cn(
              // text-control needs the !: cn takes it and text-foreground for one setting and drops the first
              "flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left text-control! text-foreground transition-colors duration-150 ease-standard enabled:hover:bg-surface-raised disabled:cursor-default motion-reduce:transition-none",
              done && right && "border-success/50 bg-success/10",
              done && picked && !right && "border-warning/50 bg-warning/10",
              done && !right && !picked && "opacity-55"
            )}
          >
            <span className="min-w-0 flex-1">
              <Prose text={option} />
            </span>
            {/* The key that picks it, 1 to 3 */}
            {!done && hints && <Kbd className="font-[440]!">{i + 1}</Kbd>}
            {done && right && <Check strokeWidth={2.25} aria-label="Right answer" className="size-4 shrink-0 text-success" />}
          </button>
        )
      })}
      {done ? (
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          <Prose text={answer === predict.answer ? predict.right : predict.wrong} />
        </p>
      ) : (
        // Pulled out by its own padding, so its text starts on the column's edge
        <Button variant="ghost" className="mt-1 -ml-2 h-10 self-start px-2 text-muted-foreground" onClick={() => onAnswer("skip")}>
          Skip and show the code
          {hints && <Kbd className="font-[440]!">S</Kbd>}
        </Button>
      )}
    </section>
  )
}
