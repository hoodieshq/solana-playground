import { useState } from "react"
import { Boxes, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { filterCatalog, resultsLine, searchHint, type FrameworkFilter } from "../ui/catalog"
import { FilterMenu, LevelSections } from "../ui/GalleryParts"
import { StartHere } from "../ui/StartHereGame"

type Tab = "tutorials" | "programs"

export function Gallery() {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>("tutorials")
  const [framework, setFramework] = useState<FrameworkFilter>("all")

  // Both are on screen here, so the search reads within the chosen framework
  const list = filterCatalog(query, framework)
  const q = query.trim()
  // The banner is for browsing. Narrowed to a search or a framework, the list comes first
  const browsing = tab === "tutorials" && !q && framework === "all"

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[68rem] px-10 pt-10 pb-16">
        {/* One row: the page's name with its tabs beside it, then search and the filter at the right
            end. On a narrow window search and the filter take a line of their own */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-5">
            <h1 className="font-heading text-display">What do you want to build?</h1>
            <Segmented value={tab} onValueChange={(v) => setTab(v as Tab)} aria-label="Show" className="pill h-10! rounded-full! border-0! p-0!">
              <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
                Tutorials
              </SegmentedItem>
              <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
                Programs
              </SegmentedItem>
            </Segmented>
          </div>
          {tab === "tutorials" && (
            <div className="ml-auto flex items-center gap-2">
              <label className="relative h-10 w-64 rounded-control border border-border bg-surface-panel transition-colors focus-within:border-border-strong">
                {/* The empty field's hint sits a step under the interface's own grey text, at 80%: 4.9:1, still above
                    AA. 70% would drop to 4.1 */}
                <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
                {/* The composer's size and weight, the same as the phone's search */}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setQuery("")}
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
              <FilterMenu value={framework} onChange={setFramework} />
            </div>
          )}
        </div>

        {browsing && <StartHere layout="desktop" />}

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
