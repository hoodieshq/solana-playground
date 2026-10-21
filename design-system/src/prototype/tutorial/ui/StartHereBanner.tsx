import { useId } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, STEPS } from "../data"
import { useStore } from "../store"
import { StartHereArt } from "./startHereArt"
import { StartHereSurface } from "./startHereSurface"

/* The panel's ground: the page's own panel with a little of Solana's purple mixed in, and a soft
   light of it from the corner the picture sits in. Enough to say "start here", never a gradient */
const GROUND = {
  background:
    "radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--brand-purple) 14%, transparent), transparent 62%), color-mix(in oklab, var(--brand-purple) 6%, var(--surface-panel))",
}

/** The gallery's top: the tutorial a new developer begins with, in three states. Fresh, it invites
 * and opens the tutorial's page. Started, it picks up at the first step not yet passed. Finished,
 * it says so and points on to the next tutorial. The picture is the tutorial's own moment: the
 * hello you write, coming back from devnet */
export function StartHereBanner({ layout }: { layout: "phone" | "desktop" }) {
  const { s, dispatch } = useStore()
  const titleId = useId()
  const phone = layout === "phone"

  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const fresh = !started && !finished
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)

  const label = finished ? "Completed" : started ? "Pick up where you left off" : "Start here"
  const line = finished
    ? "Your program is on devnet, and its hello came back"
    : started
      ? first === -1
        ? "Every step passed. One more tap to finish"
        : `Next: ${STEPS[first].objective}`
      : "Write, deploy and call your first Solana program"

  const button = phone ? "h-12 w-full" : "h-10 px-5"

  return (
    <section
      aria-labelledby={titleId}
      style={GROUND}
      className={cn("@container relative isolate overflow-hidden rounded-card border border-brand-purple/20", phone ? "mt-5" : "mt-8")}
    >
      {/* On a phone the picture is a strip across the top, the msg! line and its echo only, and the
          pixels stay in it. The words below sit on the plain ground */}
      {phone ? (
        <div className="relative border-b border-brand-purple/15">
          {/* Only right of the code: 29ch at the strip's own mono size is its longest line. On a
              narrow phone with a large font there is no room left, and the strip goes without */}
          <div className="absolute inset-y-0 right-0 left-[calc(1rem+29ch)] font-mono text-[0.6875rem]">
            <StartHereSurface layout="phone" />
          </div>
          <StartHereArt compact fresh={fresh} done={finished} />
        </div>
      ) : (
        <StartHereSurface layout="desktop" />
      )}

      <div className={cn("relative", phone ? "p-5" : "grid items-center gap-x-8 gap-y-6 p-8 @min-[44rem]:grid-cols-[minmax(18rem,1fr)_minmax(0,25rem)]")}>
        <div className="min-w-0">
          <p className={cn("flex items-center gap-1.5 text-caption", fresh ? "text-brand-periwinkle" : "text-muted-foreground")}>
            {finished && (
              <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
                <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
              </span>
            )}
            {label}
          </p>
          <h2 id={titleId} className={cn("font-heading", phone ? "mt-1 text-display" : "mt-1.5 text-[2rem] leading-[1.1] tracking-[-0.02em]")}>
            Hello Anchor
          </h2>
          <p className={cn("font-read text-muted-foreground", phone ? "mt-1.5 text-[0.9375rem]/[1.45]" : "mt-2 max-w-[42ch] text-body")}>{line}</p>

          {started ? (
            <div className={cn("flex items-center gap-3", phone ? "mt-4" : "mt-4 max-w-xs")}>
              <ObjectiveMeter value={done / STEPS.length} className="h-1 w-auto flex-1" />
              <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                {done} of {STEPS.length}
              </span>
            </div>
          ) : (
            !finished && <p className="mt-3 text-caption text-muted-foreground tabular-nums">10 min · {STEPS.length} steps · Beginner · Anchor</p>
          )}

          <div className={cn("flex gap-2", phone ? "mt-5 flex-col" : "mt-6 flex-wrap")}>
            {finished ? (
              <>
                {/* Only Hello Anchor runs in this prototype, so the next one says so, as the gallery's cards do */}
                <BrandButton variant="accent" className={button} onClick={() => toast("Only Hello Anchor is in this prototype")}>
                  Start {NEXT_TUTORIAL.name}
                </BrandButton>
                <Button variant="secondary" className={button} onClick={() => dispatch({ type: "open", screen: "overview" })}>
                  Open again
                </Button>
              </>
            ) : (
              <BrandButton variant="accent" className={button} onClick={() => dispatch(started ? { type: "start" } : { type: "open", screen: "overview" })}>
                {started ? "Continue" : "Start"}
              </BrandButton>
            )}
          </div>
        </div>

        {/* Under the width the two columns need, the words keep the room and the picture steps out */}
        {!phone && (
          <div className="hidden min-w-0 @min-[44rem]:block">
            <StartHereArt fresh={fresh} done={finished} />
          </div>
        )}
      </div>
    </section>
  )
}
