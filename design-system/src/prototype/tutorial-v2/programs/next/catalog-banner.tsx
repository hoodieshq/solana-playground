import { Clock } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { CATALOG, programBySlug } from "../data"
import { go, openProgram, usePrograms } from "../store"
import { programCoverIcon } from "./ProgramCover"
import { ProgramVoxels } from "./ProgramVoxels"
import { StandingWord, resumeLabel, standing, useProjectOf } from "./catalog-parts"

/** The program to start with: one you can build, deploy and call. While the build server can't build
 * Native that is the Anchor counter; once it can, memo, called in one press with no setup */
const firstFor = (native: boolean) => (native ? "spl-memo" : "counter")

/** The banner's own short line for the first ones; the rest say their catalog line */
const LINE: Record<string, string> = { counter: "Deploy a counter and count up", "spl-memo": "Send text and read it back" }

/** What the banner offers: the first program, else the next one you can run and haven't finished, in the
 * catalog's order. A finished one never leads it: "Done" over a Start told you nothing to do (Almaz, 25 Nov) */
function useNext(native: boolean) {
  const projects = usePrograms((s) => s.projects)
  const done = (slug: string) => Object.values(projects).some((x) => x.slug === slug && standing(x).done)
  const order = [firstFor(native), ...CATALOG.filter((m) => native || m.kind === "anchor").map((m) => m.slug)]
  return order.find((slug) => !done(slug)) ?? order[0]
}

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

const GO = "start-beam h-10 font-heading text-16 font-act tracking-normal pointer-coarse:h-11"

/** The catalog's top, built as the Tutorials gallery's Start here banner: the words on the left, the
 * mark as a voxel sculpture beside them, here telling a deploy. Under 640px wide the sculpture hangs
 * from the top right corner and the words run under it */
export function ProgramBanner({ phone = false }: { phone?: boolean }) {
  const native = usePrograms((s) => s.native)
  const slug = useNext(native)
  const p = programBySlug(slug)!
  const project = useProjectOf(slug)
  // Under way says where it stands; done (every one finished) says nothing, the minutes alone
  const st = project && !standing(project).done ? standing(project) : null
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
      // 48 under it, the gap between the page's sections, so Your projects starts as Solana examples does (Almaz, 25 Nov)
      className="relative isolate mb-12 overflow-hidden rounded-card border border-border"
    >
      <style>{BEAM_CSS}</style>
      <ProgramVoxels corner={!wide} icon={programCoverIcon(slug)} />
      <div className={cn("relative", phone ? "p-5" : "p-7")}>
        {/* The words keep to where the sculpture has faded out. 20rem: one row at 24 ran into the art, and 22
            balanced two short halves; here the line breaks once, long first, with no word left alone (Almaz, 25 Nov) */}
        <div className="max-w-[20rem] min-w-0">
          {/* Three faces and no more, a clear step apart: the line over the name at 13, the name at 36 (28 on the phone), the
              words at 16, all small text muted so the name leads (the minutes too: no colour, Almaz 25 Nov). The
              gaps are set by what the eye sees, not by the boxes: the 28's and the 16's line heights already add
              air, so 6 over and under the name and 20 to the button read as an even 16, 16, 24 (Almaz, 25 Nov,
              after Claude's plugin banner). The page's own title above it is 20, so the banner leads (Almaz, 25 Nov). One row, so the dot and the minutes sit on the state's line */}
          <p className="flex items-center gap-1.5 text-13 leading-5 text-muted-foreground tabular-nums">
            {/* No "Start here": the button says it (Almaz, 20 Nov) */}
            {st && <StandingWord s={st} className="text-muted-foreground" />}
            {st && <span aria-hidden="true">·</span>}
            {/* The clock as on the cards' minutes (Almaz, 25 Nov) */}
            <Clock aria-hidden="true" className="size-3.5" />
            <span>{`${p.minutes} min`}</span>
          </p>
          <h2 id={titleId} className={cn("mt-1.5 font-heading font-normal tracking-tight text-foreground", phone ? "text-28 leading-8" : "text-36 leading-10")}>
            {/* A heading, so the name takes a capital and words, not the slug's hyphens ("Create account"); the
                cards keep the program's own name */}
            {(p.name.charAt(0).toUpperCase() + p.name.slice(1)).replace(/-/g, " ").replace(/\bsol\b/, "SOL")}
          </h2>
          <p className="mt-1.5 text-pretty text-16 leading-6 text-muted-foreground">
            {LINE[slug] ?? p.description}
          </p>
          {/* On the phone the button takes the card's width, a thumb's 48, as the Tutorials banner sets it; an
              upright tablet keeps it to 240 */}
          <div className={cn("mt-5", phone && "[&>button]:h-12 [&>button]:w-full [html.portrait_&>button]:w-auto [html.portrait_&>button]:min-w-60")}>
            {project ? (
              <BrandButton className={GO} onClick={() => go({ at: "project", id: project.id })}>
                {resumeLabel(project)}
                <BrandButtonIcon />
              </BrandButton>
            ) : (
              <BrandButton className={GO} onClick={() => openProgram(slug)}>
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
