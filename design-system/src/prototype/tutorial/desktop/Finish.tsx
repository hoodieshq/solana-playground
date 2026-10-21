import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { TX_SIGNATURE } from "../data"
import { useStore } from "../store"
import { FinishBadge, FinishStats, LearnedList, UpNextCard } from "../ui/FinishParts"

/** A screen of its own, as on the phone. The width the phone didn't have goes to the last
 * transaction: proof the program really runs */
export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[34rem] px-6 pt-14 pb-16">
        <FinishBadge />
        <h1 className="mt-4 text-center font-heading text-display">Tutorial complete</h1>
        <p className="mt-2 text-center text-body text-muted-foreground">Your program is live on devnet.</p>
        <FinishStats className="mt-8" />
        <div className="mt-8 grid grid-cols-2 gap-8">
          <section aria-labelledby="learned-title">
            <h2 id="learned-title" className="text-caption text-muted-foreground">
              What you learned
            </h2>
            <LearnedList className="mt-2" />
          </section>
          <section aria-labelledby="tx-title">
            <h2 id="tx-title" className="text-caption text-muted-foreground">
              Your last transaction
            </h2>
            <a
              href={`https://explorer.solana.com/tx/${TX_SIGNATURE}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-control border border-border bg-surface-panel px-3 py-2 transition-colors hover:bg-surface"
            >
              <code className="block truncate font-mono text-code text-foreground">{TX_SIGNATURE}</code>
              <span className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                Open in Explorer
                <ExternalLink strokeWidth={1.75} className="size-3.5" />
              </span>
            </a>
          </section>
        </div>
        <UpNextCard className="mt-8" />
        <div className="mt-8 flex gap-2">
          <Button variant="secondary" className="h-11 px-5 text-control" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            Back to tutorials
          </Button>
          <Button variant="ghost" className="h-11 px-5 text-control" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            Open the project
          </Button>
        </div>
      </div>
    </div>
  )
}
