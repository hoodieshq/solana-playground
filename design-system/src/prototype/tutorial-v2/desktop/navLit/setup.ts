import { useEffect, useState } from "react"

import type { NavState, SetupStep } from "../../navStates"
import type { Choices } from "./choices"

/* Setup as Lit Path reads it: the nav's row and its popover are one object, so one Hide
   hides both and the account menu brings them back. Home has no card of its own: it said the same. Hidden is remembered per nav state, so
   picking another state in the bar shows its setup as the state has it */

const KEY = "pg-proto-nav-setup-hidden"
const EVENT = "pg-proto-nav-setup-hidden"

const readHidden = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function setSetupHidden(stateId: string, hidden: boolean) {
  const ids = readHidden().filter((id) => id !== stateId)
  try {
    localStorage.setItem(KEY, JSON.stringify(hidden ? [...ids, stateId] : ids))
  } catch {
    // Storage off: Hide lasts until the page reloads
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useSetupHidden(stateId: string) {
  const [ids, setIds] = useState(readHidden)
  useEffect(() => {
    const sync = () => setIds(readHidden())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  return ids.includes(stateId)
}

/** What a done step says when the state doesn't: the model, the network, the login, the wallet */
const DONE_VALUE = (c: Choices) => [c.model, c.network, "@samrivera", "7xKX…gAsU"]
/** What each step is for, under its name in the popover: a beginner sees why before doing it */
const STEP_HINT = ["Answers questions as you learn and code", "Where your programs deploy and run", "Keeps your work on any device", "Sign with your own wallet"]
export type SetupView = { steps: (SetupStep & { hint: string })[]; done: number; total: number; label: string; tip: string }

/** The state's setup while it's unfinished, or null once every step is done or there's none */
export function setupOf(state: NavState, c: Choices): SetupView | null {
  if (!state.setup) return null
  // A model connected or a network picked in Status finishes that step here too
  const doneByChoice = (i: number) => (i === 0 && c.connected) || (i === 1 && c.picked)
  const steps = state.setup.steps.map((s, i) => {
    const st = s.state === "todo" && doneByChoice(i) ? "done" : s.state
    return {
      ...s,
      state: st,
      // Not responding is the network's own word, in amber, not the step's value
      value: st === "warn" ? "Not responding" : st === "done" ? (i < 2 ? DONE_VALUE(c)[i] : (s.value ?? DONE_VALUE(c)[i])) : undefined,
      hint: STEP_HINT[i],
    }
  })
  const total = steps.length
  const done = steps.filter((s) => s.state === "done").length
  if (done === total) return null
  const open = steps.filter((s) => s.state !== "done")
  // One action finishes it, so the row names that action
  const label = open.length === 1 ? open[0].label : "Get set up"
  const tip = open.length === 1 ? "One step left" : `Your setup: ${done} of ${total} done`
  return { steps, done, total, label, tip }
}
