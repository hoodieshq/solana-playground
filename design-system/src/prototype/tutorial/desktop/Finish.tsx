import { Button } from "@/components/ui/button"

import { STEPS } from "../data"
import { useStore } from "../store"
import { FinishBadge, FinishHeadline, FinishStats, LastTransaction, LearnedList, UpNextCard } from "../ui/FinishParts"

/** A screen of its own, as on the phone, in one column of the phone's order */
export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[32.5rem] px-6 pt-14 pb-16">
        <FinishBadge />
        {/* What the program said back is the headline: the tutorial's outcome in its own words */}
        <FinishHeadline className="mt-5" />
        <p className="mt-4 text-center text-body text-muted-foreground">Tutorial complete. Your program is live on devnet.</p>
        <FinishStats className="mt-8" />
        {/* The proof the program runs, printed under the numbers, then what was learned */}
        <LastTransaction className="mt-8" />
        <section aria-labelledby="learned-title" className="mt-8">
          <h2 id="learned-title" className="text-caption text-muted-foreground">
            What you learned
          </h2>
          <LearnedList className="mt-2" />
        </section>
        <UpNextCard className="mt-8" />
        <div className="mt-8 flex gap-2">
          <Button variant="secondary" className="h-11 px-5" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            Back to tutorials
          </Button>
          {/* The project the tutorial built: its last step, where all of its code is */}
          <Button variant="ghost" className="h-11 px-5" onClick={() => dispatch({ type: "openStep", step: STEPS.length - 1 })}>
            Open the project
          </Button>
        </div>
      </div>
    </div>
  )
}
