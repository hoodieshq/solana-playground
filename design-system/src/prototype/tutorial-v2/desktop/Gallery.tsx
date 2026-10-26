import { useRef, useState, type CSSProperties } from "react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

import { BrandIcon } from "../ui/brandGlyphs"
import { filterCatalog, resultsLine, searchHint, type FrameworkFilter } from "../ui/catalog"
import { StartHereBanner } from "../ui/StartHereBanner"
import { FilterButton, TutorialLevels } from "./TutorialList"

/* The brand pattern under the page, at the product's strength: one tile of the deck's grid
   (views/deck/tokens.ts), rising from the foot of the page and gone by the top */
const TILE =
  "M0 38C0 47.4281 0 52.1421 2.9289 55.0711C5.8579 58 10.5719 58 20 58H38C47.4281 58 52.1421 58 55.0711 55.0711C58 52.1421 58 47.4281 58 38V20C58 10.5719 58 5.8579 55.0711 2.9289C52.1421 0 47.4281 0 38 0H20C10.5719 0 5.8579 0 2.9289 2.9289C0 5.8579 0 10.5719 0 20V38Z"
const PATTERN = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath fill-rule='evenodd' d='M0 0H60V60H0Z${TILE}' fill='%23fff' fill-opacity='0.025'/%3E%3C/svg%3E")`,
  backgroundSize: "var(--pp) var(--pp)",
  backgroundPosition: "calc(var(--pp) / 30) calc(var(--pp) * 31 / 60)",
  maskImage: "radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent)",
  WebkitMaskImage: "radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent)",
  "--pp": "max(24px, round(calc(min(100vw, 1920px) / 32), 1px))",
} as CSSProperties

/* A phone's icon button answers a press with a soft square inside its 44, not the whole 44, and holds
   it while its menu is open. Isolated so the square sits under the glyph */
const PRESS =
  "relative isolate flex shrink-0 items-center justify-center rounded-lg outline-none transition-colors duration-150 before:absolute before:inset-1 before:-z-10 before:rounded-[10px] before:transition-colors before:duration-100 active:before:bg-foreground/[0.08] data-[state=open]:before:bg-foreground/[0.08] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"

/** The phone's glass, drawn in the filter's own line so the two read as a pair */
function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  )
}

/** The tutorials page, as client-v2's /#tutorials draws it (views/flow/zero/ZeroState.tsx): a head
 * row naming the page, then the list's own heading with its search and filter, the Start here
 * banner while browsing, and the cards by level */
