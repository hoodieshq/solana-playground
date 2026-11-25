import { useEffect, useRef, useState } from "react"

import { Clock } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { Page } from "../../desktop/Catalog"
import { CATALOG, TOPICS, type ProgramMeta } from "../data"
import { useProgState } from "../design"
import { openProgram, usePrograms } from "../store"
import { ProgramBanner } from "./catalog-banner"
import { FOCUS, Problem, standing } from "./catalog-parts"
import { DoneVeil } from "../../ui/TileCover"
import { ProgramCover } from "./ProgramCover"
import { YourPrograms } from "./YourPrograms"

/* The redesigned catalog (ui-design.md 2, CONSENSUS.md row 5): the Tutorials gallery's head and card,
   no Open button. The whole card opens the program's project, there is no preview page (Almaz, 6 Nov);
   a program you already opened says where it stands */

/** Try again in the prototype: a short skeleton flash, then the forced state again */
const RETRY_MS = 700

export function Catalog({ phone = false }: { phone?: boolean }) {
  const forced = useProgState()
  const [retrying, setRetrying] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const retry = () => {
    setRetrying(true)
    timer.current = window.setTimeout(() => setRetrying(false), RETRY_MS)
  }

  const loading = forced === "catalog-loading" || retrying
  const failed = forced === "catalog-failed" && !retrying

  const body = (
    <>
      {/* No search (Almaz, 6 Nov): eleven programs in three sections read at a glance. On the phone the
          heading sits under the menu button as the Tutorials page's does */}
      {/* At the sections' 20: the banner under it leads the page at 36 (28 on the phone), and the nav already
          says where you are (Almaz, 25 Nov); 16 to the banner, as a section's heading to its content */}
      <h1 className={cn("font-heading text-20 leading-6 font-headline text-foreground", phone ? "mb-1 flex h-11 items-center" : "mt-6 mb-4")}>Programs</h1>

        {loading ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
            <span className="sr-only">Loading programs</span>
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : failed ? (
          <Problem title="Couldn't load programs" line="Check your connection and try again." onRetry={retry} />
        ) : (
          <>
            <ProgramBanner phone={phone} />
            {/* 48 between your projects and Solana's: a step clearly bigger than the 24 inside a section, now
                that both are the same cards (Almaz, 25 Nov) */}
            <div className="flex flex-col gap-12">
              <YourPrograms />
              <Sections list={CATALOG} />
            </div>
          </>
        )}
    </>
  )
  if (phone) return body
  return (
    <Page>
      <div className="mx-auto flex w-[min(50rem,100%)] flex-col px-8 pt-8 pb-16">{body}</div>
    </Page>
  )
}

/** Solana's examples under one heading of their own, by what they are for. Without it "Basics" stood
 * level with "Your projects" and read as more of your own (Almaz, 11 Nov) */
function Sections({ list }: { list: ProgramMeta[] }) {
  const native = usePrograms((s) => s.native)
  // The ones you can build and deploy lead each section while the rest are for reading (Almaz, 18 Nov:
  // Programs is a sandbox, and the first card of Basics opened a program with nothing to run)
  const runnable = (p: ProgramMeta) => native || p.kind === "anchor"
  return (
    <section aria-labelledby="programs-examples" className="flex flex-col gap-6">
      {/* 16 to the first topic, as Your projects' heading to its cards; the topics keep 24 between them (Almaz, 25 Nov) */}
      <h2 id="programs-examples" className="-mb-2 font-heading text-20 leading-6 font-headline text-foreground">
        Solana examples
      </h2>
      {TOPICS.map((topic) => {
        const all = list.filter((p) => p.topic === topic)
        const items = [...all.filter(runnable), ...all.filter((p) => !runnable(p))]
        if (!items.length) return null
        const id = `programs-${topic.toLowerCase().replace(/ /g, "-")}`
        return (
          <section key={topic} aria-labelledby={id}>
            {/* No count beside the heading: the cards under it show how many there are */}
            {/* 16 in the headings' face, muted: at 13 the group read smaller than the cards' 16 names it groups;
                now 20 section, 16 grey group, 16 light card name (Almaz, 25 Nov) */}
            <h3 id={id} className="mb-2.5 font-heading text-16 leading-5 font-headline text-muted-foreground">
              {topic}
            </h3>
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
              {items.map((p) => (
                <ProgramCard key={p.slug} p={p} />
              ))}
            </div>
          </section>
        )
      })}
    </section>
  )
}

