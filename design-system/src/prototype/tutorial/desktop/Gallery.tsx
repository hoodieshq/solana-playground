import { useState } from "react"
import { Boxes, Check, Play, Search, X } from "lucide-react"

import { BrandButton, brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { CATALOG, FINISHED_PROGRAM, HERO, byLevel, filterCatalog, resultsLine, type FrameworkFilter } from "../ui/catalog"
import { highlight } from "../ui/CodeView"
import { CARD, FrameworkChips, LevelHeader, TutorialTile } from "../ui/GalleryParts"
import { StartOverDialog } from "../ui/StartOverDialog"
import { Thumb } from "../ui/Thumb"

/** For someone who hasn't started: the tutorial to begin with, and beside it the program it ends
 * with, so what you'll build is on the page before you start. Once finished it says so, and offers
 * to go again */
function StartHere() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const finished = s.finishedAt !== null
  return (
    <section aria-labelledby="hero-title" className="mt-8">
      <h2 id="hero-title" className="mb-2 text-caption text-muted-foreground">
        Start here
      </h2>
      <div className="grid overflow-hidden rounded-card border border-border bg-surface-panel lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col p-5">
          {/* The name opens the tutorial page, the button goes straight into step 1 */}
          <button
            type="button"
            onClick={() => dispatch({ type: "open", screen: "overview" })}
            className="-m-2 flex items-start gap-4 rounded-control p-2 text-left transition-colors duration-150 ease-standard hover:bg-surface motion-reduce:transition-none"
          >
            <Thumb src={thumb(HERO.slug, "jpg")} className="size-16" />
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-[1.375rem] leading-tight">{HERO.name}</span>
              <span className="mt-1 block text-[0.9375rem]/[1.5] text-muted-foreground">{HERO.line}</span>
              {finished ? (
                <span className="mt-2 flex items-center gap-1.5 text-caption text-muted-foreground tabular-nums">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="text-success">Completed</span> · {STEPS.length} steps
                  </span>
                </span>
              ) : (
                <span className="mt-2 block text-caption text-muted-foreground tabular-nums">{HERO.meta}</span>
              )}
            </span>
          </button>
          <div className="mt-auto pt-6">
            {finished ? (
              <Button variant="secondary" className="h-10 px-5" onClick={() => setConfirm(true)}>
                Start again
              </Button>
            ) : (
              <BrandButton variant="accent" className="h-10 px-6" onClick={() => dispatch({ type: "start" })}>
                Start
              </BrandButton>
            )}
          </div>
        </div>
        {/* The finished program, the one the overview shows too. A picture of the goal, not an editor:
            no line numbers, no caret, and it fades out rather than scrolling */}
        <figure aria-label="The program you'll build, src/lib.rs" className="relative hidden max-h-64 border-l border-border bg-surface-well lg:block">
          <figcaption className="px-4 pt-3 font-mono text-[0.75rem] text-muted-foreground">src/lib.rs</figcaption>
          <pre className="overflow-hidden px-4 pt-2 pb-4 font-mono text-code text-syntax-plain [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
            {FINISHED_PROGRAM.split("\n").map((line, i) => (
              <div key={i} className="min-h-[1lh] whitespace-pre">
                {highlight(line)}
              </div>
            ))}
          </pre>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface-well to-transparent" />
        </figure>
      </div>
      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </section>
  )
}

