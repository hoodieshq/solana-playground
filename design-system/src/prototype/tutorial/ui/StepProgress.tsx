import { ObjectiveMeter } from "@/components/ui/objective-band"

import { STEPS } from "../data"

/** One continuous bar, filled by the steps passed. Equal invisible zones over
 * it still let you jump back to a step you have reached */
export function StepProgress({ current, passed, onPick }: { current: number; passed: boolean[]; onPick: (i: number) => void }) {
  const done = passed.filter(Boolean).length
  return (
    <div className="relative px-4">
      <div className="flex h-11 items-center">
        <ObjectiveMeter value={done / STEPS.length} className="h-1 w-full" />
      </div>
      <nav aria-label="Steps" className="absolute inset-x-4 inset-y-0 flex">
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
              className="h-full flex-1 disabled:cursor-default"
            />
          )
        })}
      </nav>
    </div>
  )
}
