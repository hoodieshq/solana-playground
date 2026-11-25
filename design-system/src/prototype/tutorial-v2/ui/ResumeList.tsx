import { ChevronRight, Search } from "lucide-react"
import { useState, type ReactNode } from "react"

import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { StepRing } from "./StepRing"
import { DoneVeil } from "./TileCover"


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
  /** As cards: what it does, under the name, when it's known */
  line?: string
  /** Under way: steps passed of all, for the ring before "Step 2 of 4" */
  progress?: { done: number; of: number }
}

/** As cards: the catalog's card at its size, two before Show all */
const FIRST_CARDS = 2

/** What you started, at the top of Tutorials and of Programs (Almaz, 10 Nov): left half done, a lesson
 * or a project was found again only by its card, or not at all. A grid of cards, each card one button:
 * the cover, the name and where it stands in the words of its own step bar. Built for any number (Almaz,
 * 11 Nov): one card runs the row's width, four show before Show all, and a long list opens with a filter.
 * With none it isn't drawn */
export function ResumeList({ id, title, items, cards = false, className }: { id: string; title: string; items: ResumeItem[]; cards?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  if (!items.length) return null
  if (cards) return <ResumeCards id={id} title={title} items={items} className={className} />
  const more = items.length > FIRST
  const filtering = open && items.length >= FILTER_FROM
  const q = filtering ? query.trim().toLowerCase() : ""
  const shown = q ? items.filter((it) => it.name.toLowerCase().includes(q)) : more && !open ? items.slice(0, FIRST) : items
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2.5 flex min-h-9 items-center gap-2">
        <h2 id={id} className="font-heading text-20 leading-6 font-headline text-foreground">
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
                <p className="truncate font-heading text-16 leading-5 font-normal tracking-tight text-foreground">{it.name}</p>
                {/* Green and white once it's done, as the catalog's standing; grey while it's under way */}
                <p className={cn("mt-1 flex items-center gap-1.5 text-13 leading-5", it.done ? "text-foreground" : "text-muted-foreground")}>
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

/** Your projects at the catalog's card size (Almaz, 25 Nov): the cover at 72, the name, what it does when
 * it's known, and where it stands. No grey foot: its instructions and minutes said nothing about your own
 * work (Almaz, 25 Nov). Two show, the rest behind Show all */
function ResumeCards({ id, title, items, className }: { id: string; title: string; items: ResumeItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const more = items.length - FIRST_CARDS
  const shown = open ? items : items.slice(0, FIRST_CARDS)
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-4 flex min-h-6 items-center gap-2">
        <h2 id={id} className="font-heading text-20 leading-6 font-headline text-foreground">
          {title}
        </h2>
        {items.length > 1 && <span className="rounded-full bg-surface-hover px-2 text-13 leading-6 text-muted-foreground tabular-nums">{items.length}</span>}
        {/* Show all at the heading's end, as the rows and Tutorials have it: under the cards it hung loose
            between two sections. In the heading's own size and colour, so the row reads as one line (Almaz,
            25 Nov, after Claude's plugin lists) */}
        {more > 0 && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn("-my-1.5 -mr-2 ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2 font-heading text-20 leading-6 font-headline text-foreground transition-opacity duration-100 hover:opacity-75 motion-reduce:transition-none pointer-coarse:h-11", FOCUS)}
          >
            {open ? "Show less" : "Show all"}
            <span
              aria-hidden="true"
              className={cn("flex size-5 transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none [&>svg]:size-full", open ? "-rotate-90" : "rotate-90")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-full" />
            </span>
          </button>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {shown.map((it) =>
          it.confirm ? (
            <li key={it.key} className="col-span-full flex min-h-[4.25rem] items-center gap-3 rounded-panel border border-border bg-surface-panel px-4 py-3">
              {it.confirm}
            </li>
          ) : (
            <li
              key={it.key}
              className="group/row relative flex flex-col overflow-hidden rounded-panel border border-border bg-surface-panel transition-colors duration-100 hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none"
            >
              <button
                type="button"
                onClick={it.onOpen}
                aria-label={`${it.done ? "Open" : "Continue"} ${it.name}, ${it.where}`}
                className={cn("absolute inset-0 rounded-panel", FOCUS)}
              />
              <div className="pointer-events-none grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] content-start items-start gap-x-3.5 p-4">
                <div data-done={it.done || undefined} className="relative row-span-3 size-14 overflow-hidden rounded-xl [&>*]:size-14!">
                  {it.cover}
                  {it.done && <DoneVeil />}
                </div>
                <p className="line-clamp-1 min-w-0 font-heading text-16 leading-5 font-normal tracking-tight text-foreground">{it.name}</p>
                {it.menu ? (
                  <div className="pointer-events-auto relative z-10 -my-1.5 -mr-1.5 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100 [html.phone_&]:opacity-100 [html.touch_&]:opacity-100">
                    {it.menu}
                  </div>
                ) : (
                  <span />
                )}
                {/* The name and one muted style for everything under it, as the catalog's cards (Almaz, 25 Nov) */}
                {it.line && <p className="col-span-2 col-start-2 mt-1 line-clamp-2 min-h-10 text-13 leading-5 text-muted-foreground">{it.line}</p>}
                {/* Done in green, as the catalog's cards (the tick sits on the cover); under way: the step */}
                <p className="col-span-2 col-start-2 mt-2 flex items-center gap-1.5 text-13 leading-5 text-muted-foreground tabular-nums">
                  {it.done ? (
                    <span className="text-success">Done</span>
                  ) : (
                    // Before the step, the nav's progress ring, so how far it got shows at a glance (Almaz, 25 Nov)
                    <>
                      {it.progress && <StepRing done={it.progress.done} of={it.progress.of} className="size-3.5" />}
                      <span className="truncate">{it.where}</span>
                    </>
                  )}
                </p>
              </div>
            </li>
          )
        )}
      </ul>
    </section>
  )
}
