import { NameGame } from "./name"
import type { Mechanic } from "./types"

/** The mechanics in the order the rotation shows them, one more each page load. The order is the
 * research's ranking, best first. Each game is its own file; its words live here, next to the rest */
export const MECHANICS: Mechanic[] = [
  {
    id: "name",
    hook: "Make hello say your name",
    line: "Type a name into msg!, then hit Run. Your program logs it.",
    Play: NameGame,
  },
]