function ResumeCard() {
  const { s, dispatch } = useStore()
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const next = first === -1 ? STEPS.length - 1 : first
  return (
    <section aria-labelledby="resume-title" className="mt-8">
      <h2 id="resume-title" className="mb-2 text-caption text-muted-foreground">
        Pick up where you left off
      </h2>
      {/* The whole card resumes the tutorial. The ring is the screen's one accent. Kept narrow, so it reads as a card, not a banner */}
      <button
        type="button"
        onClick={() => dispatch({ type: "start" })}
        aria-label={`Continue Hello Anchor: ${STEPS[next].objective}`}
        className={cn(CARD, "max-w-[38rem] items-center active:scale-[0.99]")}
      >
        <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title">Hello Anchor</span>
          <span className="mt-0.5 block truncate text-caption text-muted-foreground">Next: {STEPS[next].objective}</span>
          <span className="mt-2 flex items-center gap-2">
            <ObjectiveMeter value={done / STEPS.length} className="h-1 w-48" />
            <span className="text-caption text-muted-foreground tabular-nums">
              {done} of {STEPS.length}
            </span>
          </span>
        </span>
        <span aria-hidden="true" className={cn(brandButtonVariants({ variant: "ring", size: "icon" }), "size-11")}>
          <Play className="size-4 fill-current" />
        </span>
      </button>
    </section>
  )
}

type Tab = "tutorials" | "programs"

export function Gallery() {
  const { s } = useStore()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>("tutorials")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  const started = s.startedAt !== null && s.finishedAt === null

  // Both are on screen here, so the search reads within the chosen framework
  const list = filterCatalog(query, framework)
  const groups = byLevel(list)
  const q = query.trim()

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[68rem] px-10 pt-10 pb-16">
        <h1 className="font-heading text-display">What do you want to build?</h1>

        {started ? <ResumeCard /> : <StartHere />}

        {/* There's room for the field, so search is always open here, with no unfolding. The chips
            sit by it, as one way of narrowing the list */}
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Segmented value={tab} onValueChange={(v) => setTab(v as Tab)} aria-label="Show" className="pill h-10! rounded-full! border-0! p-0!">
            <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
              Tutorials
            </SegmentedItem>
            <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
              Programs
            </SegmentedItem>
          </Segmented>
          {tab === "tutorials" && (
            <div className="ml-auto flex items-center gap-3">
              <FrameworkChips value={framework} onChange={setFramework} />
              <label className="relative h-10 w-64 rounded-full border border-border bg-surface-panel transition-colors focus-within:border-border-strong">
                {/* The empty field's hint sits a step under the interface's own grey text, at 80%: 4.9:1, still above
                    AA. 70% would drop to 4.1 */}
                <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
                {/* The composer's size and weight, in line with the tabs, the same as the phone's search */}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                  placeholder={`Search ${CATALOG.length} tutorials`}
                  aria-label="Search tutorials"
                  className="size-full rounded-full bg-transparent pr-9 pl-10 text-[0.9375rem] font-[350] outline-none placeholder:text-muted-foreground/80"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute top-0 right-0 flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </label>
            </div>
          )}
        </div>

        {tab === "programs" ? (
          <Empty className="mt-16 gap-5 border-0 p-0">
            <EmptyHeader className="gap-3">
              <EmptyMedia variant="icon" className="mb-1 size-12! rounded-panel! bg-surface-raised! text-muted-foreground! [&_svg]:size-6!">
                <Boxes strokeWidth={1.75} />
              </EmptyMedia>
              <EmptyTitle className="font-heading text-title! font-[440]! tracking-normal!">Programs aren't in this prototype</EmptyTitle>
              <EmptyDescription className="max-w-[36ch] text-caption! leading-relaxed">
                This take covers the tutorial flow. The 34 programs come in a later pass.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-10 px-5" onClick={() => setTab("tutorials")}>
                Back to tutorials
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {(q || list.length === 0) && (
              <p role="status" className="mt-4 text-caption text-muted-foreground">
                {resultsLine(list.length, query, framework)}
              </p>
            )}
            {groups.map((g) => (
              <section key={g.level} aria-labelledby={`level-${g.level}`} className="mt-8">
                <LevelHeader id={`level-${g.level}`} level={g.level} count={g.items.length} className="mb-3" />
                {/* Cards in a row share its height, so the grid reads as even rows */}
                <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {g.items.map((t) => (
                    <li key={t.slug} className="flex">
                      <TutorialTile t={t} className="h-full active:scale-[0.99]" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
