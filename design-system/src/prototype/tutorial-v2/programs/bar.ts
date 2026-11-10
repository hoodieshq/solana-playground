import { LATER, type ProgState } from "./design"
import { getPrograms, go, openProgram, resetPrograms, seed, seedReturning, seedTsClient, seedYours, setNative } from "./store"

/* Takes the flow to where a bar state shows and sets it up there. Runs in the window whose bar was
   used; a framed tablet follows through storage */

let showScreen: () => void = () => {}
export const setBarShow = (fn: () => void) => {
  showScreen = fn
}

export function applyProgState(s: ProgState) {
  // A Later state is the build server building Native: the programs open in build mode while it's picked.
  // Switching between today and later starts over, so no project carries the other mode's thread
  const native = LATER.has(s)
  const keepProjects = (s === "live" || s === "catalog-loading" || s === "catalog-failed") && getPrograms().native === native
  if (!keepProjects) resetPrograms(native)
  setNative(native)
  switch (s) {
    case "live":
      if (getPrograms().route.at !== "project") go({ at: "catalog" })
      break
    case "catalog-loading":
    case "catalog-failed":
      go({ at: "catalog" })
      break
    case "catalog-returning":
      seedReturning()
      break
    case "your-programs-1":
    case "your-programs-3":
    case "your-programs-5":
      seedYours(Number(s.slice(-1)))
      break
    case "opening":
      openProgram("spl-memo", { hold: true })
      break
    case "open-not-found":
      openProgram("spl-memo", { fail: "notFound" })
      break
    case "open-rate-limited":
      openProgram("spl-memo", { fail: "rateLimited" })
      break
    case "open-network":
      openProgram("spl-memo", { fail: "network" })
      break
    case "open-several":
      openProgram("spl-name-service", { several: true })
      break
    case "ts-client":
      seedTsClient()
      break
    default:
      seed(s)
  }
  showScreen()
}
