import { ChevronRight } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import { useOpenTutorial, useProgress } from "../host"
import { LESSONS } from "../lessons"
import { byLevel, shownName, upstreamName, type Entry } from "../ui/catalog"
import { StepRing } from "../ui/StepRing"
import { DoneVeil } from "../ui/TileCover"
import { TutorialCover } from "../ui/TutorialCover"

/* The desktop tutorials list, as client-v2's tutorials page draws it (views/flow/gallery/TutorialsTab.tsx
  ). The phone keeps its own cards in ui/GalleryParts */

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"

/** Cards a level shows before Show all: two rows of the list's two columns */
const LEVEL_FIRST = 4

/** A tutorial's 44 cover, on its In progress row and where a list names it; its card draws it larger.
 * Every lesson wears the tile cover now (Almaz, 10 Nov): the three with a pixel scene of their own
 * stood apart from the rest of the wall */
export function TutorialThumb({ t, className }: { t: Entry; className?: string }) {
  return <TutorialCover name={upstreamName(t)} framework={t.framework} level={t.level} className={cn("size-11 rounded-[9px]", className)} />
}

/** One tutorial, laid out as a program's card (Almaz, 25 Nov): the cover at 56, the name, two lines of what
 * it teaches, and one line under them in the same muted style: the framework it's written in, the step
 * with the nav's ring once started, Done in green once finished, when the cover wears the done veil too.
 * The whole card is its one button, with nothing drawn: the corner square with an arrow went */
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
    <div className="group/card relative flex flex-col overflow-hidden rounded-panel border border-border bg-surface-panel transition-colors duration-100 hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none">
      <button
        type="button"
        onClick={press}
        aria-label={finished ? `${name} completed. Open it` : `${started ? "Continue" : "Open"} ${name}`}
        className={cn("absolute inset-0 cursor-pointer rounded-panel", FOCUS)}
      />
      <div className="pointer-events-none grid flex-1 grid-cols-[auto_minmax(0,1fr)] content-start items-start gap-x-3.5 p-4">
        <div data-done={finished || undefined} className="relative row-span-3 size-14 overflow-hidden rounded-xl">
          <TutorialThumb t={t} className="size-14 rounded-none" />
          {finished && <DoneVeil />}
        </div>
        <h3 className="line-clamp-1 min-w-0 font-heading text-16 leading-5 font-normal tracking-tight text-foreground">{name}</h3>
        <p className="col-start-2 mt-1 line-clamp-2 min-h-10 text-13 leading-5 text-muted-foreground">{t.description}</p>
        <span className="col-start-2 mt-2 inline-flex items-center gap-1.5 text-13 leading-5 text-muted-foreground tabular-nums">
          {finished ? (
            <span className="text-success">Done</span>
          ) : started ? (
            <>
              <StepRing done={done} of={steps} className="size-3.5" />
              {`Step ${Math.min(steps, done + 1)} of ${steps}`}
            </>
          ) : (
            t.framework
          )}
        </span>
      </div>
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
            {/* 16 from the heading to its cards, as Programs' sections (Almaz, 25 Nov) */}
            <div className="mb-4 flex min-h-6 items-center gap-2">
              {/* A step under the banner's lesson name and over the cards': banner 36, section 20, card 16.
                  At 24 and 500 it stood as tall as the banner */}
              <h2 id={id} className="font-heading text-20 leading-6 font-headline text-foreground">
                {g.level}
              </h2>
              {/* The count on a grey chip, as the first Oak had it: as plain grey text beside the heading it
                  went unnoticed, and Almaz looked for it (10 Nov) */}
              <span className="rounded-full bg-surface-hover px-2 text-13 leading-6 text-muted-foreground tabular-nums">{g.items.length}</span>
              {/* Opens in place, so it points down, not on to another page. In the heading's own size and colour,
                  as Your projects' Show all (Almaz, 25 Nov) */}
              {more && (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpened((o) => (open ? o.filter((l) => l !== g.level) : [...o, g.level]))}
                  className={cn("-my-1.5 -mr-2 ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2 font-heading text-20 leading-6 font-headline text-foreground transition-opacity duration-100 hover:opacity-75 motion-reduce:transition-none pointer-coarse:h-11", FOCUS)}
                >
                  {open ? "Show less" : "Show all"}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none [&>svg]:size-full",
                      open ? "-rotate-90" : "rotate-90"
                    )}
                  >
                    <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-full" />
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
