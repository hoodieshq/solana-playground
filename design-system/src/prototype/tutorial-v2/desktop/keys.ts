import { askBlocks, liveAct, liveCard, type Action, type State } from "../store"

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** ⌘Enter, Ctrl+Enter off a Mac: the one key for the live card's main action, whatever it is.
 * ⌘B toggles the sidebar in the product, so the tutorial doesn't teach it as Build */
export const PRIMARY_KEYS = mac ? "⌘↵" : "Ctrl ↵"

/** ⌘B, Ctrl+B off a Mac: folds and unfolds the nav, as it does in the product */
export const MENU_KEYS = mac ? "⌘B" : "Ctrl B"

/** ⌘J, Ctrl+J off a Mac: opens and closes the terminal */
export const TERMINAL_KEYS = mac ? "⌘J" : "Ctrl J"

/** ⌘E, Ctrl+E off a Mac: the file tree */
export const FILES_KEYS = mac ? "⌘E" : "Ctrl E"

/** ⌥↑ and ⌥↓: the previous and next step's divider */
export const STEP_KEYS = mac ? "⌥↑ ⌥↓" : "Alt ↑ Alt ↓"

/** What ⌘Enter does on the live card (spec 9.2), or null while nothing can be done. An open question
 * is answered with 1 to 3 or skipped with S: ⌘Enter doesn't run the step's act past it */
export function primaryFor(s: State): Action | null {
  switch (liveCard(s)) {
    case "intro":
      return { type: "start" }
    case "fail":
      return { type: "explain" }
    case "win":
      return { type: "next" }
    case "act": {
      const act = liveAct(s)
      if (!act || act.turn.state === "running" || s.phase !== "idle" || askBlocks(s)) return null
      if (act.turn.act === "call" && !s.draft.trim()) return null
      return { type: "act", act: act.turn.act }
    }
    default:
      return null
  }
}

/** What plain Enter does when no field has the focus: Start and Next only */
export function enterFor(s: State): Action | null {
  const live = liveCard(s)
  if (live === "intro") return { type: "start" }
  if (live === "win") return { type: "next" }
  return null
}

/** Every shortcut, for the Keyboard shortcuts dialog (spec 9.4) */
export const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: PRIMARY_KEYS, what: "Run the live action" },
  { keys: "↵", what: "Start, or go to the next step" },
  { keys: "1 2 3", what: "Pick an answer" },
  { keys: "S", what: "Skip the question" },
  { keys: "H", what: "Get a hint" },
  { keys: MENU_KEYS, what: "Menu" },
  { keys: FILES_KEYS, what: "Files" },
  { keys: TERMINAL_KEYS, what: "Terminal" },
  { keys: STEP_KEYS, what: "Previous and next step" },
]
