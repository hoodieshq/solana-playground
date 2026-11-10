import { useEffect, useState } from "react"
import { toast } from "sonner"

import { setNavState, type NavStateId } from "../navStates"

/* Which New project flow draws, and which of its states, picked from the prototype bar. "current" is
   the product's flow as client-v2 has it (scope/interface-2); "next" is the redesign, still to come.
   Both live in localStorage, so the phone's and the tablet's iframes follow the bar. On load the
   address wins: ?np=current|next and ?npState=<state> put a link on one design and one state */

export type NewProjectDesign = "current" | "next"

/** The states the bar can force. "live" is the flow as it runs; every other one opens the dialog
 * in that state */
export const NP_STATES = {
  live: "Live",
  invalid: "Invalid name",
  taken: "Name taken",
  creating: "Creating",
  failed: "Create failed",
  "lists-loading": "Lists loading",
  "lists-failed": "Lists failed",
  "no-match": "No match",
  downloading: "Program downloading",
  "open-failed": "Program open failed",
} as const

export type NewProjectState = keyof typeof NP_STATES

type NextState = { label: string; group?: string; nav?: NavStateId }

/** First Light's forced states (CONSENSUS.md, section 7), in the bar's groups. `nav` is the nav state
 * the bar sets with it */
export const NP_NEXT_STATES = {
  live: { label: "Live" },
  idle: { label: "Idle · Anchor picked", group: "Framework starter" },
  "starter-native": { label: "Native picked", group: "Framework starter" },
  "starter-seahorse": { label: "Seahorse picked", group: "Framework starter" },
  "starter-client": { label: "TypeScript client picked", group: "Framework starter" },
  creating: { label: "Creating", group: "Create" },
  "create-failed": { label: "Create failed", group: "Create" },
  "create-failed-details": { label: "Create failed · details open", group: "Create" },
  "express-failed": { label: "Express create failed", group: "Create" },
  "example-ready": { label: "Examples · none picked", group: "Example program" },
  "example-picked": { label: "Example picked", group: "Example program" },
  "example-downloading": { label: "Program downloading", group: "Example program" },
  "examples-loading": { label: "Examples loading", group: "Example program" },
  "examples-failed": { label: "Examples failed", group: "Example program" },
  "examples-no-match": { label: "Examples · no match", group: "Example program" },
  "import-empty": { label: "Import · empty", group: "Import" },
  "import-not-github": { label: "Import · not a GitHub link", group: "Import" },
  "import-typed": { label: "Import · link typed", group: "Import" },
  "import-fetching": { label: "Import · fetching", group: "Import" },
  "import-choose": { label: "Import · pick a program", group: "Import" },
  "import-not-found": { label: "Import · not found (signed out)", group: "Import", nav: "returning" },
  "import-not-found-signed-in": { label: "Import · not found (signed in)", group: "Import", nav: "all-set" },
  "import-private": { label: "Import · private repo", group: "Import", nav: "all-set" },
  "import-no-program": { label: "Import · no Solana program", group: "Import" },
  "import-rate-limited": { label: "Import · rate limited", group: "Import" },
  "import-too-large": { label: "Import · repo too large", group: "Import" },
  "import-failed": { label: "Import · broke mid copy", group: "Import" },
  "import-offline": { label: "Import · offline", group: "Import", nav: "offline" },
  "describe-empty": { label: "Describe · empty", group: "Describe it", nav: "all-set" },
  "describe-typed": { label: "Describe · typed", group: "Describe it", nav: "all-set" },
  "describe-sending": { label: "Describe · sending", group: "Describe it", nav: "all-set" },
  "describe-off": { label: "Describe · assistant off", group: "Describe it", nav: "returning" },
  "describe-limit": { label: "Describe · assistant limit", group: "Describe it", nav: "ai-limit" },
  offline: { label: "Offline", group: "Environment", nav: "offline" },
  "signed-in": { label: "Signed in", group: "Environment", nav: "all-set" },
  "session-ended": { label: "Session ended", group: "Environment", nav: "session-ended" },
  "landing-hint": { label: "First landing · Build hint", group: "Landing" },
  "landing-express": { label: "Express landing · building", group: "Landing" },
  "landing-import": { label: "Import landing", group: "Landing" },
  "landing-describe": { label: "Describe landing", group: "Landing", nav: "all-set" },
  "into-empty": { label: "Fill an empty project", group: "Concept" },
} satisfies Record<string, NextState>

export type NextStateId = keyof typeof NP_NEXT_STATES

/** A forced state of either design */
export type AnyState = NewProjectState | NextStateId

const DESIGN_KEY = "oak.newProjectDesign"
const STATE_KEY = "oak.newProjectState"
const EVENT = "oak.newProject"

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage off: the pick lasts in this window only
  }
}

const load = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// The address wins on load. Only the top window has it: the frames read what it stored
const params = new URLSearchParams(location.search)
const askedDesign = params.get("np")
if (askedDesign === "current" || askedDesign === "next") store(DESIGN_KEY, askedDesign)
const askedState = params.get("npState")
if (askedState && (askedState in NP_STATES || askedState in NP_NEXT_STATES)) store(STATE_KEY, askedState)
// A linked state brings its nav along, as picking it in the bar does
const linkedNav = askedState && askedState in NP_NEXT_STATES ? (NP_NEXT_STATES[askedState as NextStateId] as { nav?: NavStateId }).nav : undefined
if (linkedNav) setNavState(linkedNav)

const readDesign = (): NewProjectDesign => (load(DESIGN_KEY) === "current" ? "current" : "next")

/** A state of the design in force, else "live" */
const readState = (): AnyState => {
  const v = load(STATE_KEY)
  return v && v in (readDesign() === "next" ? NP_NEXT_STATES : NP_STATES) ? (v as AnyState) : "live"
}

/** Switching design starts its flow live */
export function setNewProjectDesign(design: NewProjectDesign) {
  store(DESIGN_KEY, design)
  store(STATE_KEY, "live")
  window.dispatchEvent(new Event(EVENT))
}

export function setNewProjectState(state: AnyState) {
  store(STATE_KEY, state)
  window.dispatchEvent(new Event(EVENT))
}

/** Re-reads `get` when the bar picks something: its own window hears the event, the frames hear storage */
function usePicked<T>(get: () => T): T {
  const [v, setV] = useState(get)
  useEffect(() => {
    const sync = () => setV(get())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [get])
  return v
}

export const useNewProjectDesign = () => usePicked(readDesign)
export const useNewProjectState = () => usePicked(readState)

export type Project = { name: string; framework: string }

/** Runs once Start has made a project. The prototype has no editor yet, so it only says so; the
 * project's landing replaces this toast later */
export function onProjectCreated(project: Project) {
  toast.success(`Created ${project.name}`, { description: `A new ${project.framework} project, saved in this browser` })
}
