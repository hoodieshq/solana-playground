import { useEffect, useState } from "react"

import { on } from "../ui/events"
import { NewProject as CurrentNewProject } from "./current/NewProject"
import { StartFromScratch as CurrentStartFromScratch } from "./current/StartFromScratch"
import { setNewProjectState, useNewProjectDesign, useNewProjectState, type NewProjectState, type NextStateId } from "./design"
import { FirstLight } from "./next/FirstLight"
import { FirstLightPage } from "./next/FirstLightPage"
import { land, takePreset, type Preset } from "./next/open"
import { isLanding, LANDINGS } from "./next/states"

/** New project's dialog, in the design the prototype bar picks. It opens on "new-project:open"
 * (openNewProject, openFirstLight), or by itself while the bar forces one of its states. Every
 * opening mounts the flow afresh, as the product mounts its dialog. First Light's landing states open
 * no dialog: they land in the shell */
export function NewProjectDialog() {
  const design = useNewProjectDesign()
  const state = useNewProjectState()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)
  const [preset, setPreset] = useState<Preset>()
  useEffect(() =>
    on("new-project:open", () => {
      setPreset(takePreset())
      setSession((n) => n + 1)
      setOpen(true)
    })
  )
  const landing = design === "next" && isLanding(state as NextStateId)
  useEffect(() => {
    if (landing) land(LANDINGS[state as keyof typeof LANDINGS], true)
  }, [landing, state])
  const forced = state !== "live" && !landing
  const close = () => {
    setOpen(false)
    // Closing a forced state goes back to the live flow
    if (forced) setNewProjectState("live")
  }
  if (design === "next") {
    // The phone app (phone and upright tablet) gets the page, the desktop screens the dialog
    const Shape = document.documentElement.classList.contains("phone") ? FirstLightPage : FirstLight
    // No BuildHint: the shell's Guide already leads with a Build card, and the hint repeated it over
    // the code (decision, can change: mount <BuildHint /> here to bring it back)
    return (
      <Shape
        key={`${state}-${session}`}
        open={open || forced}
        onClose={close}
        forced={forced ? (state as NextStateId) : undefined}
        preset={open ? preset : undefined}
      />
    )
  }
  return <CurrentNewProject key={`${design}-${state}-${session}`} open={open || forced} onClose={close} state={state as NewProjectState} />
}

/** Start from scratch on its own, as Home unfolds it under its New project tile. First Light has no
 * unfold: its tile opens the dialog */
export function StartFromScratch() {
  const design = useNewProjectDesign()
  return design === "next" ? null : <CurrentStartFromScratch key={design} />
}
