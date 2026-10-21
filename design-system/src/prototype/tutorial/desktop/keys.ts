import { STEPS } from "../data"
import { fixFor, type Action, type State } from "../store"

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** ⌘Enter, Ctrl+Enter off a Mac: the one key for the action bar's main action, whatever the step
 * is waiting for. ⌘B toggles the sidebar in the product, so the tutorial doesn't teach it as Build */
export const PRIMARY_KEYS = mac ? "⌘↵" : "Ctrl ↵"

/** ⌘B, Ctrl+B off a Mac: folds and unfolds the nav, as it does in the product */
export const MENU_KEYS = mac ? "⌘B" : "Ctrl B"

/** ⌘J, Ctrl+J off a Mac: opens and closes the terminal */
export const TERMINAL_KEYS = mac ? "⌘J" : "Ctrl J"

/** What ⌘Enter does right now, or null while nothing can be done: something runs, or the quick
 * check waits for an answer. A failed build explains itself first, in the column, which isn't a
 * store action: "explain" asks the step to do it */
export function primaryFor(s: State, asking: boolean): Action | "explain" | null {
  const step = STEPS[s.step]
  switch (s.phase) {
    case "idle":
      return step.deploy ? { type: "deploy" } : { type: "buildOwn" }
    case "patch":
      return asking ? null : { type: "apply" }
    case "failed":
      if (!s.explained) return "explain"
      return fixFor(s) ? { type: "reviewFix" } : null
    case "passed":
      return { type: "next" }
    default:
      return null
  }
}
