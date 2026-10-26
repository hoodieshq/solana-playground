import { insertBlock } from "./check"
import { STEPS } from "./data"
import { liveAsk, type State } from "./store"

/** Where an open question's answer will land in `file`: a dry run of the write. A ghost line when
 * it lands past the end or on an empty line, a tint on the lines it replaces otherwise. The desktop
 * editor and the phone's Code space draw the same place */
export function landingFor(s: State, file: string): { lines: number[]; ghost: boolean } | null {
  const ask = liveAsk(s)
  if (!ask || !ask.beat.writes || ask.beat.writes.file !== file) return null
  const step = STEPS[ask.turn.step]
  const code = s.files[file] ?? ""
  const dry = insertBlock(code, ask.beat.writes.block, step.target, step.start)
  const first = dry.lines.find((n) => (dry.code.split("\n")[n - 1] ?? "").trim() !== "") ?? dry.lines[0]
  if (!first) return null
  const rows = code.split("\n")
  const empty = code.trim() === "" ? true : first > rows.length || (rows[first - 1] ?? "").trim() === ""
  if (empty) return { lines: [code.trim() === "" ? 1 : first], ghost: true }
  return { lines: dry.lines.filter((n) => n <= rows.length && (rows[n - 1] ?? "").trim() !== ""), ghost: false }
}
