import { Fragment, useState } from "react"

import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"

/** One continuous bar, filled by the steps passed, and the same count in words.
 * Equal invisible zones over the bar still let you jump back to a step you
 * have reached */
/** `tips` names each step on hover, where a pointer can't see the zones are there (desktop only).
 * `numbered` is for a finger, which gets no hover: the bar splits into the steps, each with its
 * number over it, so the zones show they can be tapped */
export function StepProgress({
  current,
  passed,
  onPick,
  tips = false,
  numbered = false,
}: {
  current: number
  passed: boolean[]
  onPick: (i: number) => void
  tips?: boolean
  numbered?: boolean
}) {
  const done = passed.filter(Boolean).length
  // The step that has just passed while the bar was on screen, for its sweep. Opening a step that
  // passed long ago sweeps nothing. Worked out while rendering, so the sweep starts with the fill
  const [seen, setSeen] = useState({ passed, sweep: null as { step: number; n: number } | null })
  if (seen.passed !== passed) {
    const step = passed.findIndex((p, i) => p && !seen.passed[i])
    setSeen({ passed, sweep: step === -1 ? seen.sweep : { step, n: (seen.sweep?.n ?? 0) + 1 } })
  }
  const sweep = seen.sweep
  return (
    <div className="flex items-center gap-3 px-4">
      <div className="relative min-w-0 flex-1">
        <div className="relative flex h-11 items-center">
          <ObjectiveMeter value={done / STEPS.length} className="h-1 w-full" />
          {sweep && (
            // Over the segment the step fills, clipped to the bar's own shape
            <span
              aria-hidden="true"
              style={{ left: `${(sweep.step / STEPS.length) * 100}%`, width: `${100 / STEPS.length}%` }}
              className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full"
            >
              <span key={sweep.n} className="pg-sweep block size-full" />
            </span>
          )}
        </div>
        <nav aria-label="Steps" className="absolute inset-0 flex">
          {STEPS.map((step, i) => {
            const open = i === 0 || passed[i - 1] || i <= current
            const zone = (
              <button
                type="button"
                disabled={!open}
                onClick={() => onPick(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Step ${i + 1}, ${step.title}${passed[i] ? ", passed" : ""}`}
                className={cn(
                  "h-full flex-1 disabled:cursor-default",
                  // A cut in the ground's colour over the bar parts it into steps
                  numbered && "relative border-surface-base not-first:border-l-[3px]"
                )}
              >
                {numbered && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1 left-1/2 -translate-x-1/2 text-[0.6875rem] leading-none tabular-nums",
                      i === current ? "text-foreground" : "text-muted-foreground",
                      !open && "opacity-50"
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </button>
            )
            return (
              <Fragment key={step.id}>
                {tips ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{zone}</TooltipTrigger>
                    <TooltipContent side="bottom">
                      {i + 1}. {step.title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  zone
                )}
              </Fragment>
            )
          })}
        </nav>
      </div>
      <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
        {done} of {STEPS.length}
      </span>
    </div>
  )
}
