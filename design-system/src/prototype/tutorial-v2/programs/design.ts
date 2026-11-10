import { useEffect, useState } from "react"

/* Which Programs flow draws, and which of its states, picked from the prototype bar. "current" is the
   list as Oak copied it from client-v2; "new" is the redesign (research/program-redesign). Both live in
   localStorage, so the tablet's frame follows the bar. On load the address wins:
   ?prog=current|new and ?progState=<state> put a link on one design and one state */

export type ProgramsDesign = "current" | "new"

/** The states the bar can force on the new flow. "live" is the flow as it runs. Picking any other one
 * takes the flow to where that state shows and sets it up there. Today's states draw the catalog programs
 * in read mode (the build server builds Anchor only); the Later ones, from "build-live" on, draw them in
 * build mode while picked, as when the server learns Native (CONSENSUS-delta 2.10) */
export const PROG_STATES = {
  live: "Live",
  "catalog-loading": "Catalog loading",
  "catalog-failed": "Catalog failed",
  "catalog-returning": "Catalog returning",
  "your-programs-1": "Your programs: 1",
  "your-programs-3": "Your programs: 3",
  "your-programs-5": "Your programs: 5",
  opening: "Opening from GitHub",
  "open-not-found": "Open: not found",
  "open-rate-limited": "Open: rate limited",
  "open-network": "Open: network",
  "open-several": "Open: several programs",
  "read-mid": "Read: mid path",
  "read-done": "Read: done",
  "read-typing": "Read: typing",
  "ts-client": "TS client project",
  "build-live": "Build path: live",
  "build-slow": "Build slow",
  "build-failed": "Build failed",
  "build-no-answer": "Build didn't start",
  "deploy-network": "Deploy network",
  "no-idl": "No IDL",
  "returning-deployed": "Returning, deployed",
  "returning-edited": "Returning, edited",
  "projects-9": "Projects: 9 of 10",
  "projects-full-deploy": "Projects: full at deploy",
  "projects-full-edit": "Projects: full at edit",
} as const

export type ProgState = keyof typeof PROG_STATES

const IDS = Object.keys(PROG_STATES) as ProgState[]

/** Later: when Native builds. The bar's label adds "(later)" */
export const LATER = new Set(IDS.slice(IDS.indexOf("build-live")))

// v2: New became the default on 06.11, so a Current stored before that no longer wins
const DESIGN_KEY = "oak.programsDesign.v2"
const STATE_KEY = "oak.programsState"
const EVENT = "oak.programs"

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

const params = new URLSearchParams(location.search)
const askedDesign = params.get("prog")
if (askedDesign === "current" || askedDesign === "new") store(DESIGN_KEY, askedDesign)
const askedState = params.get("progState")
if (askedState && askedState in PROG_STATES) store(STATE_KEY, askedState)

export const readProgramsDesign = (): ProgramsDesign => (load(DESIGN_KEY) === "current" ? "current" : "new")

export const readProgState = (): ProgState => {
  const v = load(STATE_KEY)
  return v && v in PROG_STATES ? (v as ProgState) : "live"
}

export function setProgramsDesign(design: ProgramsDesign) {
  store(DESIGN_KEY, design)
  window.dispatchEvent(new Event(EVENT))
}

export function setProgState(state: ProgState) {
  store(STATE_KEY, state)
  window.dispatchEvent(new Event(EVENT))
}

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

export const useProgramsDesign = () => usePicked(readProgramsDesign)
export const useProgState = () => usePicked(readProgState)

/** Listens for bar picks, own window and frames alike */
export function onProgramsPick(fn: () => void) {
  window.addEventListener(EVENT, fn)
  window.addEventListener("storage", fn)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener("storage", fn)
  }
}
