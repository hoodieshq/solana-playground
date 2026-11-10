import { useEffect } from "react"

import { Programs as CurrentPrograms } from "../desktop/Programs"
import { useStore } from "../store"
import { applyProgState, setBarShow } from "./bar"
import { PROG_STATES, onProgramsPick, readProgramsDesign, useProgramsDesign, type ProgState } from "./design"
import { Catalog } from "./next/Catalog"
import { Shell } from "./next/Shell"
import { go, setShowPrograms, usePrograms } from "./store"

/** The Programs screen in the design the prototype bar picks. A project is the redesign's shell
 * whatever the pick, since New project lands there too */
export function ProgramsScreen() {
  const design = useProgramsDesign()
  const route = usePrograms((s) => s.route)
  if (route.at === "project") return <Shell key={route.id} id={route.id} />
  if (design === "current") return <CurrentPrograms />
  return <Catalog />
}

/** True while the redesign's project shell is on screen: the nav folds to its rail, as in a lesson */
export function useInProject() {
  const { s } = useStore()
  const at = usePrograms((p) => p.route.at)
  return s.screen === "programs" && at === "project"
}

/** The nav's Programs opens the catalog from anywhere, a project included */
export const toCatalog = () => go({ at: "catalog" })

/** Mounted once beside the screens: lets openProject, openProgram and the bar bring the Programs
 * screen forward from anywhere */
export function ProgramsBridge() {
  const { dispatch } = useStore()
  useEffect(() => {
    const show = () => dispatch({ type: "open", screen: "programs" })
    setShowPrograms(show)
    setBarShow(show)
    // A link with ?progState= (the review board's) sets its state up on load, as picking it in the bar does
    const asked = new URLSearchParams(location.search).get("progState")
    if (asked && asked in PROG_STATES && readProgramsDesign() === "new") applyProgState(asked as ProgState)
    // A framed tablet hears the bar through storage: switching to New brings Programs forward
    return onProgramsPick(() => {
      if (readProgramsDesign() === "new") show()
    })
  }, [dispatch])
  return null
}
