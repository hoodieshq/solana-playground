import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"

/** The tutorial's steps as short segments beside "Step 1 of 4" in the step's head: one place says
 * where you are and how much is left, instead of a bar in the tab row that counted something else.
 * Passed steps are filled, the current one is lit, the ones ahead are empty. A step you have
 * reached can be picked again; each names itself on hover */
export function StepTrack({ current, passed, onPick }: { current: number; passed: boolean[]; onPick: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="flex shrink-0 items-center gap-1">
      {STEPS.map((step, i) => {
        const open = i === 0 || passed[i - 1] || i <= current
        return (
          <Tooltip key={step.id}>
            <TooltipTrigger asChild>
              {/* The segment is 4px tall, the button around it a target a pointer can't miss */}
              <button
                type="button"
                disabled={!open}
                onClick={() => onPick(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Step ${i + 1}, ${step.title}${passed[i] ? ", passed" : ""}`}
                className="group/seg flex h-6 items-center outline-none disabled:cursor-default pointer-coarse:h-11"
              >
                <span
                  className={cn(
                    "block h-1 w-5 rounded-full transition-colors duration-200 motion-reduce:transition-none group-focus-visible/seg:outline-2 group-focus-visible/seg:outline-offset-2 group-focus-visible/seg:outline-brand-purple",
                    i === current ? "bg-brand-purple" : passed[i] ? "bg-foreground/60 group-hover/seg:bg-foreground" : "bg-border-strong",
                    open && i !== current && !passed[i] && "group-hover/seg:bg-muted-foreground"
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {i + 1}. {step.title}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
