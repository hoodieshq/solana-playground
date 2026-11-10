import { useEffect, useState } from "react"

import { on } from "../ui/events"
import { setNewProjectState, useNewProjectState } from "./design"
import { FirstLight } from "./next/FirstLight"
import { FirstLightPage } from "./next/FirstLightPage"
import { land, takePreset, type Preset } from "./next/open"
import { isLanding, LANDINGS } from "./next/states"

/** New project's dialog, First Light. It opens on "new-project:open"
 * (openNewProject, openFirstLight), or by itself while the bar forces one of its states. Every
 * opening mounts the flow afresh, as the product mounts its dialog. First Light's landing states open
 * no dialog: they land in the shell */
export function NewProjectDialog() {
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
  const landing = isLanding(state)
  useEffect(() => {
    if (landing) land(LANDINGS[state as keyof typeof LANDINGS], true)
  }, [landing, state])
  const forced = state !== "live" && !landing
  const close = () => {
    setOpen(false)
    // Closing a forced state goes back to the live flow
    if (forced) setNewProjectState("live")
  }
  // The phone app (phone and upright tablet) gets the page, the desktop screens the dialog
  const Shape = document.documentElement.classList.contains("phone") ? FirstLightPage : FirstLight
  // No BuildHint: the shell's Guide already leads with a Build card, and the hint repeated it over
  // the code (decision, can change: mount <BuildHint /> here to bring it back)
  return (
    <Shape
      key={`${state}-${session}`}
      open={open || forced}
      onClose={close}
      forced={forced ? state : undefined}
      preset={open ? preset : undefined}
    />
  )
}
