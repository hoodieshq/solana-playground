import { useEffect, useId, useRef, useState } from "react"

import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { programBySlug } from "../data"
import { go, openProgram, usePrograms } from "../store"
import { programCoverIcon } from "./ProgramCover"
import { ProgramVoxels } from "./ProgramVoxels"
import { StandingWord, resumeLabel, standing, useProjectOf } from "./catalog-parts"

/** The program to start with: one you can build, deploy and call. While the build server can't build
 * Native that is the Anchor counter; once it can, memo, called in one press with no setup */
const firstFor = (native: boolean) => (native ? "spl-memo" : "counter")

/** The banner's width, in px, from which the sculpture stands beside the words, as on the Tutorials banner */
const WIDE_MIN = 640

/* The Tutorials banner's Start, copied rather than imported so the tutorial's file stays its own:
   the brand ring with the word alone, and a beam of light once round it under the pointer */
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

const GO = "start-beam h-10 font-heading text-16 font-act tracking-[-0.005em] pointer-coarse:h-11"

/** The catalog's top, built as the Tutorials gallery's Start here banner: the words on the left, the
 * mark as a voxel sculpture beside them, here telling a deploy. Under 640px wide the sculpture hangs
 * from the top right corner and the words run under it */
export function ProgramBanner({ phone = false }: { phone?: boolean }) {
  const native = usePrograms((s) => s.native)
  const FIRST = firstFor(native)
  const p = programBySlug(FIRST)!
  const project = useProjectOf(FIRST)
  const st = project ? standing(project) : null
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
      // Green, the deploy's colour, from the corner the ring climbs to; the Tutorials banner has purple there
      style={{ background: "radial-gradient(120% 140% at 100% 0%, #14f1951a, transparent 62%), var(--surface-panel)" }}
      className={cn("relative isolate overflow-hidden rounded-card border border-border", phone ? "mb-6" : "mb-8")}
    >
      <style>{BEAM_CSS}</style>
      <ProgramVoxels corner={!wide} icon={programCoverIcon(FIRST)} />
      <div className={cn("relative", phone ? "p-5" : "p-7")}>
        {/* The words keep to where the sculpture has faded out, about the left 42% of a wide banner: 22rem
            holds the line on one row, so the words are three lines at most, as on the Tutorials banner */}
        <div className="max-w-[22rem] min-w-0">
          <p className={cn("flex items-center gap-1.5 text-13", st ? "text-muted-foreground" : "text-brand-periwinkle")}>
            {/* No "Start here": the button says it (Almaz, 20 Nov) */}
            <span className="tabular-nums">
              {st && <StandingWord s={st} className="text-muted-foreground" />}
              {st ? ` · ${p.minutes} min` : `${p.minutes} min`}
            </span>
          </p>
          <h2 id={titleId} className="mt-1.5 font-heading text-20 leading-6 font-normal tracking-[-0.015em] text-foreground">
            {/* A heading, so the name takes a capital here; the cards keep the program's own lowercase */}
            {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
          </h2>
          <p className="mt-2 max-w-[44ch] text-16 leading-[1.35] text-balance text-foreground/78">
            {native ? "Send text and read it back" : "Deploy a counter and count up"}
          </p>
          {/* On the phone the button takes the card's width, a thumb's 48, as the Tutorials banner sets it; an
              upright tablet keeps it to 240 */}
          <div className={cn("mt-6", phone && "[&>button]:h-12 [&>button]:w-full [html.portrait_&>button]:w-auto [html.portrait_&>button]:min-w-60")}>
            {project ? (
              <BrandButton className={GO} onClick={() => go({ at: "project", id: project.id })}>
                {resumeLabel(project)}
                <BrandButtonIcon />
              </BrandButton>
            ) : (
              <BrandButton className={GO} onClick={() => openProgram(FIRST)}>
                Start
                <BrandButtonIcon />
              </BrandButton>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
