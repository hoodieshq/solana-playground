import { useRef, useState } from "react"
import { Boxes, Search, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { filterCatalog, resultsLine, searchHint, type FrameworkFilter } from "../ui/catalog"
import { FilterMenu, LevelSections } from "../ui/GalleryParts"
import { StartHere } from "../ui/StartHereGame"
import { TopBar } from "../ui/TopBar"

// The product's main curve and the thumb's time, from the design system's motion tokens
const MOTION = "duration-220 ease-standard motion-reduce:transition-none"

type Tab = "tutorials" | "programs"

export function Gallery() {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<Tab>("tutorials")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  const input = useRef<HTMLInputElement>(null)

  // The filter keeps narrowing while you search: the field's hint says which one is on
  const list = filterCatalog(searching ? query : "", framework)
  const q = searching ? query.trim() : ""
  // The banner is for browsing. Narrowed to a search or a framework, the list comes first
  const browsing = tab === "tutorials" && !searching && framework === "all"

  const openSearch = () => {
    setSearching(true)
    // Focus inside the tap itself, or a phone won't raise its keyboard. The field is always there,
    // only hidden, so it can take the focus before the state comes back
    input.current?.focus()
  }
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
        {/* The tabs, then search and the filter as two square buttons. Where a small screen or a
            large font leaves no room for all three, the buttons drop to a line of their own. Search
            opens into the whole row, and Cancel gives it back */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Segmented
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab)
              closeSearch()
            }}
            aria-label="Show"
            className={cn("pill h-11! rounded-full! border-0! p-0!", searching && "hidden!")}
          >
            <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
              Tutorials
            </SegmentedItem>
            <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
              Programs
            </SegmentedItem>
          </Segmented>

          {tab === "tutorials" && (
            <div className={cn("ml-auto flex items-center gap-2", searching && "w-full")}>
              <label
                className={cn(
                  // overflow-hidden: folded to 44px, the field's own 80px of padding would stick out and let the list pan sideways
                  "relative h-11 overflow-hidden rounded-control border transition-colors",
                  MOTION,
                  searching ? "min-w-0 flex-1 border-border-strong bg-surface" : "w-11 border-border bg-surface-panel"
                )}
              >
                {/* A lighter line than lucide's 2, to match the field's light type. The empty field's hint sits a step
                    under the interface's own grey text, at 80%: 4.9:1, still above AA. 70% would drop to 4.1 */}
                <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
                <input
                  ref={input}
                  value={query}
                  tabIndex={searching ? undefined : -1}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeSearch()
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  placeholder={searchHint(framework)}
                  aria-label="Search tutorials"
                  className={cn(
                    "size-full bg-transparent pr-10 pl-10 text-[0.9375rem] font-[350] outline-none placeholder:text-muted-foreground/80 transition-opacity",
                    MOTION,
                    searching ? "opacity-100" : "opacity-0"
                  )}
                />
                {searching && query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("")
                      input.current?.focus()
                    }}
                    className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
                {/* Folded, the whole square is the button that opens search */}
                {!searching && <button type="button" aria-label="Search tutorials" onClick={openSearch} className="absolute inset-0" />}
              </label>
              {searching ? (
                <button type="button" onClick={closeSearch} className="h-11 shrink-0 pl-1 text-control! whitespace-nowrap text-muted-foreground active:text-foreground">
                  Cancel
                </button>
              ) : (
                <FilterMenu phone value={framework} onChange={setFramework} />
              )}
            </div>
          )}
        </div>

        {/* The banner folds away while searching or filtering, so the results start right under the row */}
        <div className={cn("grid transition-[grid-template-rows,opacity]", MOTION, browsing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="min-h-0 overflow-hidden" inert={!browsing}>
            <StartHere layout="phone" />
          </div>
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
            {(q || list.length === 0) && (
              <p role="status" className="mt-4 text-caption text-muted-foreground">
                {resultsLine(list.length, query, framework)}
              </p>
            )}
            {/* Three a level on a phone, the rest behind Show all. A search shows all it finds */}
            <LevelSections phone list={list} limit={3} showAll={!!q} />
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
