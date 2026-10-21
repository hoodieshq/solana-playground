import { BlocksGame } from "./blocks"
import { CommentGame } from "./comment"
import { FixGame } from "./fix"
import { MatchGame } from "./match"
import { NameGame } from "./name"
import { PredictGame } from "./predict"
import { RouteGame } from "./route"
import { WhichGame } from "./which"
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
  {
    id: "fix",
    hook: "Fix the build",
    line: "The compiler stopped at one line. Pick the fix that builds, then hit Run.",
    Play: FixGame,
  },
  {
    id: "blocks",
    hook: "Build hello in 20 seconds",
    line: "Four lines of Anchor. Snap them in, hit Run.",
    Play: BlocksGame,
  },
  {
    id: "comment",
    hook: "Get it to build",
    line: "Two lines don't belong. Tap a line to comment it out.",
    Play: CommentGame,
  },
  {
    id: "predict",
    hook: "Predict the log",
    line: "When hello runs, msg! writes one line. Pick what the log shows, then hit Run.",
    Play: PredictGame,
  },
  {
    id: "route",
    hook: "Route the transaction",
    line: "Tap the four stops a call to hello goes through, in order.",
    Play: RouteGame,
  },
  {
    id: "match",
    hook: "Match the macros",
    line: "Four words every Anchor program uses. Tap one, then what it does.",
    Play: MatchGame,
  },
  {
    id: "which",
    hook: "Which one builds?",
    line: "Two bodies for hello, one character apart. Pick the one that compiles.",
    Play: WhichGame,
  },
]
