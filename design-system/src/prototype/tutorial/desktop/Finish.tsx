import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { useStore } from "../store"
import { FinishBadge, FinishStats, LastTransaction, LearnedList, UpNextCard } from "../ui/FinishParts"

/** A screen of its own, as on the phone, in one column of the phone's order */
export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[32.5rem] px-6 pt-14 pb-16">
        <FinishBadge />
        <h1 className="mt-4 text-center font-heading text-display">Tutorial complete</h1>
        <p className="mt-2 text-center text-body text-muted-foreground">Your program is live on devnet.</p>
        <FinishStats className="mt-8" />
        {/* The proof the program runs, a row of its own under the numbers, then what was learned */}
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
          <Button variant="ghost" className="h-11 px-5" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            Open the project
          </Button>
        </div>
      </div>
    </div>
  )
}
