import { useEffect, useRef, useState } from "react"
import { Boxes, Check, Play, Search, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton, brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { CATALOG, HERO, byLevel, filterCatalog, resultsLine, type FrameworkFilter } from "../ui/catalog"
import { CARD, FrameworkChips, LevelHeader, TutorialTile } from "../ui/GalleryParts"
import { StartOverDialog } from "../ui/StartOverDialog"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

// The product's main curve and the thumb's time, from the design system's motion tokens
const MOTION = "duration-220 ease-standard motion-reduce:transition-none"

function ResumeCard() {
  const { s, dispatch } = useStore()
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const next = first === -1 ? STEPS.length - 1 : first
  return (
    <section aria-labelledby="resume-title" className="pt-4">
      <h2 id="resume-title" className="mb-2 text-caption text-muted-foreground">
        Pick up where you left off
      </h2>
      {/* The whole card resumes the tutorial. The ring is the screen's one accent and shows where to tap */}
      <button
        type="button"
        onClick={() => dispatch({ type: "start" })}
        aria-label={`Continue Hello Anchor: ${STEPS[next].objective}`}
        className={cn(CARD, "items-center")}
      >
        <Thumb src={thumb("hello-anchor", "jpg")} className="size-[56px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title">Hello Anchor</span>
          <span className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">Next: {STEPS[next].objective}</span>
          <span className="mt-2 flex items-center gap-2">
            <ObjectiveMeter value={done / STEPS.length} className="h-1 flex-1" />
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

/** For someone who hasn't started: the one tutorial to begin with. The card reads about it, Start
 * goes straight into step 1. Once finished it says so, and offers to go again */
function StartHere() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const finished = s.finishedAt !== null
  return (
    <section aria-labelledby="hero-title" className="pt-4">
      <h2 id="hero-title" className="mb-2 text-caption text-muted-foreground">
        Start here
      </h2>
      <div className="rounded-card border border-border bg-surface-panel">
        {/* Two targets side by side, never one inside the other: the card opens the tutorial page */}
        <button
          type="button"
          onClick={() => dispatch({ type: "open", screen: "overview" })}
          className="flex w-full items-start gap-3 rounded-t-card p-3 pb-2 text-left transition-colors duration-150 ease-standard active:bg-surface motion-reduce:transition-none"
        >
          <Thumb src={thumb(HERO.slug, "jpg")} className="size-[56px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-title">{HERO.name}</span>
            <span className="mt-0.5 block text-caption text-muted-foreground">{HERO.line}</span>
            {/* Done, it says so in the line under, with the check the list shows, so the text keeps the
                card's width on a small phone */}
            {finished ? (
              <span className="mt-1.5 flex items-center gap-1.5 text-caption text-muted-foreground tabular-nums">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check strokeWidth={2.5} className="size-3" aria-hidden="true" />
                </span>
                <span>
                  <span className="text-success">Completed</span> · {STEPS.length} steps
                </span>
              </span>
            ) : (
              <span className="mt-1.5 block text-caption text-muted-foreground tabular-nums">{HERO.meta}</span>
            )}
          </span>
        </button>
        <div className="px-3 pt-1 pb-3">
          {finished ? (
            <Button variant="secondary" className="h-12 w-full" onClick={() => setConfirm(true)}>
              Start again
            </Button>
          ) : (
            <BrandButton variant="accent" className="h-12 w-full" onClick={() => dispatch({ type: "start" })}>
              Start
            </BrandButton>
          )}
        </div>
      </div>
      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </section>
  )
}

/** Framework chips and search share one row, under the tabs. The search button grows into the
 * field while the chips slide out, and Cancel plays it back. The chips scroll sideways when there
 * isn't room, which a 320px screen with a large font needs */
function ChipsAndSearch({
  framework,
  onFramework,
  searching,
  query,
  onOpen,
  onQuery,
  onClose,
}: {
  framework: FrameworkFilter
  onFramework: (f: FrameworkFilter) => void
  searching: boolean
  query: string
  onOpen: () => void
  onQuery: (q: string) => void
  onClose: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const row = useRef<HTMLDivElement>(null)
  // Fades the chips at the right edge only while some are cut off there
  const [more, setMore] = useState(false)
  useEffect(() => {
    const el = row.current
    if (!el) return
    const check = () => setMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 1)
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [])

  const open = () => {
    onOpen()
    // Focus inside the tap itself, or a phone won't raise its keyboard
    input.current?.focus()
  }

  return (
    <div className="relative mt-2 h-11">
      <div
        ref={row}
        aria-hidden={searching}
        className={cn(
          "absolute inset-y-0 left-0 right-13 flex items-center overflow-x-auto [scrollbar-width:none] transition-[opacity,transform] [&::-webkit-scrollbar]:hidden",
          MOTION,
          more && "[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]",
          searching && "pointer-events-none -translate-x-4 opacity-0"
        )}
      >
        <FrameworkChips phone value={framework} onChange={onFramework} className="pr-2" />
      </div>

      <div className={cn("absolute inset-y-0 right-0 flex items-center transition-[width]", MOTION, searching ? "w-full" : "w-11")}>
        <label
          className={cn(
            // overflow-hidden: folded to 44px, the field's own 80px of padding would stick out and let the list pan sideways
            "relative h-11 min-w-0 flex-1 overflow-hidden rounded-full border transition-colors",
            MOTION,
            searching ? "border-border-strong bg-surface" : "border-border bg-surface-panel"
          )}
        >
          {/* A lighter line than lucide's 2, to match the field's light type */}
          {/* The empty field's hint sits a step under the interface's own grey text, at 80%: 4.9:1, still above
              AA. 70% would drop to 4.1 */}
          <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
          <input
            ref={input}
            value={query}
            tabIndex={searching ? undefined : -1}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose()
              if (e.key === "Enter") e.currentTarget.blur()
            }}
            // Search covers every tutorial: the chips it hides don't narrow it unseen
            placeholder={`Search ${CATALOG.length} tutorials`}
            aria-label="Search tutorials"
            className={cn(
              "size-full rounded-full bg-transparent pr-10 pl-10 text-[0.9375rem] font-[350] outline-none placeholder:text-muted-foreground/80 transition-opacity",
              MOTION,
              searching ? "opacity-100" : "opacity-0"
            )}
          />
          {searching && query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQuery("")
                input.current?.focus()
              }}
              className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          {/* Folded, the whole pill is the button that opens search */}
          {!searching && <button type="button" aria-label="Search tutorials" onClick={open} className="absolute inset-0 rounded-full" />}
        </label>
        <button
          type="button"
          tabIndex={searching ? undefined : -1}
          onClick={onClose}
          className={cn(
            "h-11 overflow-hidden text-control! whitespace-nowrap text-muted-foreground active:text-foreground transition-[max-width,opacity,padding,color]",
            MOTION,
            searching ? "max-w-20 pl-3 opacity-100" : "max-w-0 pl-0 opacity-0"
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

type Tab = "tutorials" | "programs"

export function Gallery() {
  const { s } = useStore()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<Tab>("tutorials")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  const started = s.startedAt !== null && s.finishedAt === null

  // While searching the chips are out of sight, so the search reads every tutorial
  const list = filterCatalog(searching ? query : "", searching ? "all" : framework)
  const groups = byLevel(list)

  const closeSearch = () => {
    setQuery("")
    setSearching(false)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar
        title="What do you want to build?"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            <X className="size-5" />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+24px)]">
        {/* While searching the top card folds away, so results start right under the field */}
        <div className={cn("grid transition-[grid-template-rows,opacity]", MOTION, searching ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
          <div className="min-h-0 overflow-hidden" inert={searching}>
            {started ? <ResumeCard /> : <StartHere />}
          </div>
        </div>

        <div className="mt-4 flex h-11 items-center">
          <Segmented
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab)
              closeSearch()
            }}
            aria-label="Show"
            className="pill h-11! rounded-full! border-0! p-0!"
          >
            <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
              Tutorials
            </SegmentedItem>
            <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
              Programs
            </SegmentedItem>
          </Segmented>
        </div>

        {tab === "programs" ? (
          // The tab switches for real, so the flow reads as a product. What's behind it isn't in this cut
          // Empty's title and text come from stock shadcn (14px, tight tracking), so they take Playground's scale here
          <Empty className="mt-12 gap-5 border-0 p-0">
            <EmptyHeader className="gap-3">
              <EmptyMedia variant="icon" className="mb-1 size-12! rounded-panel! bg-surface-raised! text-muted-foreground! [&_svg]:size-6!">
                <Boxes strokeWidth={1.75} />
              </EmptyMedia>
              <EmptyTitle className="font-heading text-title! font-[440]! tracking-normal!">Programs aren't in this prototype</EmptyTitle>
              <EmptyDescription className="max-w-[30ch] text-caption! leading-relaxed">
                This take covers tutorials on a phone. The 34 programs come in a later pass.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-11 px-5" onClick={() => setTab("tutorials")}>
                Back to tutorials
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <ChipsAndSearch
              framework={framework}
              onFramework={setFramework}
              searching={searching}
              query={query}
              onOpen={() => setSearching(true)}
              onQuery={setQuery}
              onClose={closeSearch}
            />

            {searching && query.trim() && (
              <p role="status" className="mt-3 text-caption text-muted-foreground">
                {resultsLine(list.length, query, "all")}
              </p>
            )}

            {groups.map((g) => (
              <section key={g.level} aria-labelledby={`level-${g.level}`} className="mt-5">
                <LevelHeader id={`level-${g.level}`} level={g.level} count={g.items.length} className="mb-2" />
                <ul className="flex flex-col gap-2">
                  {g.items.map((t) => (
                    <li key={t.slug}>
                      <TutorialTile t={t} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
      {/* The list runs to the bottom edge, so it fades out under the home indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom)+24px)] bg-linear-to-t from-surface-base to-transparent"
      />
    </div>
  )
}
