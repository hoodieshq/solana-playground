import { Button } from "@/components/ui/button"

import { useStore } from "../store"
import { AnswerCard, FinishBadge, FinishHeadline, FinishMeta, LearnedList, NextTutorialButton } from "../ui/FinishParts"

/** A screen of its own, as on the phone, in one column of the phone's order: the outcome, the proof
 * in short, what was learned, then one way on */
export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[32.5rem] px-6 pt-14 pb-16">
        <FinishBadge />
        <FinishHeadline className="mt-5" />
        <FinishMeta className="mt-2" />
        <AnswerCard className="mt-8" />
        <section aria-labelledby="learned-title" className="mt-10">
          <h2 id="learned-title" className="text-caption text-muted-foreground">
            What you learned
          </h2>
          <LearnedList className="mt-2" />
        </section>
        <NextTutorialButton className="mt-8" />
        <div className="mt-2 flex justify-center gap-2">
          {/* Back to the conversation, where the code and the Call panel still are */}
          <Button variant="ghost" className="h-11 px-4 text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "step" })}>
            Back to the tutorial
          </Button>
          <Button variant="ghost" className="h-11 px-4 text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            All tutorials
          </Button>
        </div>
      </div>
    </div>
  )
}
