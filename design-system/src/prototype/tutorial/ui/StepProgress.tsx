import { cn } from "@/lib/utils"

import { STEPS } from "../data"

export function StepProgress({ current, passed, onPick }: { current: number; passed: boolean[]; onPick: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="flex gap-1 px-4">
      {STEPS.map((step, i) => {
        const open = i === 0 || passed[i - 1] || i <= current
        return (
          <button
            key={step.id}
            type="button"
            disabled={!open}
            onClick={() => onPick(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Step ${i + 1}, ${step.title}${passed[i] ? ", passed" : ""}`}
            className="flex h-11 flex-1 items-center disabled:cursor-default"
          >
            <span
              className={cn(
                "h-1 w-full rounded-full bg-border-strong transition-colors duration-200",
                passed[i] && "bg-success",
                i === current && !passed[i] && "bg-primary"
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}
