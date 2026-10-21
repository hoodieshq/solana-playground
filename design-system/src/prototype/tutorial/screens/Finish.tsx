import { useRef } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useStore } from "../store"
import { FinishBadge, FinishStats, LastTransaction, LearnedList, UpNextCard } from "../ui/FinishParts"
import { TopBar } from "../ui/TopBar"
import { useMoreBelow } from "../ui/useMoreBelow"

export function Finish() {
  const { dispatch } = useStore()
  const scroller = useRef<HTMLDivElement>(null)
  const more = useMoreBelow(scroller)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X className="size-5" />
          </Button>
        }
      />
      {/* No bottom bar here: what comes next is a section of its own, with room around it */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-[calc(var(--safe-bottom)+16px)]">
          <div>
            <FinishBadge />
            <h2 className="mt-4 text-center font-heading text-display">Tutorial complete</h2>
            <p className="mx-auto mt-2 max-w-[30ch] text-center text-body text-muted-foreground">Your program is live on devnet.</p>
            <FinishStats className="mt-6" />
            <LastTransaction className="mt-6" />
            <h3 className="mt-6 text-caption text-muted-foreground">What you learned</h3>
            <LearnedList className="mt-2" />
            <UpNextCard className="mt-6" />
            <Button variant="secondary" className="mt-6 h-14 w-full" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
              Back to tutorials
            </Button>
          </div>
        </div>
        {/* While there's more below, the screen fades out under the home indicator, as the gallery does */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom)+24px)] bg-linear-to-t from-surface-base to-transparent transition-opacity duration-200 ease-standard motion-reduce:transition-none",
            more ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  )
}