/** One program (Almaz, 10 Nov): its cover of tiles, the name and what it does. No grey foot with its
 * instructions and minutes: it was one more strip that said little before the click (Almaz, 25 Nov). A
 * stretched button opens its project. No Continue on a returning card: the card is the button already, and a second one
 * crowded the name (Almaz, 18 Nov) */
function ProgramCard({ p }: { p: ProgramMeta }) {
  const project = usePrograms((s) => Object.values(s.projects).find((x) => x.slug === p.slug))
  const st = project ? standing(project) : null

  return (
    <div className="group/card relative flex flex-col overflow-hidden rounded-panel border border-border bg-surface-panel transition-colors duration-100 hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] has-[[data-open]:active]:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface-panel))] motion-reduce:transition-none">
      <button
        type="button"
        data-open
        onClick={() => openProgram(p.slug)}
        aria-label={st ? `${p.title}, ${st.word.toLowerCase()}. Open` : `Open ${p.title}`}
        className={cn("absolute inset-0 cursor-pointer rounded-panel", FOCUS)}
      />
      <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] content-start items-start gap-x-3.5 p-4">
        {/* 56, the size the pictures are drawn to (TileCover); at 72 the cover outweighed the words (Almaz, 25 Nov) */}
        <div data-done={st?.done || undefined} className="pointer-events-none relative row-span-3 size-14 overflow-hidden rounded-xl">
          <ProgramCover p={p} className="size-14" />
          {st?.done && <DoneVeil />}
        </div>
        {/* No eyebrow (it said "SPL", as the name does) and no arrow square: the whole card is the button */}
        <h4 title={p.title} className="pointer-events-none line-clamp-1 min-w-0 font-heading text-16 leading-5 font-normal tracking-tight text-foreground">
          {p.title}
        </h4>
        {/* Two faces in a card, the name and the rest: the words and the state below them share one muted
            style, so the name stands apart (Almaz, 25 Nov, after Claude's skill cards) */}
        {/* Always two lines tall, a short line too, so every card in a row has its last line at one height */}
        <p className="pointer-events-none col-span-2 col-start-2 mt-1 line-clamp-2 min-h-10 text-13 leading-5 text-muted-foreground">{p.description}</p>
        {/* Under the words, one line: Done in green once it's done, else how long it takes. Steps and "Read only"
            left the card: Your projects says where yours stand, and a program says it's read only once opened
            (Almaz, 25 Nov) */}
        <span className="pointer-events-none col-span-2 col-start-2 mt-2 inline-flex items-center gap-1.5 text-13 leading-5 text-muted-foreground tabular-nums">
          {st?.done ? (
            <span className="text-success">Done</span>
          ) : (
            <>
              <Clock aria-hidden="true" className="size-3.5" />
              {`${p.minutes} min`}
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/** The card's shape in grey: same grid, padding and height */
function CardSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 rounded-panel border border-border bg-surface-panel p-4">
      <Skeleton className="row-span-2 size-14 rounded-xl motion-reduce:animate-none" />
      <Skeleton className="h-[18px] w-40 motion-reduce:animate-none" />
      <div className="col-span-2 col-start-2 mt-2 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full motion-reduce:animate-none" />
        <Skeleton className="h-3 w-[70%] motion-reduce:animate-none" />
        <Skeleton className="mt-1.5 h-2.5 w-30 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
