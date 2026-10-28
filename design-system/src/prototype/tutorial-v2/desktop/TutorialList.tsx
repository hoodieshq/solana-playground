import { ListFilter } from "lucide-react"
import { useState } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { FRAMEWORKS, byLevel, productMeta, shownName, upstreamName, type Entry, type FrameworkFilter } from "../ui/catalog"
import { NAV_ICONS } from "../ui/navIcons"
import { TutorialCover } from "../ui/TutorialCover"

/* The desktop tutorials list, as client-v2's tutorials page draws it (views/flow/gallery/TutorialsTab.tsx
   and the filter in views/flow/zero/ZeroState.tsx). The phone keeps its own cards in ui/GalleryParts */

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"

/** Cards a level shows before Show all: two rows of the list's two columns */
const LEVEL_FIRST = 4

/** An icon beside the search, not a second box: the search's height to hit, the glass's grey at
 * rest, the text's white under the pointer or when a filter is on. A dot says a filter is on */
/** The framework filter. `boxed` is the desktop's: a square the search field's height, outlined like
 * it, with the list glyph in the text's own white. The phone keeps its bare sliders, a thumb's square */
export function FilterButton({
  value,
  onChange,
  boxed = false,
  className,
}: {
  value: FrameworkFilter
  onChange: (v: FrameworkFilter) => void
  boxed?: boolean
  className?: string
}) {
  const on = value !== "all"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={on ? `Framework: ${value}` : "Filter by framework"}
        className={cn(
          "relative flex shrink-0 items-center justify-center transition-colors duration-150",
          FOCUS,
          boxed
            ? // No fill of its own, so its hairline is the field's edge as it reads against the ground
              "size-8 rounded-lg border border-foreground/[0.1] text-foreground hover:bg-foreground/[0.06] data-[state=open]:border-transparent data-[state=open]:bg-foreground/[0.12] [&>svg]:size-[1.125rem]"
            : cn("size-10 rounded-lg hover:text-foreground data-[state=open]:text-foreground [&>svg]:size-[1.375rem]", on ? "text-foreground" : "text-muted-foreground/80"),
          className
        )}
      >
        {boxed ? (
          <ListFilter strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 4v8M6 16v4M12 4v2M12 10v10M18 4v10M18 18v2" />
            <circle cx="6" cy="14" r="2" />
            <circle cx="12" cy="8" r="2" />
            <circle cx="18" cy="16" r="2" />
          </svg>
        )}
        {on && <span aria-hidden="true" className={cn("absolute size-1.5 rounded-full bg-brand-purple", boxed ? "-top-0.5 -right-0.5" : "top-2 right-2")} />}
      </DropdownMenuTrigger>
      {/* Boxed, a small card on the field's own fill: rows of the button's height, the group's name in
          the rows' size but grey, the tick on the right in the accent */}
      <DropdownMenuContent align="end" sideOffset={boxed ? 6 : 4} className={cn("w-44!", boxed && "rounded-xl bg-surface p-1.5 shadow-panel")}>
        {/* The group's name a step under its choices in size, weight and tone, so it never reads as one more choice */}
        <DropdownMenuLabel
          className={
            boxed ? "flex h-7 items-center px-2.5 py-0 text-[0.875rem] font-normal text-muted-foreground/80" : "pt-1.5 pb-1 text-[0.75rem]! font-normal text-muted-foreground/85"
          }
        >
          Framework
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as FrameworkFilter)}>
          {FRAMEWORKS.map((f) => (
            <DropdownMenuRadioItem
              key={f.value}
              value={f.value}
              className={cn(
                "text-foreground",
                boxed
                  ? "h-7 py-0 pr-9 pl-2.5 text-[0.875rem]! [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-2 [&_[data-slot=dropdown-menu-radio-item-indicator]]:text-brand-purple"
                  : "min-h-8 text-[0.8125rem]!"
              )}
            >
              {f.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One tutorial: the cover, the name, what it is, then the framework and who wrote it. The corner
 * square is the card's one button, stretched over the whole card; it only shows what a press does:
 * the arrow out to the tutorial, a tick once it's done */
function Card({ t }: { t: Entry }) {
  const open = useOpenTutorial()
  const p = useProgress(t.slug)
  const steps = LESSONS[t.slug]?.steps.length ?? 0
  const finished = p.finished
  const started = p.started && !finished
  const done = p.passed.filter(Boolean).length
  const name = shownName(t)
  // The tutorial opens on its conversation: the intro card before Start, the live card after
  const press = () => open(t.slug)

  return (
    <div className="group/card relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 rounded-panel border border-border bg-surface-panel p-3.5 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none">
      <TutorialCover name={upstreamName(t)} framework={t.framework} className="h-[2.625rem] w-14 rounded-lg" />
      <div className="min-w-0">
        <div className="line-clamp-1 text-[0.9375rem] leading-5 font-medium text-foreground">
          {name}
          {/* How far a lesson under way is, beside its name */}
          {started && done > 0 && (
            <span className="ml-2 inline-flex items-center align-middle text-[0.75rem] font-normal text-muted-foreground tabular-nums">
              {done} of {steps}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-[1.125rem] font-[350] text-muted-foreground">{t.description}</p>
        <p className="mt-2 text-[0.75rem] leading-4 font-[380] text-muted-foreground/80 tabular-nums">{productMeta(t)}</p>
      </div>
      <button
        type="button"
        onClick={press}
        aria-label={finished ? `${name} completed. Open it` : `${started ? "Continue" : "Open"} ${name}`}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg after:absolute after:inset-0 after:rounded-panel after:content-['']",
          FOCUS,
          // The arrow at rest a step under the card's meta line, so the names lead; it lights with the card
          finished
            ? "bg-brand-green/12 text-brand-green"
            : "bg-surface-hover text-muted-foreground/70 transition-colors duration-100 group-hover/card:text-foreground focus-visible:text-foreground motion-reduce:transition-none"
        )}
      >
        {finished ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M5 11 11 5M6 5h5v5" />
          </svg>
        )}
      </button>
    </div>
  )
}

/** The cards by level, each a few deep with the rest behind Show all, which opens in place. A
 * search shows everything it finds */
export function TutorialLevels({ list, searching }: { list: Entry[]; searching: boolean }) {
  const [opened, setOpened] = useState<string[]>([])
  return (
    // A level's gap to the next is the page's own gap and two more rem, as the product's sections sit
    <div className="flex flex-col gap-12">
      {byLevel(list).map((g) => {
        const more = !searching && g.items.length > LEVEL_FIRST
        const open = opened.includes(g.level)
        const shown = more && !open ? g.items.slice(0, LEVEL_FIRST) : g.items
        const id = `level-${g.level.toLowerCase()}`
        return (
          <section key={g.level} aria-labelledby={id}>
            <div className="mb-2.5 flex min-h-9 items-center gap-2">
              {/* A section's name at reading size: one step over the cards' names */}
              <h2 id={id} className="text-[1rem] leading-5 font-medium text-foreground">
                {g.level}
              </h2>
              <span className="rounded-full bg-surface-hover px-2 text-[0.75rem] leading-5 text-muted-foreground tabular-nums">{g.items.length}</span>
              {/* Opens in place, so it points down, not on to another page */}
              {more && (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpened((o) => (open ? o.filter((l) => l !== g.level) : [...o, g.level]))}
                  className={cn("-mr-2 ml-auto flex h-9 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-muted-foreground hover:text-foreground", FOCUS)}
                >
                  {open ? "Show less" : "Show all"}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none [&>svg]:size-full",
                      open ? "-rotate-90" : "rotate-90"
                    )}
                  >
                    {NAV_ICONS.forward}
                  </span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-3">
              {shown.map((t) => (
                <Card key={t.slug} t={t} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
