import { useEffect } from "react"

import { flashKeys } from "../../desktop/flash"
import { PRIMARY_KEYS } from "../../desktop/keys"
import { build, getPrograms, runClient, useProject } from "../store"
import { GuideColumn } from "./shell/GuideColumn"
import { ManageProjects } from "./shell/Quota"
import { flashReadOnly, runPrimary } from "./shell/util"
import { Workspace } from "./shell/Workspace"

/** The project shell (CONSENSUS.md): the Guide's column on the left as in a lesson, one thread under a
 * step strip, and the workspace on the right with the file tabs, the program chip and the expert's
 * Build and Deploy in one head row. ⌘↵ runs the live step from anywhere but the composer; ⌘⇧B builds,
 * and in read mode flashes the Read only chip, since there is nothing to build.
 * ⌘J is the console's own key, ⌘E the workspace's */
export function Shell({ id }: { id: string }) {
  const p = useProject(id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const target = e.target instanceof HTMLElement ? e.target : null
      const now = getPrograms().projects[id]
      if (!now) return
      if (e.key === "Enter") {
        if (e.repeat || target?.closest('[data-slot="composer"]')) return
        e.preventDefault()
        flashKeys(PRIMARY_KEYS)
        runPrimary(id, now)
        return
      }
      if (e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        if (now.read) flashReadOnly()
        else if (now.framework === "ts-client") runClient(id)
        else build(id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [id])

  if (!p) return null
  return (
    <>
      <GuideColumn p={p} />
      <Workspace p={p} />
      <ManageProjects />
    </>
  )
}
