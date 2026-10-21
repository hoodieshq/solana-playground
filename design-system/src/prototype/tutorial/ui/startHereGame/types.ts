import type { ComponentType } from "react"

/** What the shell hands a mechanic. `onSolved` says who the program greets once the puzzle is
 * solved, or null while it isn't (a name field can be emptied again). `onRun` is for a mechanic
 * that has its own way to run, like Enter in a field. `locked` is on from Run to the end.
 * `announce` speaks a line to screen readers, for what the screen shows by shape or motion */
export type PlayProps = {
  onSolved: (who: string | null) => void
  onRun: () => void
  locked: boolean
  announce: (message: string) => void
}

/** One mini game. `hook` is the banner's title while playing and `line` says what to do, in a
 * sentence. Each one teaches one Anchor idea and ends in the same place: Run, and the log */
export type Mechanic = {
  id: string
  hook: string
  line: string
  Play: ComponentType<PlayProps>
}
