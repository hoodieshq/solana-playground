import { ChevronDown } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { LESSONS } from "../lessons"
import { storageKey, useStore } from "../store"

/* The prototype bar's Tutorials control, as Programs has its own (Almaz, 10 Nov): where the learner
   stands across the lessons, so the Tutorials page and the nav can be seen in each case. A lesson's
   progress is read when the page loads, so a pick writes it and loads the page again on Tutorials */

const STATES = {
  live: "Live",
  "first-done": "Hello Anchor done",
  "in-progress-1": "In progress: 1",
  "in-progress-3": "In progress: 3",
  "in-progress-5": "In progress: 5",
} as const
type TutState = keyof typeof STATES
const SHORT: Record<TutState, string> = { live: "Live", "first-done": "1st done", "in-progress-1": "1 left", "in-progress-3": "3 left", "in-progress-5": "5 left" }

const STATE_KEY = "oak.tutorialsState"
const SHOW_KEY = "oak.tutorialsShow"
/** Which lesson is open (host.tsx) */
const LESSON_KEY = "pg-proto-lesson-v2"
/** Left half done, a step or two in; Hello Anchor, the ladder's first, stays the banner's */
const LEFT = ["counter-pda-tutorial", "bank-simulator", "battle-coins", "expense-tracker", "tiny-adventure"]

const read = (): TutState => {
  try {
    const s = localStorage.getItem(STATE_KEY)
    return s && s in STATES ? (s as TutState) : "live"
  } catch {
    return "live"
  }
}

const save = (slug: string, i: number, done: boolean) => {
  const n = LESSONS[slug].steps.length
  const passed = Array.from({ length: n }, (_, k) => done || k < Math.min(i % 3, n - 1))
  const at = Date.now() - i * 3600e3
  localStorage.setItem(storageKey(slug), JSON.stringify({ v: 2, startedAt: at, finishedAt: done ? at : null, passed, thread: [], queue: [] }))
}

function apply(s: TutState) {
  try {
    localStorage.setItem(STATE_KEY, s)
    if (s !== "live") {
      for (const slug of Object.keys(LESSONS)) localStorage.removeItem(storageKey(slug))
      if (s === "first-done") {
        save("hello-anchor", 0, true)
        // The next on the ladder is the one you'd open after it, so it's the open lesson, not started
        localStorage.setItem(LESSON_KEY, "lumberjack")
      } else {
        localStorage.setItem(LESSON_KEY, "hello-anchor")
        LEFT.slice(0, Number(s.slice(-1))).forEach((slug, i) => save(slug, i, false))
      }
    }
    localStorage.setItem(SHOW_KEY, "1")
  } catch {
    // Storage blocked: nothing to seed
  }
  // Without ?tutorial=, which would open that lesson over the one just picked
  const url = new URL(location.href)
  url.searchParams.delete("tutorial")
  location.replace(url)
}

/** Every tutorial's and program's banner art side by side, a board of its own (review-high/banner-icons):
 * in place of a list that put one at a time in the banner (Almaz, 10 Nov) */
export function BannerIconsLink() {
  return (
    <DropdownMenuItem asChild>
      <a href="/prototype/review-high/banner-icons/" target="_blank" rel="noreferrer">
        All banner icons ↗
      </a>
    </DropdownMenuItem>
  )
}

export function TutorialsControls() {
  const state = read()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-44">
          {/* Short on the bar, which has no room left at 1440; the menu says it in full */}
          <span className="truncate">{`Tutorials: ${SHORT[state]}`}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80vh] w-56 overflow-y-auto">
        <DropdownMenuRadioGroup value={state} onValueChange={(v) => apply(v as TutState)}>
          {(Object.keys(STATES) as TutState[]).map((id) => (
            <DropdownMenuRadioItem key={id} value={id}>
              {STATES[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <BannerIconsLink />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Mounted beside the screens: after a pick loads the page, it opens Tutorials. In a device frame the
 * frame's own page is the one that does it */
export function TutorialsBridge() {
  const { dispatch } = useStore()
  useEffect(() => {
    try {
      if (localStorage.getItem(SHOW_KEY) !== "1") return
      localStorage.removeItem(SHOW_KEY)
    } catch {
      return
    }
    dispatch({ type: "open", screen: "gallery" })
  }, [dispatch])
  return null
}
