import type { ComponentType } from "react"

/** What the shell hands a mechanic. `onSolved` says who the program greets once the puzzle is
 * solved, or null while it isn't (a name field can be emptied again), and an optional `note` the
 * log shows above itself, like the player's guess. `onRun` is for a mechanic that has its own way
 * to run, like Enter in a field. `locked` is on from Run to the end.
 * `announce` speaks a line to screen readers, for what the screen shows by shape or motion */
export type PlayProps = {
  onSolved: (who: string | null, note?: string) => void
  onRun: () => void
  locked: boolean
  announce: (message: string) => void
}

/** One mini game. `hook` is the banner's title while playing and `line` says what to do, in a
 * sentence of two lines at most. Each one teaches one Anchor idea, fits the banner's height
 * without scrolling, and ends in the same place: Run, and the log */
export type Mechanic = {
  id: string
  hook: string
  line: string
  Play: ComponentType<PlayProps>
}
