import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { LESSON, openLesson, TUTORIALS } from "./data"
import { LESSONS, playable } from "./lessons"
import { progressOf, savedProgress, Store, useStore, type Progress, type Screen } from "./store"
import { DECK } from "./view"

// Which lesson is open. Each lesson has a store of its own, keyed by its slug, so switching lessons
// mounts a fresh one that loads that lesson's saved progress. The choice is remembered, so a reload,
// a view switch and the device frame all open the same lesson

const KEY = "pg-proto-lesson-v2"

/** The lesson to open: the address's `?tutorial=`, then the one open last time. A deck slide is
 * always Hello Anchor, which the deck is about */
export function firstLesson(): string {
  if (DECK !== null) return "hello-anchor"
  const asked = new URLSearchParams(location.search).get("tutorial")
  if (asked && playable(asked)) {
    // Remembered at once: the device frame's page loads its own address, without `?tutorial=`
    try {
      localStorage.setItem(KEY, asked)
    } catch {
      // Storage blocked: the frame opens the first lesson
    }
    return asked
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && playable(saved)) return saved
  } catch {
    // Storage blocked: the first lesson
  }
  return "hello-anchor"
}

type Open = (slug: string, screen?: Screen) => void
const Ctx = createContext<Open>(() => {})

export function LessonHost({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => {
    const slug = firstLesson()
    openLesson(slug)
    return { slug, screen: undefined as Screen | undefined }
  })
  const go = useCallback<Open>((slug, screen = "step") => {
    try {
      localStorage.setItem(KEY, slug)
    } catch {
      // Private mode: this lesson stays open until the reload
    }
    // An address that named the lesson names the new one, so a reload stays on it
    const url = new URL(location.href)
    if (url.searchParams.has("tutorial")) {
      url.searchParams.set("tutorial", slug)
      history.replaceState(history.state, "", url)
    }
    openLesson(slug)
    setOpen({ slug, screen })
  }, [])
  // The tab names the lesson that's open
  useEffect(() => {
    document.title = `${LESSONS[open.slug]?.card.name ?? "Tutorials"} · Playground prototype v2`
  }, [open.slug])
  return (
    <Ctx.Provider value={go}>
      <Store key={open.slug} screen={open.screen}>
        {children}
      </Store>
    </Ctx.Provider>
  )
}

/** The names of the tutorials this prototype runs, for the note on the ones it doesn't */
const RUNS = Object.values(LESSONS).map((l) => l.card.name)
export const notHere = () => toast(`Only ${RUNS.slice(0, -1).join(", ")} and ${RUNS[RUNS.length - 1]} are in this prototype`)

/** Opens a tutorial by slug: the open lesson's screen, another lesson's store, or a note that it
 * isn't in the prototype */
export function useOpenTutorial() {
  const go = useContext(Ctx)
  const { dispatch } = useStore()
  return (slug: string, screen: Screen = "step") => {
    if (!playable(slug)) return notHere()
    if (slug === LESSON.card.slug) return dispatch({ type: "open", screen })
    go(slug, screen)
  }
}

/** How far any lesson got: the open one from its store, the others from what they saved */
export function useProgress(slug: string): Progress {
  const { s } = useStore()
  if (slug === LESSON.card.slug) return progressOf(s)
  return savedProgress(slug, LESSONS[slug]?.steps.length ?? 0)
}

/** The tutorial the gallery puts first: the first of the ladder not finished yet, or the last one */
export const LADDER = ["hello-anchor", "lumberjack", "zero-copy"]

export function useFeatured() {
  const { s } = useStore()
  const done = (slug: string) => (slug === LESSON.card.slug ? s.finishedAt !== null : savedProgress(slug, 0).finished)
  return LADDER.find((slug) => !done(slug)) ?? LADDER[LADDER.length - 1]
}

export const cardOf = (slug: string) => TUTORIALS.find((t) => t.slug === slug)!

/** The lessons this browser has started, as the menu's projects list shows them */
export function useStartedLessons() {
  const { s } = useStore()
  return Object.values(LESSONS)
    .filter((l) => (l.card.slug === LESSON.card.slug ? s.startedAt !== null : savedProgress(l.card.slug, l.steps.length).started))
    .map((l) => ({ slug: l.card.slug, name: l.card.name, open: l.card.slug === LESSON.card.slug }))
}
