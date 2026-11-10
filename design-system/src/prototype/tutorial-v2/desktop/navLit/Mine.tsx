import { useRef, useState } from "react"

import { cn } from "@/lib/utils"

import type { ProjectRow } from "../../navStates"
import { soon } from "../Catalog"
import { LitIcon } from "./icons"
import { NavGroup } from "./NavGroup"
import { ProgressRing } from "./ProgressRing"
import { setPinned } from "./pins"
import { NavRow } from "./NavRow"
import { useRoomy } from "./parts"
import { useScrollEdges } from "./useScrollEdges"

/** Projects show twelve rows, then Show all: at 30 a row, twelve fit a laptop's nav with room to spare.
 * Pinned ones sit in Pinned above and never hide */
const CAP = 12

const ALL_KEY = "pg-proto-nav-projects-all"
const readAll = () => {
  try {
    return localStorage.getItem(ALL_KEY) === "1"
  } catch {
    return false
  }
}

/** A project as Mine draws it: the state's row, or a finished lesson's code, which opens its lesson */
export type ProjectEntry = ProjectRow & { onOpen?: () => void }

/** A lesson as Mine reads it: where it is, of how many, the next step, finished */
export type LessonItem = { name: string; at: number; of: number; next?: string; done: boolean; pinned: boolean; current: boolean; onOpen: () => void }

const caret = (up: boolean) => <span className={cn("flex size-3 [&>svg]:size-full", up && "rotate-180")}><LitIcon name="caret" /></span>

/** Every lesson and project leads with what it is, in the icons' column: a lesson the cap Tutorials has,
 * a project a folder. A lesson's progress ring (setup's ring, lit up to the step you're on, as the
 * lesson's own step bar lights it, full once finished) is its status, so it sits at the right, where
 * the ⋯ takes its place under the pointer (Almaz, 10 Nov: in the icon's place it read as a spinner) */
const ring = (done: number, of: number, tablet: boolean) => (
  <span className="flex">
    <ProgressRing done={done} of={of} size={tablet ? 18 : 16} />
  </span>
)

function LessonRow({ l }: { l: LessonItem }) {
  const tablet = useRoomy()
  return (
    <NavRow
      kind="item"
      glyph={<LitIcon name="tutorials" />}
      meta={ring(l.done ? l.of : l.at, l.of, tablet)}
      label={l.name}
      name={l.done ? `${l.name}, lesson, finished` : `${l.name}, lesson, step ${l.at} of ${l.of}`}
      tip={l.done ? "Finished" : l.at === 0 ? `Not started · ${l.of} steps` : `Step ${l.at} of ${l.of}${l.next ? `: ${l.next}` : ""}`}
      current={l.current}
      menu={{ name: l.name, lesson: true, pinned: l.pinned, current: l.current, notSynced: false, onOpen: l.onOpen, onPin: () => setPinned(l.name, !l.pinned) }}
      onClick={l.onOpen}
    />
  )
}

function ProjectItem({ p, onPick }: { p: ProjectEntry; onPick: () => void }) {
  const notSynced = p.marker === "Not synced"
  return (
    <NavRow
      kind="item"
      glyph={<LitIcon name="project" />}
      label={p.name}
      name={notSynced ? `${p.name}, not synced` : undefined}
      attention={notSynced ? "Not synced" : undefined}
      tip={notSynced ? "Not saved to your account yet. We'll keep trying." : undefined}
      menu={{ name: p.name, lesson: false, pinned: !!p.pinned, current: false, notSynced, onOpen: onPick, onPin: () => setPinned(p.name, !p.pinned) }}
      onClick={onPick}
    />
  )
}

type Props = {
  lessons: LessonItem[]
  projects: ProjectEntry[] | "loading"
  /** With nothing in progress, the next tutorial on the ladder */
  upNext?: { name: string; of: number; onOpen: () => void }
  /** A first visit with nothing yet: the one suggestion */
  onStartFirst: () => void
  onPick: (then: () => void) => () => void
}

/** Your work: Pinned, then Projects, in one box that scrolls on its own with faded edges, so the
 * places above and the foot below never move. Lessons are projects too: they lead the Projects list,
 * told apart by their progress ring, as the old nav listed them, with no Learning heading of their own */
