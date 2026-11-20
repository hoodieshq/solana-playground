import { ChevronRight, Search } from "lucide-react"
import { useState, type ReactNode } from "react"

import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"


const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"

/** Cards before Show all: two rows of two on a wide page, three in the phone's one column, so the
 * catalog under it stays in the first screen */
const FIRST = 4

/** From this many on, the open list gets a field to filter it by name */
const FILTER_FROM = 9

export type ResumeItem = {
  key: string
  cover: ReactNode
  name: string
  where: string
  done?: boolean
  /** The step it stopped on failed: its dot is red */
  failed?: boolean
  onOpen: () => void
  /** The row's own ⋯, after Continue */
  menu?: ReactNode
  /** In the row's place while a delete is asked about */
  confirm?: ReactNode
}

/** What you started, at the top of Tutorials and of Programs (Almaz, 10 Nov): left half done, a lesson
 * or a project was found again only by its card, or not at all. A grid of cards, each card one button:
 * the cover, the name and where it stands in the words of its own step bar. Built for any number (Almaz,
 * 11 Nov): one card runs the row's width, four show before Show all, and a long list opens with a filter.
 * With none it isn't drawn */
export function ResumeList({ id, title, items, className }: { id: string; title: string; items: ResumeItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  if (!items.length) return null
  const more = items.length > FIRST
  const filtering = open && items.length >= FILTER_FROM
  const q = filtering ? query.trim().toLowerCase() : ""
  const shown = q ? items.filter((it) => it.name.toLowerCase().includes(q)) : more && !open ? items.slice(0, FIRST) : items
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2.5 flex min-h-9 items-center gap-2">
        <h2 id={id} className="font-heading text-20 leading-[1.5rem] font-headline text-foreground">
          {title}
        </h2>
        {/* How many, as the levels of Tutorials say it */}
        {items.length > 1 && <span className="rounded-full bg-surface-hover px-2 text-13 leading-6 text-muted-foreground tabular-nums">{items.length}</span>}
        {/* The levels' Show all, opening in place */}
        {more && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open)
              setQuery("")
            }}
            className={cn("-mr-2 ml-auto flex h-9 items-center gap-1 rounded-lg px-2 text-13 text-muted-foreground hover:text-foreground", FOCUS)}
          >
            {open ? "Show less" : "Show all"}
            <span
              aria-hidden="true"
              className={cn("flex size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none [&>svg]:size-full", open ? "-rotate-90" : "rotate-90")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-full" />
            </span>
          </button>
        )}
      </div>
      {filtering && (
        <label className="mb-3 flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-panel px-3 text-muted-foreground focus-within:border-border-strong sm:max-w-72 pointer-coarse:h-11">
          <Search aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${items.length} by name`}
            aria-label={`Filter ${title.toLowerCase()} by name`}
            className="min-w-0 flex-1 bg-transparent text-13 text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      )}
      {q && !shown.length && <p className="py-3 text-13 leading-5 text-muted-foreground">Nothing named “{query.trim()}”</p>}
      <ul className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {shown.map((it) =>
          it.confirm ? (
            // A delete asked about in the card's place, the row's width: the question and two buttons
            // don't fit half of it
            <li key={it.key} className="col-span-full flex min-h-[4.25rem] items-center gap-3 rounded-panel border border-border bg-surface-panel px-4 py-3">
              {it.confirm}
            </li>
          ) : (
            <li
              key={it.key}
              className={cn(
                "group/row relative flex min-w-0 items-center gap-3.5 rounded-panel border border-border bg-surface-panel p-3 pr-3.5 transition-colors duration-100 hover:border-border-strong motion-reduce:transition-none",
                // One card alone runs the row's width: half of it beside an empty half read as a gap
                items.length === 1 && "col-span-full",
                // Three before Show all in the phone's one column
                more && !open && "max-sm:nth-[n+4]:hidden"
              )}
            >
              {it.cover}
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-16 leading-[1.25] font-normal tracking-[-0.015em] text-foreground">{it.name}</p>
                {/* Green and white once it's done, as the catalog's standing; grey while it's under way */}
                <p className={cn("mt-1 flex items-center gap-1.5 text-13 leading-[1.125rem]", it.done ? "text-foreground" : "text-muted-foreground")}>
                  <StatusDot variant={it.failed ? "error" : it.done ? "success" : "idle"} />
                  <span className="truncate">{it.where}</span>
                </p>
              </div>
              {/* The card's one button, stretched over it, with nothing drawn: no other card in the product
                  has a chevron, the whole card is the button (Almaz, 11 Nov). The line under the name says
                  where a press takes you */}
              <button
                type="button"
                onClick={it.onOpen}
                aria-label={`${it.done ? "Open" : "Continue"} ${it.name}, ${it.where}`}
                className={cn("shrink-0 rounded-panel after:absolute after:inset-0 after:rounded-panel after:content-['']", FOCUS)}
              />
              {/* Over the stretched button, so it opens its own menu; shown under the pointer or the focus,
                always under a finger and in the phone's and the tablet's frames */}
              {it.menu && (
                <div className="relative z-10 -mr-1.5 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100 [html.phone_&]:opacity-100 [html.touch_&]:opacity-100">
                  {it.menu}
                </div>
              )}
            </li>
          )
        )}
      </ul>
    </section>
  )
}