export function Gallery() {
  return (
    <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden">
      <div aria-hidden="true" style={PATTERN} className="pointer-events-none absolute inset-0 -z-10" />
      {/* The name of what you're looking at, at the height the sidebar's head uses beside it. The
          page's own heading names Tutorials, so this one steps down and the page keeps one h1 */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border pr-2 pl-3">
        <p className="text-[0.875rem] font-medium text-muted-foreground">Tutorials</p>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto flex w-[min(50rem,100%)] flex-col px-8 pt-8 pb-16">
          <TutorialsBody className="mt-6" />
        </div>
      </div>
    </div>
  )
}

/** The page under its head: the heading with search and filter, the banner, the cards. The phone
 * draws the same, in its own frame; `phone` gives the banner a thumb's button */
export function TutorialsBody({ phone = false, className }: { phone?: boolean; className?: string }) {
  const [query, setQuery] = useState("")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  // On a narrow row the search folds to a square beside the heading and opens into the whole row,
  // with Cancel to give it back. The row's own width decides, so a larger font folds it sooner
  const [searchOpen, setSearchOpen] = useState(false)
  // On a phone Cancel folds the field back into its glass before the heading returns
  const [folding, setFolding] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const closeSearch = () => {
    const done = () => {
      setQuery("")
      setSearchOpen(false)
      setFolding(false)
    }
    if (!phone || matchMedia("(prefers-reduced-motion: reduce)").matches) return done()
    setFolding(true)
    setTimeout(done, 160)
  }
  // The field is drawn only once it opens, so it's put on the page inside the press and focused there:
  // a phone raises its keyboard only for a focus the tap itself made
  const openSearch = () => {
    flushSync(() => setSearchOpen(true))
    input.current?.focus()
  }

  const list = filterCatalog(query, framework)
  const q = query.trim()
  // The banner is for browsing. Narrowed to a search or a framework, the list comes first
  const browsing = !q && framework === "all"

  return (
    <div className={cn("flex w-full flex-col gap-4 duration-200 animate-in fade-in slide-in-from-bottom-1.5 motion-reduce:animate-none", className)}>
      {phone ? (
        // One 44px row whether folded or open, so the banner under it never moves
        <div className="mb-1 flex h-11 items-center gap-2">
          {searchOpen ? (
            <>
              <label
                className={cn(
                  "pg-search-grow flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-[#a0a0a644] bg-surface-panel pr-1 pl-3.5 text-muted-foreground/60 transition-colors duration-150 focus-within:border-muted-foreground",
                  folding && "pg-search-fold"
                )}
              >
                <SearchGlyph className="size-[1.125rem]" />
                <input
                  ref={input}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") return
                    if (query) setQuery("")
                    else closeSearch()
                  }}
                  placeholder={searchHint(framework)}
                  aria-label="Search tutorials"
                  // 16px: under it a phone's browser zooms the page in on focus
                  // The hint a step under what's typed, so an empty field never reads as filled in
                  className="min-w-0 flex-1 bg-transparent text-[1rem] text-foreground outline-none placeholder:text-muted-foreground/55 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("")
                      input.current?.focus()
                    }}
                    className={cn(PRESS, "size-9 text-muted-foreground")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="size-4">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </label>
              {/* The word's right edge on the page's gutter */}
              <button
                type="button"
                onClick={closeSearch}
                className={cn(
                  "-mr-2 h-11 shrink-0 px-2 text-[0.9375rem] text-foreground/80 transition-opacity active:opacity-60 duration-200 animate-in fade-in slide-in-from-right-2 motion-reduce:animate-none",
                  folding && "pg-search-fold-out"
                )}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h1 className="mr-auto font-heading text-[1.75rem] font-normal tracking-[-0.015em] text-foreground">Tutorials</h1>
              {/* Two glyphs of one drawing, one size and one grey. The squares are a thumb's, and the
                        row is pulled out by the filter's inset so its glyph, not its square, meets the gutter */}
              <div className="-mr-[11px] flex items-center duration-200 animate-in fade-in motion-reduce:animate-none">
                <button type="button" aria-label="Search tutorials" onClick={openSearch} className={cn(PRESS, "size-11 text-muted-foreground/80")}>
                  <SearchGlyph className="size-[1.375rem]" />
                </button>
                <FilterButton value={framework} onChange={setFramework} className={cn(PRESS, "size-11 [&>span]:top-2.5 [&>span]:right-2.5")} />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="@container">
          <div className={cn("flex flex-wrap items-center gap-2", phone ? "mb-1" : "mb-4")}>
            {!searchOpen && <h1 className="mr-auto font-heading text-[1.75rem] font-normal tracking-[-0.015em] text-foreground">Tutorials</h1>}
            <label
              className={cn(
                "relative flex h-10 w-80 shrink-0 items-center gap-2 rounded-lg border border-[#a0a0a644] bg-surface-panel pr-3 pl-3.5 text-[0.8125rem] font-[350] text-muted-foreground/80 transition-colors duration-150 focus-within:border-muted-foreground",
                // Folded: a square of the field's height, the glass centred in it, bare like the
                // filter beside it, since folded it's a button and not yet a field
                !searchOpen &&
                  "@max-[35rem]:w-10 @max-[35rem]:justify-center @max-[35rem]:border-transparent @max-[35rem]:bg-transparent @max-[35rem]:p-0 @max-[35rem]:text-foreground",
                // Open on a narrow row: the whole row but Cancel
                searchOpen && "min-w-0 flex-1"
              )}
            >
              <span aria-hidden="true" className="flex size-[0.9375rem] shrink-0 [&>svg]:size-full">
                <BrandIcon name="search" />
              </span>
              <input
                ref={input}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Esc takes back what was typed, then the open row
                  if (e.key === "Escape") {
                    if (query) setQuery("")
                    else if (searchOpen) closeSearch()
                  }
                }}
                placeholder={searchHint(framework)}
                aria-label="Search tutorials"
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/80 [&::-webkit-search-cancel-button]:hidden",
                  !searchOpen && "@max-[35rem]:absolute @max-[35rem]:w-px @max-[35rem]:opacity-0"
                )}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("")
                    input.current?.focus()
                  }}
                  className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="size-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              {/* Folded, the whole square opens the search. The field is there all along, only
                      hidden, so the focus can go to it inside the press */}
              {!searchOpen && (
                <button
                  type="button"
                  aria-label="Search tutorials"
                  onClick={() => {
                    setSearchOpen(true)
                    input.current?.focus()
                  }}
                  className="absolute inset-0 hidden rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple @max-[35rem]:block"
                />
              )}
            </label>
            {searchOpen ? (
              <button type="button" onClick={closeSearch} className="h-10 shrink-0 pr-1 pl-2 text-[0.875rem] text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            ) : (
              <FilterButton value={framework} onChange={setFramework} />
            )}
          </div>
        </div>
      )}

      {browsing && <StartHereBanner layout={phone ? "phone" : "desktop"} />}
      {!browsing && (
        <p role="status" className="text-[0.8125rem] text-muted-foreground">
          {resultsLine(list.length, query, framework)}
        </p>
      )}
      <TutorialLevels list={list} searching={!!q} />
    </div>
  )
}