export function Mine({ lessons, projects, upNext, onStartFirst, onPick }: Props) {
  const tablet = useRoomy()
  const box = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(box)
  const [all, setAll] = useState(readAll)
  const [filter, setFilter] = useState("")

  const showAll = (v: boolean) => {
    setAll(v)
    setFilter("")
    try {
      localStorage.setItem(ALL_KEY, v ? "1" : "0")
    } catch {
      // Storage off: the choice lasts until the page reloads
    }
  }

  const list = projects === "loading" ? [] : projects
  const empty = projects !== "loading" && list.length === 0 && lessons.length === 0

  // Pinned lessons and projects have a group of their own, above the rest (Claude's Starred, Lindy's Favorites)
  const pinnedLessons = lessons.filter((l) => l.pinned)
  const pinnedProjects = list.filter((p) => p.pinned)
  const rest = list.filter((p) => !p.pinned)

  const learning = lessons.filter((l) => !l.pinned)

  // Eight rows, then Show all; expanded, a filter on top
  const capped = rest.length > CAP
  const shown = capped && !all ? rest.slice(0, CAP) : rest.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()))

  const service = (label: string, up: boolean, onClick: () => void) => <NavRow key={label} kind="service" glyph={caret(up)} label={label} onClick={onClick} />

  return (
    <div
      ref={box}
      data-scrollbox
      data-more-top={edges.top || undefined}
      data-more-bottom={edges.bottom || undefined}
      className={cn("fade-edges min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 [--fade-size:24px]", "mt-3")}
    >
      {/* The places above sit as far from the first heading as one group sits from the next, and each
          heading hugs its own rows */}
      <div className={cn("flex flex-col", tablet ? "gap-3" : "gap-2")}>
        {projects === "loading" && (
          <div aria-label="Loading your work" className="flex flex-col gap-0.5">
            {[70, 55, 82].map((w) => (
              <div key={w} className={cn("lit-skeleton flex items-center gap-2.5 px-2", tablet ? "h-11 px-1.5" : "h-[1.875rem]")}>
                <span className="h-2 rounded-[4px] bg-surface-raised" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        )}

        {/* A first visit: the Projects heading over the one suggestion, as the next tutorial shows later,
            in place of a sentence about what will show here and a "4 steps" that cut the name short */}
        {empty && (
          <NavGroup label="Projects">
            {[<NavRow key="start" kind="item" glyph={ring(0, 4, tablet)} label="Start Hello Anchor" tip="4 steps" onClick={onStartFirst} />]}
          </NavGroup>
        )}

        <NavGroup label="Pinned">
          {[
            ...pinnedLessons.map((l) => <LessonRow key={l.name} l={l} />),
            ...pinnedProjects.map((p) => <ProjectItem key={p.name} p={p} onPick={onPick(p.onOpen ?? soon)} />),
          ]}
        </NavGroup>

        <NavGroup label="Projects">
          {[
            ...learning.map((l) => <LessonRow key={l.name} l={l} />),
            ...(upNext
              ? [
                  <NavRow
                    key="up-next"
                    kind="item"
                    glyph={ring(0, upNext.of, tablet)}
                    label={upNext.name}
                    name={`Up next: ${upNext.name}, ${upNext.of} steps`}
                    meta={<span className="text-[0.75rem] font-act tracking-[0.01em] text-(color:--text-quiet)">Up next</span>}
                    tip={`${upNext.of} steps`}
                    onClick={upNext.onOpen}
                  />,
                ]
              : []),
            ...(capped && all
              ? [
                  <label key="filter" className={cn("flex items-center gap-2 rounded-lg bg-(--nav-hover) px-2", tablet ? "h-11" : "h-7")}>
                    <LitIcon name="search" className="size-3 shrink-0 text-(color:--text-quiet)" />
                    <span className="sr-only">Filter projects</span>
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter by name"
                      className="min-w-0 flex-1 bg-transparent text-[0.75rem] text-foreground outline-none placeholder:text-(color:--text-quiet)"
                    />
                  </label>,
                ]
              : []),
            ...shown.map((p) => <ProjectItem key={p.name} p={p} onPick={onPick(p.onOpen ?? soon)} />),
            ...(capped ? [all ? service("Show fewer", true, () => showAll(false)) : service(`Show all ${rest.length}`, false, () => showAll(true))] : []),
          ]}
        </NavGroup>
      </div>
    </div>
  )
}
