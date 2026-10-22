import { useId, type ComponentProps } from "react"
import { ArrowRight, Check } from "lucide-react"
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

/* The words' steps, one family for the three lines under the title, ordered by size, weight and
   colour: the label 13px, the title a clear 24px in the headline face, the line 15px in the reading
   weight. The title sits a step under the page's own heading, so the banner never competes with it.
   Sizes in [] so cn keeps them beside a colour. Contrast on the banner's ground, measured where the
   words sit (phone to desktop): periwinkle label 5.9 to 6.4:1, muted label 6.0 to 6.5:1, line 7.6
   to 8.0:1, meta 5.3 to 5.5:1, title 14:1 */
const WORDS = {
  label: "flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem]",
  title: "mt-1.5 font-heading text-[1.5rem] leading-[1.2] tracking-[-0.015em] text-balance text-foreground",
  // Leading of 20px on 15: tight enough to read as one block with the title, open enough for two lines
  line: "mt-2 font-label text-[0.9375rem] leading-5 text-pretty text-foreground/70",
  // The quietest line, the gallery cards' meta: who, how long, how far
  meta: "text-[0.75rem] leading-4 text-foreground/55 tabular-nums",
}

/** The second action beside the main button: words and an arrow, no box, a step under the line
 * above it. Its box is a button's height, 44px on a touch screen, and the padding it hits with is
 * pulled back out so the words line up with the gap like any other item */
function QuietAction({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/quiet -mx-2 flex h-10 shrink-0 items-center gap-1 rounded-control px-2 text-[0.8125rem] leading-5 whitespace-nowrap text-muted-foreground outline-none transition-colors duration-150 ease-standard hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none pointer-coarse:h-11",
        className
      )}
      {...props}
    >
      {children}
      <ArrowRight
        strokeWidth={1.75}
        aria-hidden="true"
        className="size-3.5 transition-transform duration-150 ease-standard group-hover/quiet:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  )
}

function DoneMark() {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
      <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
    </span>
  )
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
  const open = () => dispatch({ type: "open", screen: "overview" })

  return (
    <section
      aria-labelledby={titleId}
      style={GROUND}
      className={cn("@container relative isolate overflow-hidden rounded-card border border-brand-purple/20", phone ? "mt-5" : "mt-8")}
    >
      {/* On a phone the picture's code is too small to read, so only its pixels stay: a corner up
          right, past the longest label and the title, so the words below always sit on the plain
          ground. In the label's own size, so a larger font pushes the corner out with the words,
          and on a narrow phone with a large font there's no room left and it goes without. The
          longest label is 18ch of this face at 13px and the title 16, so 20ch clears both */}
      {phone ? (
        <div aria-hidden="true" className="absolute top-0 right-0 left-[calc(1.25rem+20ch)] h-[4.75rem] text-[0.8125rem]">
          <StartHereSurface layout="corner" />
        </div>
      ) : (
        <StartHereSurface layout="desktop" />
      )}

      {/* The words start level with the picture's top edge, and the buttons follow the words,
          so what's left of the height falls to the bottom instead of between them */}
      <div className={cn("relative", phone ? "p-5" : "grid items-start gap-x-8 gap-y-6 p-8 @min-[44rem]:grid-cols-[minmax(18rem,1fr)_minmax(0,25rem)]")}>
        <div className="min-w-0">
          <p className={cn(WORDS.label, fresh ? "text-brand-periwinkle" : "text-muted-foreground")}>
            {finished && <DoneMark />}
            {label}
          </p>
          <h2 id={titleId} className={WORDS.title}>
            Hello Anchor
          </h2>
          <p className={cn(WORDS.line, !phone && "max-w-[44ch]")}>{line}</p>

          {started ? (
            <div className={cn("mt-3 flex items-center gap-3", !phone && "max-w-xs")}>
              <ObjectiveMeter value={done / STEPS.length} className="h-1 w-auto flex-1" />
              <span className={cn(WORDS.meta, "shrink-0")}>
                {done} of {STEPS.length}
              </span>
            </div>
          ) : (
            !finished && <p className={cn(WORDS.meta, "mt-2")}>10 min · {STEPS.length} steps · Beginner · Anchor</p>
          )}

          <div className={cn("mt-5 flex", phone ? "flex-col gap-2" : "flex-wrap items-center gap-x-4 gap-y-2")}>
            {finished ? (
              <>
                {/* Only Hello Anchor runs in this prototype, so the next one says so, as the gallery's cards do */}
                <BrandButton variant="accent" className={button} onClick={() => toast("Only Hello Anchor is in this prototype")}>
                  Start {NEXT_TUTORIAL.name}
                </BrandButton>
                {/* A phone keeps a full button to aim at with a thumb; elsewhere it's the quiet
                    second action, so the two stay on one line in the tablet frame */}
                {phone ? (
                  <Button variant="secondary" className={button} onClick={open}>
                    Open again
                  </Button>
                ) : (
                  <QuietAction onClick={open}>Open again</QuietAction>
                )}
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
