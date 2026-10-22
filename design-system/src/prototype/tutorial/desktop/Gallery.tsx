import { useRef, useState } from "react"
import { Boxes, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { filterCatalog, resultsLine, searchHint, type FrameworkFilter } from "../ui/catalog"
import { FilterMenu, LevelSections } from "../ui/GalleryParts"
import { StartHereBanner } from "../ui/StartHereBanner"

type Tab = "tutorials" | "programs"

export function Gallery() {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>("tutorials")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  // On a narrow header search folds to a square; open, the field takes the tabs' place
  const [searchOpen, setSearchOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const openSearch = () => {
    setSearchOpen(true)
    // The field shows on the next frame, so the focus waits for it
    requestAnimationFrame(() => input.current?.focus())
  }
  const closeSearch = () => {
    setQuery("")
    setSearchOpen(false)
  }

  // Both are on screen here, so the search reads within the chosen framework
  const list = filterCatalog(query, framework)
  const q = query.trim()
  // The banner is for browsing. Narrowed to a search or a framework, the list comes first
  const browsing = tab === "tutorials" && !q && framework === "all"

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[68rem] px-10 pt-10 pb-16">
        {/* One row: the page's name with its tabs beside it, then search and the filter at the right
            end. Where the row is too narrow for the field (the tablet, a 1024 window), search folds
            to a square beside the filter, and opened, the field takes the tabs' place with Cancel,
            as on the phone. Decided by the row's own width, so a larger font folds it sooner */}
        <div className="@container">
        <div className="flex items-center gap-x-6">
          <div className="flex min-w-0 items-center gap-5">
            <h1 className="font-heading text-display whitespace-nowrap">What do you want to build?</h1>
            <Segmented
              value={tab}
              onValueChange={(v) => {
                setTab(v as Tab)
                closeSearch()
              }}
              aria-label="Show"
              className={cn("pill h-10! rounded-full! border-0! p-0!", searchOpen && "@max-[58rem]:hidden!")}
            >
              <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
                Tutorials
              </SegmentedItem>
              <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
                Programs
              </SegmentedItem>
            </Segmented>
          </div>
          {tab === "tutorials" && (
            <div className={cn("ml-auto flex min-w-0 items-center gap-2", searchOpen && "@max-[58rem]:flex-1")}>
              <label
                className={cn(
                  "relative h-10 w-64 rounded-control border border-border bg-surface-panel transition-colors focus-within:border-border-strong",
                  searchOpen ? "@max-[58rem]:w-auto @max-[58rem]:min-w-0 @max-[58rem]:flex-1" : "@max-[58rem]:hidden"
                )}
              >
                {/* The empty field's hint sits a step under the interface's own grey text, at 80%: 4.9:1, still above
                    AA. 70% would drop to 4.1 */}
                <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
                {/* The composer's size and weight, the same as the phone's search */}
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (searchOpen ? closeSearch() : setQuery(""))}
                  placeholder={searchHint(framework)}
                  aria-label="Search tutorials"
                  className="size-full rounded-control bg-transparent pr-9 pl-10 text-[0.9375rem] font-[350] outline-none placeholder:text-muted-foreground/80"
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
              {!searchOpen && (
                <button
                  type="button"
                  aria-label="Search tutorials"
                  onClick={openSearch}
                  className="relative hidden size-10 shrink-0 items-center justify-center rounded-control border border-border bg-surface-panel text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @max-[58rem]:flex"
                >
                  <Search strokeWidth={1.75} className="size-4" />
                </button>
              )}
              <FilterMenu value={framework} onChange={setFramework} />
              {searchOpen && (
                <button
                  type="button"
                  onClick={closeSearch}
                  className="hidden h-10 shrink-0 items-center rounded-control px-2 text-[0.875rem] text-muted-foreground transition-colors hover:text-foreground @max-[58rem]:inline-flex"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
        </div>

        {browsing && <StartHereBanner layout="desktop" />}

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
              <p role="status" className="mt-6 text-caption text-muted-foreground">
                {resultsLine(list.length, query, framework)}
              </p>
            )}
            {/* Two rows of two a level, the rest behind Show all. A search shows all it finds */}
            <LevelSections list={list} limit={4} showAll={!!q} />
          </>
        )}
      </div>
    </div>
  )
}
