import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The steps as the design system's step rail draws them: a line down the side joining the
 * marks, green once passed, a purple dot with a halo for where you are, a hollow dot for
 * what waits. Unlike the rail, rows you have reached open their step */
export function StepList({ className }: { className?: string }) {
  const { s, dispatch } = useStore()
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  // Steps passed and the one you're on can be opened. The ones after it wait
  const reachable = (i: number) => s.passed[i] || first === -1 || i <= first

  return (
    <ol className={className}>
      {STEPS.map((step, i) => {
        const passed = s.passed[i]
        const current = !finished && i === first
        const open = reachable(i)
        return (
          <li
            key={step.id}
            className={cn(
              "relative",
              // the connector, from under this mark to the top of the next one
              "before:absolute before:top-[40px] before:bottom-[-10px] before:left-[9.5px] before:w-px before:bg-border last:before:hidden",
              passed && "before:bg-success/60"
            )}
          >
            <button
              type="button"
              disabled={!open}
              onClick={() => dispatch({ type: "openStep", step: i })}
              aria-current={current ? "step" : undefined}
              aria-label={`Step ${i + 1}, ${step.title}${passed ? ", passed" : current ? ", current" : ""}`}
              className="-mx-2 grid w-[calc(100%+1rem)] grid-cols-[20px_1fr] gap-x-3 rounded-control px-2 py-3 text-left transition-colors duration-150 ease-standard enabled:hover:bg-surface enabled:active:bg-surface disabled:cursor-default motion-reduce:transition-none"
            >
              {/* The mark sits centred on the title's line */}
              <span aria-hidden="true" className="grid h-[22px] place-items-center">
                {passed ? (
                  <Check strokeWidth={3} className="size-3.5 text-success" />
                ) : current ? (
                  <span className="size-2.5 rounded-full bg-brand-purple ring-4 ring-brand-purple/25" />
                ) : (
                  <span className="size-2.5 rounded-full border border-muted-foreground/60" />
                )}
              </span>
              {/* A step still ahead keeps its title brighter than its objective, so the two don't read as one grey block */}
              <span className={cn("block text-control! leading-[22px]", !open && "text-foreground/70")}>{step.title}</span>
              <span className="col-start-2 block text-caption text-muted-foreground">{step.objective}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
