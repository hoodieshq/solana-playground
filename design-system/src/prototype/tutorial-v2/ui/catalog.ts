import { TUTORIALS, type TutorialCard } from "../data"
import { playable } from "../lessons"

/** What the gallery says about a tutorial. The description is the tutorial's own, from the
 * Playground repo: client/public/tutorials/<slug>/data.json, and for the three hello tutorials,
 * which have no data.json there, client/src/tutorials/<slug>/<slug>.ts. `parts` is the number of
 * pages in its pages folder, `by` its authors from the same file */
type About = { description: string; parts: number; by?: string }

const ABOUT: Record<string, About> = {
  "hello-anchor": { description: "Hello world program with Anchor framework.", parts: 4, by: "acheron" },
  "hello-seahorse": { description: "Hello world program with Seahorse framework in Python.", parts: 4, by: "acheron" },
  "hello-solana": { description: "Hello world program with Native Solana/Rust.", parts: 3, by: "acheron" },
  "counter-pda-tutorial": { description: "Create a simple counter that will store the number of times is called.", parts: 10, by: "cleon" },
  "tiny-adventure": {
    description: "Create a very simple on chain game. Moving a character left and right. Will be connected to Unity Game Engine later on.",
    parts: 2,
    by: "Jonas Hahn",
  },
  "tiny-adventure-two": { description: "Giving out SOL rewards to players.", parts: 4, by: "Jonas Hahn" },
  "expense-tracker": { description: "Learn how to create an expense tracker app and understand PDAs", parts: 5, by: "Bolt / Syed Aabis Akhtar" },
  "tictactoe-seahorse": { description: "Create your own 2 player on-chain classic game of tic-tac-toe.", parts: 5, by: "lostin" },
  "todo-app-seahorse": { description: "Build a todo app to keep track of tasks.", parts: 5, by: "lostin" },
  "bank-simulator": { description: "Learn on-chain automation by creating bank program with interest returns.", parts: 5, by: "Bolt / Syed Aabis Akhtar" },
  "battle-coins": {
    description:
      "Learn to create a token mint with metadata, mint tokens, and burn tokens. Defeat enemies to earn tokens and restore your health by burning tokens.",
    parts: 7,
    by: "Jonas Hahn and John",
  },
  "boss-battle": {
    description:
      "How to use XORShift random number generator in an onchain game. Spawn and attack an enemy boss, dealing pseudo-random damage utilizing the current slot as a source of randomness.",
    parts: 5,
    by: "Jonas Hahn and John",
  },
  "faucet-seahorse": { description: "Build a token faucet with a price oracle.", parts: 7, by: "lostin" },
  lumberjack: { description: "How to build an energy system on chain.", parts: 3, by: "Jonas Hahn" },
  "spl-token-vault": {
    description: "Learn how to create and SPL token with meta data and icon using metaplex sdk and saving it in an anchor program.",
    parts: 7,
    by: "Jonas Hahn",
  },
  "zero-copy": { description: "How to handle memory and big accounts.", parts: 1, by: "Jonas Hahn" },
}

export type Entry = TutorialCard & About

export const CATALOG: Entry[] = TUTORIALS.map((t) => ({ ...t, ...ABOUT[t.slug] }))

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const
export type Framework = TutorialCard["framework"]
export type FrameworkFilter = "all" | Framework
export const FRAMEWORKS: { value: FrameworkFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Anchor", label: "Anchor" },
  { value: "Seahorse", label: "Seahorse" },
  { value: "Native", label: "Native" },
]

/** A tutorial's name as the product shows it: the data keeps upstream's name, which is also its key */
const SHOWN: Record<string, string> = { "tictactoe-seahorse": "Tic-tac-toe Seahorse" }
export const shownName = (t: Entry) => SHOWN[t.slug] ?? t.name

/** The name upstream keys a tutorial by, where the prototype's data spells it differently. The
 * product's covers hash it to place the mark, so the same name gives the same cover */
const UPSTREAM: Record<string, string> = { "spl-token-vault": "Spl Token Vault" }
export const upstreamName = (t: Entry) => UPSTREAM[t.slug] ?? t.name

/** The desktop card's line, as the product's tutorials page has it: the level is the section's
 * heading, so the line names the framework and the first author */
export const productMeta = (t: Entry) => [t.framework, t.by && `by ${t.by.split(" and ")[0]}`].filter(Boolean).join(" \u00b7 ")

/** Search reads the name, the description and the framework. The filter narrows by framework */
export function filterCatalog(query: string, framework: FrameworkFilter) {
  const q = query.trim().toLowerCase()
  return CATALOG.filter(
    (t) =>
      (framework === "all" || t.framework === framework) &&
      (!q || [t.name, shownName(t), t.description, t.level, t.framework].some((f) => f.toLowerCase().includes(q)))
  )
}

/** The cards by level, without the levels nothing is left in. The tutorials the prototype runs lead
 * their level, so a section folded to its first cards still shows them */
export function byLevel(list: Entry[]) {
  const runs = (t: Entry) => (playable(t.slug) ? 0 : 1)
  return LEVELS.map((level) => ({ level, items: list.filter((t) => t.level === level).sort((a, b) => runs(a) - runs(b)) })).filter((g) => g.items.length > 0)
}

/** What the results line says: "3 results", or "No Seahorse tutorials match “vault”" */
export function resultsLine(count: number, query: string, framework: FrameworkFilter) {
  const kind = framework === "all" ? "tutorials" : `${framework} tutorials`
  const q = query.trim()
  if (count === 0) return q ? `No ${kind} match “${q}”` : `No ${kind} yet`
  return `${count} ${count === 1 ? "result" : "results"}`
}

/** The search field's hint names the filter when one is on, the one place it shows while searching */
export const searchHint = (framework: FrameworkFilter) =>
  framework === "all" ? `Search ${CATALOG.length} tutorials` : `Search ${framework} tutorials`
