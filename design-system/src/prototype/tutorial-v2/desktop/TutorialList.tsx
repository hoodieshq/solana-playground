import { ArrowUpRight, Check, ChevronRight } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import { useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { byLevel, shownName, upstreamName, type Entry } from "../ui/catalog"
import { PixelCover, hasPixelCover } from "../ui/PixelCover"
import { TutorialCover } from "../ui/TutorialCover"

/* The desktop tutorials list, as client-v2's tutorials page draws it (views/flow/gallery/TutorialsTab.tsx
  ). The phone keeps its own cards in ui/GalleryParts */

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"

/** Cards a level shows before Show all: two rows of the list's two columns */
const LEVEL_FIRST = 4

/** A tutorial's 44 cover, on its card and on its In progress row */
export function TutorialThumb({ t, className }: { t: Entry; className?: string }) {
  if (hasPixelCover(t.slug))
    return (
      <span aria-hidden="true" className={cn("relative size-11 shrink-0 overflow-hidden rounded-[9px] bg-[linear-gradient(#b8a6f5_50%,#101011_50%)]", className)}>
        <PixelCover slug={t.slug} className="absolute top-px -left-1.5" />
      </span>
    )
  return <TutorialCover name={upstreamName(t)} framework={t.framework} level={t.level} className={cn("size-11 rounded-[9px]", className)} />
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
      <TutorialThumb t={t} className="row-span-2" />
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
          // theirs so it doesn't pull from the name. The arrow only shows under the pointer or the focus:
          // the whole card is the button, and an arrow on every card said nothing. The tick stays, it's news
          finished
            ? "bg-brand-green/12 text-brand-green"
            : "bg-foreground/[0.06] text-muted-foreground/70 opacity-0 transition-[color,background-color,opacity] duration-100 group-hover/card:bg-foreground/[0.1] group-hover/card:text-foreground group-hover/card:opacity-100 focus-visible:text-foreground focus-visible:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
        )}
      >
        {finished ? (
          <Check aria-hidden="true" strokeWidth={2.25} className="size-4" />
        ) : (
          <ArrowUpRight aria-hidden="true" strokeWidth={2} className="size-4" />
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

/** The cards by level, each a few deep with the rest behind Show all, which opens in place */
export function TutorialLevels({ list }: { list: Entry[] }) {
  const [opened, setOpened] = useState<string[]>([])
  return (
    // A level's gap to the next is the page's own gap and two more rem, as the product's sections sit
    <div className="flex flex-col gap-12">
      {byLevel(list).map((g) => {
        const more = g.items.length > LEVEL_FIRST
        const open = opened.includes(g.level)
        const shown = more && !open ? g.items.slice(0, LEVEL_FIRST) : g.items
        const id = `level-${g.level.toLowerCase()}`
        return (
          <section key={g.level} aria-labelledby={id}>
            <div className="mb-2.5 flex min-h-9 items-center gap-2">
              {/* A step under the banner's lesson name and over the cards': page 28, banner 24, section 20,
                  card 18. At 24 and 500 it stood as tall as the banner and nearly as the page's title */}
              <h2 id={id} className="font-heading text-[1.25rem] leading-[1.5rem] font-medium text-foreground">
                {g.level}
              </h2>
              {/* The count on a grey chip, as the first Oak had it: as plain grey text beside the heading it
                  went unnoticed, and Almaz looked for it (10 Nov) */}
              <span className="rounded-full bg-surface-hover px-2 text-[0.875rem] leading-6 text-muted-foreground tabular-nums">{g.items.length}</span>
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
                    <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-full" />
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
