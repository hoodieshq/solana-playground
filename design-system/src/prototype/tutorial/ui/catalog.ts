import { toast } from "sonner"

import { STEPS, TUTORIALS, type TutorialCard } from "../data"
import { targetFor } from "../store"

/** What the gallery says about a tutorial. The description is the tutorial's own, from the
 * Playground repo: client/public/tutorials/<slug>/data.json, and for the three hello tutorials,
 * which have no data.json there, client/src/tutorials/<slug>/<slug>.ts. `parts` is the number of
 * pages in its pages folder. Nobody has timed them, so only Hello Anchor, the one this prototype
 * runs, says how long it takes */
type About = { description: string; parts: number }

const ABOUT: Record<string, About> = {
  "hello-anchor": { description: "Hello world program with Anchor framework.", parts: 4 },
  "hello-seahorse": { description: "Hello world program with Seahorse framework in Python.", parts: 4 },
  "hello-solana": { description: "Hello world program with Native Solana/Rust.", parts: 3 },
  "counter-pda-tutorial": { description: "Create a simple counter that will store the number of times is called.", parts: 10 },
  "tiny-adventure": {
    description: "Create a very simple on chain game. Moving a character left and right. Will be connected to Unity Game Engine later on.",
    parts: 2,
  },
  "tiny-adventure-two": { description: "Giving out SOL rewards to players.", parts: 4 },
  "expense-tracker": { description: "Learn how to create an expense tracker app and understand PDAs", parts: 5 },
  "tictactoe-seahorse": { description: "Create your own 2 player on-chain classic game of tic-tac-toe.", parts: 5 },
  "todo-app-seahorse": { description: "Build a todo app to keep track of tasks.", parts: 5 },
  "bank-simulator": { description: "Learn on-chain automation by creating bank program with interest returns.", parts: 5 },
  "battle-coins": {
    description:
      "Learn to create a token mint with metadata, mint tokens, and burn tokens. Defeat enemies to earn tokens and restore your health by burning tokens.",
    parts: 7,
  },
  "boss-battle": {
    description:
      "How to use XORShift random number generator in an onchain game. Spawn and attack an enemy boss, dealing pseudo-random damage utilizing the current slot as a source of randomness.",
    parts: 5,
  },
  "faucet-seahorse": { description: "Build a token faucet with a price oracle.", parts: 7 },
  lumberjack: { description: "How to build an energy system on chain.", parts: 3 },
  "spl-token-vault": {
    description: "Learn how to create and SPL token with meta data and icon using metaplex sdk and saving it in an anchor program.",
    parts: 7,
  },
  "zero-copy": { description: "How to handle memory and big accounts.", parts: 1 },
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

/** The tutorial the gallery puts first, for someone who hasn't started one */
export const HERO = {
  slug: "hello-anchor",
  name: "Hello Anchor",
  line: "Write, deploy and call your first program",
  meta: `10 min · ${STEPS.length} steps`,
}

/** The program as the last step leaves it: what the hero shows you'll build */
export const FINISHED_PROGRAM = targetFor(STEPS[STEPS.length - 1]) ?? ""

/** The line under a card's description. Sections already name the level, so it's left out */
export function metaFor(t: Entry) {
  if (t.slug === HERO.slug) return `${HERO.meta} · ${t.framework}`
  return `${t.parts} ${t.parts === 1 ? "part" : "parts"} · ${t.framework}`
}

/** Search reads the name, the description and the framework. The filter narrows by framework */
export function filterCatalog(query: string, framework: FrameworkFilter) {
  const q = query.trim().toLowerCase()
  return CATALOG.filter(
    (t) => (framework === "all" || t.framework === framework) && (!q || [t.name, t.description, t.level, t.framework].some((f) => f.toLowerCase().includes(q)))
  )
}

/** The cards by level, without the levels nothing is left in */
export function byLevel(list: Entry[]) {
  return LEVELS.map((level) => ({ level, items: list.filter((t) => t.level === level) })).filter((g) => g.items.length > 0)
}

/** What the results line says: "3 results", or "No Seahorse tutorials match “vault”" */
export function resultsLine(count: number, query: string, framework: FrameworkFilter) {
  const kind = framework === "all" ? "tutorials" : `${framework} tutorials`
  const q = query.trim()
  if (count === 0) return q ? `No ${kind} match “${q}”` : `No ${kind} yet`
  return `${count} ${count === 1 ? "result" : "results"}`
}

/** Only Hello Anchor runs in this prototype. The rest say so when opened */
export const openTutorial = (slug: string, open: () => void) => (slug === HERO.slug ? open() : toast("Only Hello Anchor is in this prototype"))
