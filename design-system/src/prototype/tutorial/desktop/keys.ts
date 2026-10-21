import { STEPS } from "../data"
import type { Action, State } from "../store"

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** ⌘Enter, Ctrl+Enter off a Mac: the one key for the action bar's main action, whatever the step
 * is waiting for. ⌘B toggles the sidebar in the product, so the tutorial doesn't teach it as Build */
export const PRIMARY_KEYS = mac ? "⌘↵" : "Ctrl ↵"

/** What ⌘Enter does right now, or null while nothing can be done: something runs, or the quick
 * check waits for an answer */
export function primaryFor(s: State, asking: boolean): Action | null {
  const step = STEPS[s.step]
  switch (s.phase) {
    case "idle":
      return step.deploy ? { type: "deploy" } : { type: "buildOwn" }
    case "patch":
      return asking ? null : { type: "apply" }
    case "failed":
      return { type: "retry" }
    case "passed":
      return { type: "next" }
    default:
      return null
  }
}
