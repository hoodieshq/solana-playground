import { useState } from "react"
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { FRAMEWORKS, HERO, byLevel, metaFor, openTutorial, type Entry, type FrameworkFilter } from "./catalog"
import { Thumb } from "./Thumb"
import { TutorialStatus } from "./TutorialStatus"

/** The framework filter behind one square button, beside the search. A dot on it says a filter is
 * on, so a short list never looks like the whole catalogue */
export function FilterMenu({ value, onChange, phone = false }: { value: FrameworkFilter; onChange: (v: FrameworkFilter) => void; phone?: boolean }) {
  const on = value !== "all"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={on ? `Framework: ${value}` : "Filter by framework"}
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-control border text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground",
          phone ? "size-11" : "size-10",
          on ? "border-border-strong bg-surface text-foreground" : "border-border bg-surface-panel"
        )}
      >
        <SlidersHorizontal strokeWidth={1.75} className="size-4" />
        {on && <span aria-hidden="true" className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44!">
        <DropdownMenuLabel className="text-caption! text-muted-foreground">Framework</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as FrameworkFilter)}>
          {FRAMEWORKS.map((f) => (
            <DropdownMenuRadioItem key={f.value} value={f.value} className={cn("text-control!", phone ? "min-h-11" : "min-h-9")}>
              {f.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One tutorial: cover, name, its own description, who wrote it and how long it is. The whole card
 * opens the tutorial; the square in its corner starts it, or says how far you are */
export function TutorialTile({ t, phone = false }: { t: Entry; phone?: boolean }) {
  const { s, dispatch } = useStore()
  const mine = t.slug === HERO.slug
  const started = mine && s.startedAt !== null && s.finishedAt === null
  const finished = mine && s.finishedAt !== null
  const done = s.passed.filter(Boolean).length
  const open = () => openTutorial(t.slug, () => dispatch({ type: "open", screen: "overview" }))
  const corner = finished
    ? { label: `${t.name} completed. Open it`, run: open }
    : started
      ? { label: `Continue ${t.name}, ${done} of ${STEPS.length} steps passed`, run: () => dispatch({ type: "start" }) }
      : { label: `Start ${t.name}`, run: () => (mine ? dispatch({ type: "start" }) : toast("Only Hello Anchor is in this prototype")) }

  return (
    // Sized by its own width: on a narrow card (a small phone, a large font) the words go under the
    // cover and the name, across the whole card, instead of a column a few words wide
    <div
      className={cn(
        "@container relative h-full rounded-card border border-border bg-surface-panel transition-colors duration-150 ease-standard hover:bg-surface active:bg-surface motion-reduce:transition-none",
        phone ? "p-4" : "p-5"
      )}
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-x-4 @max-[18rem]:gap-x-3">
        {/* In px, not rem: a larger font needs the room for words, not for the picture */}
        <Thumb src={thumb(t.slug, t.ext)} className="row-span-2 size-[56px] @max-[18rem]:row-span-1" />
        {/* Clear of the corner button, which sits over the card's top right: beside it and, by its
            height, above the words under it */}
        <h3 className="col-start-2 min-h-9 pr-12 text-title @max-[18rem]:flex @max-[18rem]:items-center @max-[18rem]:self-center">
          {/* The name is the card's link: its box is stretched over the whole card, so a tap anywhere
              opens it, and only the corner button stands above it */}
          <button
            type="button"
            onClick={open}
            className="line-clamp-2 text-left outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {t.name}
          </button>
        </h3>
        {/* 36px to look at, 44 to hit: set 4px out from the padding's corner so the square sits on it */}
        <button
          type="button"
          aria-label={corner.label}
          onClick={corner.run}
          className={cn(
            "absolute z-10 flex h-11 min-w-11 items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring",
            phone ? "top-3 right-3" : "top-4 right-4"
          )}
        >
          <TutorialStatus done={done} total={STEPS.length} started={started} finished={finished} className={cn(!finished && "transition-colors hover:border-border-strong")} />
        </button>
        <div className="col-start-2 @max-[18rem]:col-span-2 @max-[18rem]:col-start-1 @max-[18rem]:mt-3">
          <p className="mt-1 line-clamp-2 text-caption text-muted-foreground @max-[18rem]:mt-0">{t.description}</p>
          {/* Muted, not subtle: the tertiary grey is 3.6:1 on the card, under AA for this size */}
          <p className="mt-1.5 text-caption text-muted-foreground tabular-nums">{metaFor(t)}</p>
        </div>
      </div>
    </div>
  )
}

/** The cards by level. A level shows a few until Show all opens the rest in place; a search shows
 * everything it finds. Its count says how many there are under the current filter */
export function LevelSections({ list, limit, showAll = false, phone = false }: { list: Entry[]; limit: number; showAll?: boolean; phone?: boolean }) {
  const [open, setOpen] = useState<string[]>([])
  return byLevel(list).map((g) => {
    const more = !showAll && g.items.length > limit
    const expanded = open.includes(g.level)
    const items = more && !expanded ? g.items.slice(0, limit) : g.items
    const id = `level-${g.level}`
    return (
      <section key={g.level} aria-labelledby={id} className={phone ? "mt-6" : "mt-10"}>
        <div className={cn("flex items-center gap-2", phone ? "mb-2 min-h-11" : "mb-3 min-h-9")}>
          <h2 id={id} className="font-heading text-title text-foreground">
            {g.level}
          </h2>
          <span className="rounded-full bg-surface-raised px-2 text-caption leading-5 text-muted-foreground tabular-nums">{g.items.length}</span>
          {/* Opens in place, so it points down, not on to another page */}
          {more && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen((o) => (expanded ? o.filter((l) => l !== g.level) : [...o, g.level]))}
              className={cn(
                "-mr-2 ml-auto flex items-center gap-1.5 rounded-control px-2 text-control! text-muted-foreground transition-colors hover:text-foreground active:text-foreground",
                phone ? "h-11" : "h-9"
              )}
            >
              {expanded ? "Show less" : "Show all"}
              {expanded ? <ChevronUp strokeWidth={1.75} className="size-4" /> : <ChevronDown strokeWidth={1.75} className="size-4" />}
            </button>
          )}
        </div>
        {/* Two a row at every desktop width, never three, so a description keeps two whole lines */}
        <ul className={phone ? "flex flex-col gap-2" : "grid grid-cols-2 gap-3"}>
          {items.map((t) => (
            <li key={t.slug}>
              <TutorialTile t={t} phone={phone} />
            </li>
          ))}
        </ul>
      </section>
    )
  })
}
