import { useEffect } from "react"

import { flashKeys } from "../../desktop/flash"
import { PRIMARY_KEYS } from "../../desktop/keys"
import { build, getPrograms, runClient, useProject } from "../store"
import { ManageProjects } from "./shell/Quota"
import { runNext } from "./shell/Stages"
import { flashReadOnly } from "./shell/util"
import { Workspace } from "./shell/Workspace"

/** The project shell: the whole program at once, as an IDE shows it (the client, 17 Nov). One bar with
 * the stages, the files beside the editor, the console under it, the assistant at the side for
 * questions. ⌘↵ runs the next stage from anywhere but the composer; ⌘⇧B builds,
 * and in read mode flashes the Read only chip, since there is nothing to build.
 * ⌘J is the console's own key, ⌘⇧E and ⌘L the workspace's */
export function Shell({ id }: { id: string }) {
  const p = useProject(id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const target = e.target instanceof HTMLElement ? e.target : null
      const now = getPrograms().projects[id]
      // A draft has no code: nothing to run or build
      if (!now || now.draft) return
      if (e.key === "Enter") {
        if (e.repeat || target?.closest('[data-slot="composer"]')) return
        e.preventDefault()
        flashKeys(PRIMARY_KEYS)
        runNext(now)
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
      <Workspace p={p} />
      <ManageProjects />
    </>
  )
}
