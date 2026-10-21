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

/** Who wrote it and how long, in pieces that never break inside: on a narrow card the line wraps
 * between "by acheron ·" and "10 min", never between "4" and "steps", and a new line never starts
 * with the dot */
function Meta({ t, className }: { t: Entry; className?: string }) {
  const parts = metaFor(t).split(" · ")
  return (
    // text-caption! because cn drops the size next to the colour class
    <p className={cn("text-caption! text-muted-foreground tabular-nums", className)}>
      {parts.flatMap((part, i) => [
        i > 0 ? " " : null,
        <span key={part} className="whitespace-nowrap">
          {part}
          {i < parts.length - 1 && " ·"}
        </span>,
      ])}
    </p>
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
      {/* Three columns on one top line, cover, words and the corner square, so the eye reads the name
          first and the square sits beside it, not below it. The name and its description stay
          together; who wrote it and how long sits a little apart, quieter */}
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-start gap-x-4 @max-[18rem]:gap-x-3">
        {/* In px, not rem: a larger font needs the room for words, not for the picture */}
        <Thumb src={thumb(t.slug, t.ext)} className="size-[56px]" />
        <div className="min-w-0 pt-0.5">
          <h3 className="font-heading text-title text-foreground">
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
          <div className="@max-[18rem]:hidden">
            <p className="mt-1 line-clamp-2 text-[0.875rem] leading-snug font-read text-foreground/75">{t.description}</p>
            {/* Muted, not subtle: the tertiary grey is 3.6:1 on the card, under AA for this size */}
            <Meta t={t} className="mt-2.5" />
          </div>
        </div>
        {/* 36px to look at, 44 to hit: the extra reaches past the square, not into the words */}
        <button
          type="button"
          aria-label={corner.label}
          onClick={corner.run}
          className="relative z-10 -m-1 flex min-h-11 min-w-11 items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TutorialStatus done={done} total={STEPS.length} started={started} finished={finished} className={cn(!finished && "transition-colors hover:border-border-strong")} />
        </button>
        {/* On a narrow card (a small phone, a large font) the words go under the cover, across the
            whole card, instead of a column a few words wide */}
        <div className="col-span-3 mt-3 hidden @max-[18rem]:block">
          <p className="line-clamp-2 text-[0.875rem] leading-snug font-read text-foreground/75">{t.description}</p>
          <Meta t={t} className="mt-2.5" />
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
