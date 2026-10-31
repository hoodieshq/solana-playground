import { STEPS } from "../../data"
import { TITLE } from "../type"

/** Where a step starts in the conversation: its goal as the heading (the step bar names the step). The step
 * bar scrolls here, and it lights once when reached that way. A passed step shows nothing more: the bar's
 * segment already says it's done, and the time it took beside the heading only took the line's room.
 * Reached from the bar it stops 22 under the feed's top, where the first step's heading sits on load,
 * so a jump lands the heading in the same place every time */
export function StepDivider({ step }: { step: number }) {
  return (
    <div data-step-anchor={step} className="-mx-2 scroll-mt-[22px] rounded-control px-2">
      {/* The lesson's section heading, Practicum's H2 at 400px: 24/28 */}
      <h2 className={TITLE}>{STEPS[step].objective}</h2>
    </div>
  )
}
