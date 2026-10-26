import { useEffect, type Dispatch } from "react"

import { stageMs, type Action, type State, type Turn } from "./store"

/** How long a turn holds the floor before the next one posts: a say types out in about half a
 * second, a card settles, a divider gives the eye a beat (spec 6.7, D28) */
function pace(t: Turn | undefined) {
  if (!t) return 0
  switch (t.kind) {
    case "say":
      return 800
    case "anchor":
      return 450
    case "result":
      return 500
    case "win":
      return 400
    case "you":
      return 350
    default:
      return 300
  }
}

/** The clock behind the conversation and the runs, one for the whole prototype so desktop and phone
 * advance the same way, whatever is mounted (spec 9.1). It posts what waits in the queue at a
 * speaking pace, and moves a run through its stages with the timings of D29 */
export function Runner({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  const last = s.thread[s.thread.length - 1]
  const waiting = s.queue.length
  useEffect(() => {
    if (!waiting) return
    const wait = Math.max(120, (last?.at ?? 0) + pace(last) - Date.now())
    const t = window.setTimeout(() => dispatch({ type: "tick" }), wait)
    return () => window.clearTimeout(t)
  }, [waiting, last, dispatch])

  const run = s.run
  const stage = run ? run.stages[run.stage] : null
  useEffect(() => {
    if (!run || stage === null) return
    const t = window.setTimeout(() => dispatch({ type: "stage" }), stageMs(stage))
    return () => window.clearTimeout(t)
    // A new stage, or a new run, restarts the clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.at, run?.stage, stage, dispatch])
  return null
}
