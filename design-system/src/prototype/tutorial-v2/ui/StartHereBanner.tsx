import { useEffect, useId, useRef, useState, type ComponentProps } from "react"
import { ArrowRight, Clock } from "lucide-react"

import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { cardOf, useFeatured, useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { CATALOG, upstreamName } from "./catalog"
import { IsoVoxels } from "./IsoVoxels"
import { tutorialIcon } from "./TutorialCover"

/** What the banner says in each state, the same on every size */
function useBanner() {
  const slug = useFeatured()
  const lesson = LESSONS[slug]
  const STEPS = lesson.steps
  const p = useProgress(slug)
  const openTutorial = useOpenTutorial()
  const finished = p.finished
  const started = p.started && !finished
  const fresh = !started && !finished
  const first = STEPS.findIndex((_, i) => !p.passed[i])

  // The step alone, never "Continue" before it: the button says that (Almaz, 25 Nov)
  const label = finished ? "Done" : started ? `Step ${Math.min(STEPS.length, (first === -1 ? STEPS.length - 1 : first) + 1)} of ${STEPS.length}` : "Start here"
  const line = finished
    ? lesson.headline.replace(/\.$/, "")
    : started
      ? first === -1
        ? "Every step passed. One more tap to finish"
        : `Next: ${STEPS[first].objective}`
      : lesson.line

  // The tutorial opens on its conversation: the intro card, or scrolled to the live card
  const open = () => openTutorial(slug)
  const go = open
  // The one after it on the ladder; one the prototype doesn't run says so, as the gallery's cards do
  const nextCard = lesson.next ? cardOf(lesson.next) : null
  const next = () => lesson.next && openTutorial(lesson.next)
  // The art is the icon of the tutorial the banner is about, finished too: under "Completed · Hello
  // Anchor" the next one's mark read as the wrong picture (Almaz, 10 Nov)
  const shown = CATALOG.find((t) => t.slug === slug)
  const icon = tutorialIcon(shown ? upstreamName(shown) : lesson.card.name)
  return { lesson, nextCard, finished, started, fresh, label, line, open, go, next, icon }
}

/** The second action beside the main button: words and an arrow, no box. Its box is a button's
 * height, and the padding it hits with is pulled back out so the words line up with the gap */
function QuietAction({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/quiet -mx-2 flex h-10 shrink-0 items-center gap-1 rounded-control px-2 text-13 leading-5 whitespace-nowrap text-muted-foreground outline-none transition-colors duration-150 ease-standard hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none pointer-coarse:h-11",
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

/* The product's Start: the brand's ring, its word alone at even padding. Under the pointer it
   doesn't fill: a beam of light runs once round the ring instead. Pressed, it fills as every brand
   action does. The beam's angle is registered so it can animate, as client-v2's StartHere does */
const BEAM_CSS = `
@property --start-beam { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.start-beam::after {
  content: ""; position: absolute; inset: -1px; padding: 1.5px; border-radius: inherit; pointer-events: none; opacity: 0;
  background: conic-gradient(from var(--start-beam), transparent 0deg 230deg, #9945ff 280deg, #ffffff 330deg, #14f195 345deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
}
.start-beam:hover:not(:disabled):not(:active)::before { opacity: 0; }
.start-beam:hover:not(:disabled)::after, .start-beam:focus-visible::after { animation: start-beam 1200ms cubic-bezier(0.45, 0, 0.2, 1) both; }
@keyframes start-beam { from { --start-beam: 0deg; opacity: 1; } 80% { opacity: 1; } to { --start-beam: 360deg; opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .start-beam::after { display: none; }
  .start-beam:hover:not(:disabled):not(:active)::before { opacity: 1; }
}`

const GO = "start-beam h-10 font-heading text-16 font-act tracking-normal pointer-coarse:h-11"

/** The banner's width, in px, from which the sculpture stands beside the words */
const WIDE_MIN = 640

/** The desktop banner, as client-v2's tutorials page has it (views/flow/gallery/StartHere.tsx): the
 * words on the left, the mark as a voxel sculpture beside them. Under 640px wide the sculpture hangs
 * from the top right corner and the words run under it */
function DesktopBanner({ phone = false }: { phone?: boolean }) {
  const b = useBanner()
  const titleId = useId()
  const box = useRef<HTMLElement>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= WIDE_MIN))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section
      ref={box}
      aria-labelledby={titleId}
      // The cards' own line: purple is for what is current, and a banner is not that. A soft light of
      // it from the corner the sculpture sits in
      style={{ background: "radial-gradient(120% 140% at 100% 0%, #9945ff24, transparent 62%), var(--surface-panel)" }}
      // A press anywhere on it opens the tutorial it's about, as a card under it does: only its buttons
      // did, and a tap on the picture or the words did nothing (Almaz, 10 Nov). Its buttons keep their own
      // action (Start the next one); a keyboard reaches the same through them
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return
        if (b.finished) b.open()
        else b.go()
      }}
      className="relative isolate mb-4 cursor-pointer overflow-hidden rounded-card border border-border"
    >
      <style>{BEAM_CSS}</style>
      <IsoVoxels corner={!wide} icon={b.icon} />
      <div className={cn("relative", phone ? "p-5" : "p-7")}>
        {/* As the Programs banner (Almaz, 25 Nov): a 20rem column, the line breaking once, long first; three
            faces, the line over the name at 13 and the words at 16 both muted, the name at 28 (20 on the phone,
            where the page's title is 28); 6 over and under the name and 20 to the button read as an even rhythm */}
        <div className="max-w-[20rem] min-w-0">
          <p className="flex items-center gap-1.5 text-13 leading-5 text-muted-foreground tabular-nums">
            {/* Fresh: how long it takes, with the clock the cards use; under way: the step; done: Done in green.
                No "Start here": the button says it (Almaz, 20 Nov) */}
            {b.fresh ? (
              <>
                <Clock aria-hidden="true" className="size-3.5" />
                {`${b.lesson.minutes} min`}
              </>
            ) : (
              <span className={cn(b.finished && "text-success")}>{b.label}</span>
            )}
          </p>
          <h2 id={titleId} className={cn("mt-1.5 font-heading font-normal tracking-tight text-foreground", phone ? "text-20 leading-6" : "text-28 leading-8")}>
            {b.lesson.card.name}
          </h2>
          <p className={cn("text-pretty text-muted-foreground", phone ? "mt-1 text-13 leading-5" : "mt-1.5 text-16 leading-6")}>{b.line}</p>
          {/* No progress bar under the words: "Step 1 of 4" over the name says it (Almaz, 25 Nov) */}
          {/* On the phone the main button takes the card's width, a thumb's 48, as every phone call to action
              does. Only the main one: Open again stretched to a 48 row left a blank band under its words */}
          <div className={cn("mt-5 flex flex-wrap items-center gap-x-4 gap-y-2", phone && "[&>button:first-child]:h-12 [&>button:first-child]:w-full [html.portrait_&>button:first-child]:w-auto [html.portrait_&>button:first-child]:min-w-60")}>
            {b.finished ? (
              <>
                {b.nextCard && (
                  <BrandButton className={GO} onClick={b.next}>
                    Start {b.nextCard.name}
                    <BrandButtonIcon />
                  </BrandButton>
                )}
                {/* Its 44 for the thumb reaches below the words: given back, so the card's foot is as deep as its head */}
                <QuietAction onClick={b.open} className={cn(phone && "-mb-3")}>
                  Open again
                </QuietAction>
              </>
            ) : (
              <BrandButton className={GO} onClick={b.go}>
                {b.started ? "Continue" : "Start"}
                <BrandButtonIcon />
              </BrandButton>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** The gallery's top: the tutorial a new developer begins with, in three states. Fresh, it invites
 * and opens the tutorial's page. Started, it picks up at the first step not yet passed. Finished, it
 * says so and points on to the next tutorial */
export function StartHereBanner({ layout }: { layout: "phone" | "desktop" }) {
  // The phone draws the product's banner too, a little tighter
  return <DesktopBanner phone={layout === "phone"} />
}
