import { useEffect, useId, useRef, useState, type ComponentProps } from "react"
import { ArrowRight, Check } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { cardOf, useFeatured, useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { IsoVoxels } from "./IsoVoxels"

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
  const done = p.passed.filter(Boolean).length
  const first = STEPS.findIndex((_, i) => !p.passed[i])

  const label = finished ? "Completed" : started ? `Continue · Step ${Math.min(STEPS.length, (first === -1 ? STEPS.length - 1 : first) + 1)} of ${STEPS.length}` : "Start here"
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
  return { lesson, steps: STEPS.length, nextCard, finished, started, fresh, done, label, line, open, go, next }
}

/** The second action beside the main button: words and an arrow, no box. Its box is a button's
 * height, and the padding it hits with is pulled back out so the words line up with the gap */
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

const GO = "start-beam h-10 px-5! font-heading text-[0.9375rem] font-medium tracking-[-0.005em] pointer-coarse:h-11"

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
      className="relative isolate mb-4 overflow-hidden rounded-card border border-border"
    >
      <style>{BEAM_CSS}</style>
      <IsoVoxels corner={!wide} />
      <div className={cn("relative", phone ? "p-5" : "p-7")}>
        {/* The words keep to where the sculpture has faded out, about the left 42% of a wide banner */}
        <div className="max-w-[19rem] min-w-0">
          <p className={cn("flex items-center gap-1.5 text-[0.8125rem]", b.fresh ? "text-brand-periwinkle" : "text-muted-foreground")}>
            {b.finished && (
              <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                <Check strokeWidth={2.5} className="size-2.5" />
              </span>
            )}
            {b.label}
          </p>
          <h2 id={titleId} className="mt-1.5 font-heading text-[1.5rem] font-normal tracking-[-0.015em] text-foreground">
            {b.lesson.card.name}
          </h2>
          <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-[1.35] text-balance text-foreground/78">{b.line}</p>
          {b.started ? (
            <div className="mt-3 flex max-w-xs items-center gap-3">
              <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-border">
                <span
                  className="block h-full bg-[linear-gradient(90deg,#9945ff,#14f195)] transition-[width] duration-400 ease-[cubic-bezier(0.2,0,0,1)]"
                  style={{ width: `${(b.done / b.steps) * 100}%` }}
                />
              </span>
              <span className="text-[0.75rem] leading-4 font-[380] text-muted-foreground/80 tabular-nums">
                {b.done} of {b.steps}
              </span>
            </div>
          ) : (
            !b.finished && (
              <p className="mt-3 text-[0.75rem] leading-4 font-[380] text-muted-foreground/80 tabular-nums">
                {/* The phone's column takes the facts that decide a start; the framework and the author are on the card below */}
                {phone
                  ? `${b.lesson.card.level} · ${b.steps} steps · ${b.lesson.minutes} min`
                  : `${b.lesson.minutes} min · ${b.steps} steps · ${b.lesson.card.level} · ${b.lesson.card.framework} · by ${b.lesson.by}`}
              </p>
            )
          )}
          {/* On the phone the main button takes the card's width, a thumb's 48, as every phone call to action
              does. Only the main one: Open again stretched to a 48 row left a blank band under its words */}
          <div className={cn("mt-6 flex flex-wrap items-center gap-x-4 gap-y-2", phone && "[&>button:first-child]:h-12 [&>button:first-child]:w-full")}>
            {b.finished ? (
              <>
                {b.nextCard && (
                  <BrandButton className={GO} onClick={b.next}>
                    Start {b.nextCard.name}
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
