import { ListFilter } from "lucide-react"
import { useState } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { FRAMEWORKS, byLevel, shownName, upstreamName, type Entry, type FrameworkFilter } from "../ui/catalog"
import { NAV_ICONS } from "../ui/navIcons"
import { PixelCover, hasPixelCover } from "../ui/PixelCover"
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
    // 16 at the sides and 16 above and below: every vertical gap in the card is four fifths of what it was
    // (20, 6 and 12), so it reads as compact as the list wants without changing its proportions. Its rows
    // keep to the top: a card stretched to its neighbour's height shared the extra between them and pushed
    // the description 10 further down
    <div className="group/card relative grid grid-cols-[auto_minmax(0,1fr)_auto] content-start items-start gap-x-3.5 rounded-panel border border-border bg-surface-panel px-4 py-4 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none">
      {/* Laid out as Claude's connector cards: a 44 square at the top of the text, its top on the head's,
          and all the words in one column beside it. The cover takes both rows, so the description keeps to
          the text's edge instead of running under it. A pixel cover is drawn to whole pixels at 56 by
          42 and has no 44 square in it, so the picture sits whole in a 44 frame, its sides cropped, with the
          1px left over above filled in its sky and below in its ground, the colours of its own edge rows */}
      {hasPixelCover(t.slug) ? (
        <span
          aria-hidden="true"
          className="relative row-span-2 size-11 shrink-0 overflow-hidden rounded-[9px] bg-[linear-gradient(#b8a6f5_50%,#101011_50%)]"
        >
          <PixelCover slug={t.slug} className="absolute top-px -left-1.5" />
        </span>
      ) : (
        <TutorialCover name={upstreamName(t)} framework={t.framework} className="row-span-2 size-11 rounded-[9px]" />
      )}
      {/* Set as the Continue banner over the list is: a word in regular grey, the name in the headline face
          at regular weight and tight tracking, then what it teaches in the text's 78%. All of it about seven
          eighths of the banner's (12, 18 and 13 against 13, 24 and 15), so a card reads as a list item, not
          a second banner */}
      <div className="min-w-0">
        {/* The framework alone: the author and the progress beside it made the line a list of facts */}
        <p className="text-[0.75rem] leading-4 text-muted-foreground">{t.framework}</p>
        <h3 className="mt-1 line-clamp-2 font-heading text-[1.125rem] leading-[1.25] font-normal tracking-[-0.015em] text-foreground">
          {name}
          {/* How far a lesson under way is, beside its name, a tier under it */}
          {started && done > 0 && (
            <span className="ml-2 align-baseline font-sans text-[0.75rem] leading-none tracking-normal text-muted-foreground tabular-nums">
              {done} of {steps}
            </span>
          )}
        </h3>
      </div>
      <button
        type="button"
        onClick={press}
        aria-label={finished ? `${name} completed. Open it` : `${started ? "Continue" : "Open"} ${name}`}
        className={cn(
          "flex size-7 items-center justify-center rounded-lg after:absolute after:inset-0 after:rounded-panel after:content-['']",
          FOCUS,
          // A 28 square under the arrow, as the action on Claude's connector cards, a shade paler than
          // theirs so it doesn't pull from the name; the arrow and the square light with the card
          finished
            ? "bg-brand-green/12 text-brand-green"
            : "bg-foreground/[0.06] text-muted-foreground/70 transition-colors duration-100 group-hover/card:bg-foreground/[0.1] group-hover/card:text-foreground focus-visible:text-foreground motion-reduce:transition-none"
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
      {/* What it teaches, under the name in the text's column and on under the arrow too, which only the
          head row needs: between the cover and the arrow it had 180px on a phone and broke after three words.
          6 under the name. Lines fill to the edge, plain wrapping: balanced, a line broke in half at the
          card's width, and pretty pulled a second word down to keep "framework." company, leaving the first
          line short with room beside it */}
      <p className="col-span-2 col-start-2 mt-1.5 line-clamp-2 text-[0.8125rem] leading-[1.4] text-foreground/78">{t.description}</p>
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
            <div className="mb-2.5 flex min-h-9 items-baseline gap-2">
              {/* A step under the banner's lesson name and over the cards': page 28, banner 24, section 20,
                  card 18. At 24 and 500 it stood as tall as the banner and nearly as the page's title */}
              <h2 id={id} className="font-heading text-[1.25rem] leading-[1.5rem] font-medium text-foreground">
                {g.level}
              </h2>
              {/* The count as most lists set one beside a group's name (Linear, Plane, hilos, Evernote): plain text,
                  no pill, regular weight in a quiet grey, on the heading's baseline, and a step under a large
                  heading. 16 against 20: at 14 it read as a footnote, at 20 it took as much eye as the word */}
              <span className="text-[1rem] text-subtle tabular-nums">{g.items.length}</span>
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
