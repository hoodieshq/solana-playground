import { Check } from "lucide-react"

import { STEPS } from "../../data"
import { useStore } from "../../store"
import { took } from "../type"

/** Where a step starts in the conversation: its goal as the heading (the step bar names the step). The step
 * bar scrolls here, and it lights once when reached that way. Once the step passed it carries its
 * check and how long it took */
export function StepDivider({ step }: { step: number }) {
  const { s } = useStore()
  const t = STEPS[step]
  const time = s.times[step]
  const done = s.passed[step] && time.from !== null && time.to !== null
  return (
    <div data-step-anchor={step} className="-mx-2 scroll-mt-3 rounded-control px-2">
      <div className="flex items-baseline gap-3">
        <h2 className="min-w-0 flex-1 font-heading text-[1.125rem] leading-[1.35] font-medium text-foreground">{t.objective}</h2>
        {done && (
          <span className="flex shrink-0 items-center gap-1 text-[0.75rem] text-muted-foreground tabular-nums">
            <Check strokeWidth={2.5} className="size-3.5 text-success" aria-hidden="true" />
            {took(time.to! - time.from!)}
          </span>
        )}
      </div>
    </div>
  )
}
