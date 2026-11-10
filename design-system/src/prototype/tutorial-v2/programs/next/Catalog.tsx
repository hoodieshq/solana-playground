import { useEffect, useRef, useState } from "react"

import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { Page } from "../../desktop/Catalog"
import { CATALOG, TOPICS, type ProgramMeta } from "../data"
import { useProgState } from "../design"
import { go, openProgram, usePrograms } from "../store"
import { ProgramBanner } from "./catalog-banner"
import { FOCUS, Problem, ProgramIcon, StandingWord, resumeLabel, standing } from "./catalog-parts"
import { YourPrograms } from "./YourPrograms"

/* The redesigned catalog (ui-design.md 2, CONSENSUS.md row 5): the Tutorials gallery's head and card,
   no Open button. The whole card opens the program's project, there is no preview page (Almaz, 6 Nov);
   a program you already opened says where it stands and offers Continue */

/** Try again in the prototype: a short skeleton flash, then the forced state again */
const RETRY_MS = 700

export function Catalog({ phone = false }: { phone?: boolean }) {
  const forced = useProgState()
  // Today the build server builds Anchor only, so every catalog program is read (CONSENSUS-delta 2.2)
  const read = !usePrograms((s) => s.native)
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
      <h1 className={cn("font-heading font-normal tracking-[-0.015em] text-foreground", phone ? "mb-1 flex h-11 items-center text-[1.75rem]" : cn("mt-6 text-display", read ? "mb-2" : "mb-6"))}>Programs</h1>
      {read && (
        <p className={cn("mb-6 max-w-[40rem] font-read text-muted-foreground", phone ? "text-[0.8125rem] leading-[1.125rem]" : "text-[0.875rem] leading-5")}>
          Solana's example programs, in Native Rust. Playground can't build it yet, so for now you read them with the assistant.
        </p>
      )}

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

/** The programs by what they are for, as the Tutorials gallery groups its lessons by level */
function Sections({ list }: { list: ProgramMeta[] }) {
  return (
    <div className="flex flex-col gap-8">
      {TOPICS.map((topic) => {
        const items = list.filter((p) => p.topic === topic)
        if (!items.length) return null
        const id = `programs-${topic.toLowerCase().replace(/ /g, "-")}`
        return (
          <section key={topic} aria-labelledby={id}>
            {/* No count beside the heading: the cards under it show how many there are */}
            <h2 id={id} className="mb-3 font-heading text-[1.25rem] leading-[1.5rem] font-medium text-foreground">
              {topic}
            </h2>
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
              {items.map((p) => (
                <ProgramCard key={p.slug} p={p} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** One program, as the gallery card. A stretched button opens its project; on a returning card
 * Continue sits over it */
function ProgramCard({ p }: { p: ProgramMeta }) {
  const project = usePrograms((s) => Object.values(s.projects).find((x) => x.slug === p.slug))
  const native = usePrograms((s) => s.native)
  const st = project ? standing(project) : null
  // No mark while every card is read only; memo and noop say they can be called, where the standing goes
  const callable = !native && !st && p.callable && !!p.devnetId

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] content-start items-start gap-x-3.5 rounded-panel border border-border bg-surface-panel p-4 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] has-[[data-open]:active]:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface-panel))] motion-reduce:transition-none">
      <button
        type="button"
        data-open
        onClick={() => openProgram(p.slug)}
        aria-label={st ? `${p.name}, ${st.word.toLowerCase()}. Open` : `Open ${p.name}`}
        className={cn("absolute inset-0 cursor-pointer rounded-panel", FOCUS)}
      />
      <ProgramIcon p={p} className="pointer-events-none row-span-2" />
      {/* No eyebrow (it said "SPL", as the name does) and no arrow square: the whole card is the button */}
      <h3 title={p.name} className="pointer-events-none line-clamp-1 min-w-0 font-heading text-[1.125rem] leading-[1.25] font-normal tracking-[-0.015em] text-foreground">
        {p.name}
      </h3>
      {project && (
        <Button variant="outline" size="sm" onClick={() => go({ at: "project", id: project.id })} className="relative z-10 -my-1 cursor-pointer pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:content-['']">
          {resumeLabel(project)}
        </Button>
      )}
      <p className="pointer-events-none col-span-2 col-start-2 mt-1 line-clamp-2 text-[0.8125rem] leading-[1.4] text-foreground/78">{p.description}</p>
      {/* The state leads; a card's column is too narrow for it and the facts on one row, so it takes its own */}
      {st && <StandingWord s={st} className="pointer-events-none col-span-2 col-start-2 mt-2 text-[0.8125rem] leading-[1.125rem]" />}
      {callable && (
        <span className="pointer-events-none col-span-2 col-start-2 mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem] text-muted-foreground">
          <Send aria-hidden="true" className="size-3.5" />
          Call on devnet
        </span>
      )}
    </div>
  )
}

/** The card's shape in grey: same grid, padding and height */
function CardSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 rounded-panel border border-border bg-surface-panel p-4">
      <Skeleton className="row-span-2 size-11 rounded-[9px] motion-reduce:animate-none" />
      <Skeleton className="h-[18px] w-40 motion-reduce:animate-none" />
      <div className="col-span-2 col-start-2 mt-2 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full motion-reduce:animate-none" />
        <Skeleton className="h-3 w-[70%] motion-reduce:animate-none" />
        <Skeleton className="mt-1.5 h-2.5 w-30 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
