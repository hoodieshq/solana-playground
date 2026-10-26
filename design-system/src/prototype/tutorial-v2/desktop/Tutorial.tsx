import { useCallback, useEffect, useState } from "react"

import { STEPS } from "../data"
import { useStore } from "../store"
import type { Jump } from "../ui/Conversation"
import { ChatColumn } from "./ChatColumn"
import { flashKeys } from "./flash"
import { PRIMARY_KEYS, enterFor, primaryFor } from "./keys"
import { Workspace } from "./Workspace"

/** The tutorial, in one layout from the intro to the finish (D2): the chat, then the workspace, with
 * the nav's rail before both. Here live what the two share: the step bar's jump, the step being read,
 * the file tree's popover, and the keys of spec 9.2 */
export function Tutorial() {
  const { s, dispatch } = useStore()
  const [jump, setJump] = useState<Jump>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [treeOpen, setTreeOpen] = useState(false)
  const onViewing = useCallback((step: number | null) => setViewing(step), [])

  const pick = (step: number) => {
    setJump((j) => ({ step, n: (j?.n ?? 0) + 1 }))
    dispatch({ type: "goto", step })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const field = !!target?.closest("textarea, input, [contenteditable]")
      // The composer sends on its own Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (e.repeat || target?.closest('[data-slot="composer"]')) return
        const action = primaryFor(s)
        if (!action) return
        e.preventDefault()
        flashKeys(PRIMARY_KEYS)
        dispatch(action)
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        if (s.tree === "docked") dispatch({ type: "tree", state: "closed" })
        else setTreeOpen((o) => !o)
        return
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && s.started) {
        e.preventDefault()
        const at = viewing ?? s.step
        const to = Math.max(0, Math.min(s.step, at + (e.key === "ArrowUp" ? -1 : 1)))
        if (STEPS[to]) pick(to)
        return
      }
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !field && !target?.closest("button, a, [role='separator'], [role='menuitem']")) {
        const action = enterFor(s)
        if (!action) return
        e.preventDefault()
        dispatch(action)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <>
      <ChatColumn jump={jump} onPick={pick} viewing={viewing} onViewing={onViewing} />
      <Workspace treeOpen={treeOpen} onTree={setTreeOpen} />
    </>
  )
}
