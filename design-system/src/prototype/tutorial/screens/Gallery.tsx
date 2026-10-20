import { useRef, useState } from "react"
import { Boxes, Play, Search, X } from "lucide-react"
import { toast } from "sonner"

import { brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

// The product's main curve and the thumb's time, from the design system's motion tokens
const MOTION = "duration-220 ease-standard motion-reduce:transition-none"

const CARD =
  "flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"

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
        className={CARD}
      >
        <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
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

/** The tabs and search share one row. The search button grows into the field
 * while the tabs slide out, and Cancel plays it back */
type Tab = "tutorials" | "programs"

function TabsAndSearch({
  tab,
  onTab,
  searching,
  query,
  onOpen,
  onQuery,
  onClose,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  searching: boolean
  query: string
  onOpen: () => void
  onQuery: (q: string) => void
  onClose: () => void
}) {
  const input = useRef<HTMLInputElement>(null)

  const open = () => {
    onOpen()
    // Focus inside the tap itself, or a phone won't raise its keyboard
    input.current?.focus()
  }

  return (
    <div className="relative mt-4 h-11">
      <div
        aria-hidden={searching}
        className={cn("absolute inset-y-0 left-0 flex items-center transition-[opacity,transform]", MOTION, searching && "pointer-events-none -translate-x-4 opacity-0")}
      >
        <Segmented
          value={tab}
          onValueChange={(v) => onTab(v as Tab)}
          aria-label="Show"
          className="pill h-11! rounded-full! border-0! p-0!"
        >
          <SegmentedItem value="tutorials" tabIndex={searching ? -1 : undefined} className="rounded-full! px-4! text-control!">
            Tutorials
          </SegmentedItem>
          <SegmentedItem value="programs" tabIndex={searching ? -1 : undefined} className="rounded-full! px-4! text-control!">
            Programs
          </SegmentedItem>
        </Segmented>
      </div>

      <div className={cn("absolute inset-y-0 right-0 flex items-center transition-[width]", MOTION, searching ? "w-full" : "w-11")}>
        <label
          className={cn(
            "relative h-11 min-w-0 flex-1 rounded-full border transition-colors",
            MOTION,
            searching ? "border-border-strong bg-surface" : "border-border bg-surface-panel"
          )}
        >
          {/* A lighter line than lucide's 2, to match the field's light type */}
          <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={input}
            value={query}
            tabIndex={searching ? undefined : -1}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose()
              if (e.key === "Enter") e.currentTarget.blur()
            }}
            placeholder={tab === "programs" ? "Search 34 programs" : `Search ${TUTORIALS.length} tutorials`}
            aria-label={`Search ${tab}`}
            className={cn(
              "size-full rounded-full bg-transparent pr-10 pl-10 text-body outline-none placeholder:text-muted-foreground transition-opacity",
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
          {!searching && <button type="button" aria-label={`Search ${tab}`} onClick={open} className="absolute inset-0 rounded-full" />}
        </label>
        <button
          type="button"
          tabIndex={searching ? undefined : -1}
          onClick={onClose}
          className={cn(
            "h-11 overflow-hidden text-control whitespace-nowrap text-muted-foreground active:text-foreground transition-[max-width,opacity,padding,color]",
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

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<Tab>("tutorials")
  const started = s.startedAt !== null && s.finishedAt === null

  const q = query.trim().toLowerCase()
  const list = TUTORIALS.filter((t) => [t.name, t.level, t.framework].some((field) => field.toLowerCase().includes(q)))

  const closeSearch = () => {
    setQuery("")
    setSearching(false)
  }

  const open = (slug: string) =>
    slug === "hello-anchor" ? dispatch({ type: "open", screen: "overview" }) : toast("Only Hello Anchor is in this prototype")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="What do you want to build?"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            <X />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {started && (
          // While searching the resume card folds away, so results start right under the field
          <div className={cn("grid transition-[grid-template-rows,opacity]", MOTION, searching ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
            <div className="min-h-0 overflow-hidden" inert={searching}>
              <ResumeCard />
            </div>
          </div>
        )}

        <TabsAndSearch tab={tab} onTab={setTab} searching={searching} query={query} onOpen={() => setSearching(true)} onQuery={setQuery} onClose={closeSearch} />

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
              <Button variant="outline" className="h-11 rounded-full px-5 text-control" onClick={() => setTab("tutorials")}>
                Back to tutorials
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
        {searching && q && (
          <p role="status" className="mt-3 text-caption text-muted-foreground">
            {list.length === 0 ? `No tutorials match “${query.trim()}”` : `${list.length} ${list.length === 1 ? "result" : "results"}`}
          </p>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {list.map((t) => (
            <li key={t.slug}>
              <button type="button" onClick={() => open(t.slug)} className={CARD}>
                <Thumb src={thumb(t.slug, t.ext)} className="size-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-title">{t.name}</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {t.level} · {t.framework}
                    {started && t.slug === "hello-anchor" && " · In progress"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
          </>
        )}
      </div>
    </div>
  )
}
