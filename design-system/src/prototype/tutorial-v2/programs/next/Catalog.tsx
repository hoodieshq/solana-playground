import { useEffect, useRef, useState } from "react"

import { BookOpen } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { Page } from "../../desktop/Catalog"
import { CATALOG, TOPICS, type ProgramMeta } from "../data"
import { useProgState } from "../design"
import { openProgram, usePrograms } from "../store"
import { ProgramBanner } from "./catalog-banner"
import { FOCUS, Problem, StandingWord, standing } from "./catalog-parts"
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
      <h1 className={cn("font-heading font-normal tracking-tight text-foreground", phone ? "mb-1 flex h-11 items-center text-28" : "mt-6 mb-6 text-28 leading-8")}>Programs</h1>

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
            <div className="flex flex-col gap-8">
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
      <h2 id="programs-examples" className="font-heading text-20 leading-6 font-headline text-foreground">
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
            <h3 id={id} className="mb-2.5 text-13 leading-5 font-act text-muted-foreground">
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

/** One program (Almaz, 10 Nov): its cover of tiles, the name and what it does, and at the foot what it
 * is made of, in the code's own face: its instructions by name, and how long a read takes. A stretched
 * button opens its project. No Continue on a returning card: the card is the button already, and a second one
 * crowded the name (Almaz, 18 Nov) */
function ProgramCard({ p }: { p: ProgramMeta }) {
  const project = usePrograms((s) => Object.values(s.projects).find((x) => x.slug === p.slug))
  const native = usePrograms((s) => s.native)
  const st = project ? standing(project) : null
  // Said on the card, before the click: this one is for reading, and whether Solana's copy can be called
  const readOnly = !native && p.kind !== "anchor" && !st?.done
  const callable = readOnly && p.callable && !!p.devnetId

  return (
    <div className="group/card relative flex flex-col overflow-hidden rounded-panel border border-border bg-surface-panel transition-colors duration-100 hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] has-[[data-open]:active]:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface-panel))] motion-reduce:transition-none">
      <button
        type="button"
        data-open
        onClick={() => openProgram(p.slug)}
        aria-label={st ? `${p.name}, ${st.word.toLowerCase()}. Open` : `Open ${p.name}`}
        className={cn("absolute inset-0 cursor-pointer rounded-panel", FOCUS)}
      />
      <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] content-start items-start gap-x-3.5 p-4">
        <ProgramCover p={p} className="pointer-events-none row-span-3 size-[4.5rem] rounded-[14px]" />
        {/* No eyebrow (it said "SPL", as the name does) and no arrow square: the whole card is the button */}
        <h4 title={p.name} className="pointer-events-none line-clamp-1 min-w-0 font-heading text-16 leading-5 font-normal tracking-tight text-foreground">
          {p.name}
        </h4>
        <p className="pointer-events-none col-span-2 col-start-2 mt-1 line-clamp-2 text-13 leading-5 text-foreground/78">{p.description}</p>
        {/* The state leads; a card's column is too narrow for it and the facts on one row, so it takes its own */}
        {st && !readOnly && <StandingWord s={st} className="pointer-events-none col-span-2 col-start-2 mt-2 text-13 leading-5" />}
        {readOnly && (
          <span className="pointer-events-none col-span-2 col-start-2 mt-2 inline-flex items-center gap-1.5 text-13 leading-5 text-muted-foreground">
            <BookOpen aria-hidden="true" className="size-3.5" />
            {callable ? "Read only · call on devnet" : "Read only"}
            {/* One you opened says so on the same line: read only has no stage to stand at */}
            {st && (
              <>
                <span aria-hidden="true" className="text-subtle">
                  ·
                </span>
                Opened
              </>
            )}
          </span>
        )}
      </div>
      {/* The card's foot, on the grey every Oak card sets its foot on: the program's instructions as its code
          names them, fading out where they run past the edge, and the minutes at the end */}
      <div className="pointer-events-none flex h-9 shrink-0 items-center gap-3 border-t border-border bg-foreground/[0.025] px-4 font-mono text-13 leading-4 text-muted-foreground">
        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
          <span className="text-subtle">fn </span>
          {p.ixs.map((ix, i) => (
            <span key={ix.name}>
              {i > 0 && <span className="text-subtle"> · </span>}
              {ix.name}
            </span>
          ))}
        </span>
        <span className="shrink-0 tabular-nums">{`${p.minutes} min`}</span>
      </div>
    </div>
  )
}

/** The card's shape in grey: same grid, padding and height */
function CardSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 rounded-panel border border-border bg-surface-panel p-4 pb-13">
      <Skeleton className="row-span-2 size-[4.5rem] rounded-[14px] motion-reduce:animate-none" />
      <Skeleton className="h-[18px] w-40 motion-reduce:animate-none" />
      <div className="col-span-2 col-start-2 mt-2 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full motion-reduce:animate-none" />
        <Skeleton className="h-3 w-[70%] motion-reduce:animate-none" />
        <Skeleton className="mt-1.5 h-2.5 w-30 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
