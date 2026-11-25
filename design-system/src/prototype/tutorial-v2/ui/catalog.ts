import { TUTORIALS, type TutorialCard } from "../data"
import { LADDER } from "../host"
import { playable } from "../lessons"

/** What the gallery says about a tutorial. The description is the tutorial's own, from the
 * Playground repo: client/public/tutorials/<slug>/data.json, and for the three hello tutorials,
 * which have no data.json there, client/src/tutorials/<slug>/<slug>.ts. `parts` is the number of
 * pages in its pages folder, `by` its authors from the same file. The long ones are cut to one
 * line in the same plain voice (Nikita, 20 Nov); the short ones grew to fill a card's two lines, as
 * every card's line does (Almaz, 25 Nov) */
type About = { description: string; parts: number; by?: string }

const ABOUT: Record<string, About> = {
  "hello-anchor": { description: "Your first Anchor program: write it, deploy it to devnet and call it.", parts: 4, by: "acheron" },
  "hello-solana": { description: "Your first Solana program in native Rust, with no framework on top.", parts: 3, by: "acheron" },
  "counter-pda-tutorial": { description: "A counter that keeps how many times it was called.", parts: 10, by: "cleon" },
  "tiny-adventure": {
    description: "A tiny on-chain game: move a character left and right.",
    parts: 2,
    by: "Jonas Hahn",
  },
  "tiny-adventure-two": { description: "Tiny Adventure, part two: give out SOL rewards to the players.", parts: 4, by: "Jonas Hahn" },
  "expense-tracker": { description: "An expense tracker that stores each entry at a PDA.", parts: 5, by: "Bolt / Syed Aabis Akhtar" },
  "bank-simulator": { description: "A bank that pays interest on its own schedule.", parts: 5, by: "Bolt / Syed Aabis Akhtar" },
  "battle-coins": {
    description: "Mint tokens by beating enemies, burn them to heal.",
    parts: 7,
    by: "Jonas Hahn and John",
  },
  "boss-battle": {
    description: "Fight a boss with random damage from the current slot.",
    parts: 5,
    by: "Jonas Hahn and John",
  },
  lumberjack: { description: "Chop trees with energy that refills over time: an on-chain energy system.", parts: 3, by: "Jonas Hahn" },
  "spl-token-vault": {
    description: "An SPL token with metadata and an icon, kept in a vault.",
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

/** A tutorial's name as the product shows it: the data keeps upstream's name, which is also its key */
const SHOWN: Record<string, string> = {}
export const shownName = (t: Entry) => SHOWN[t.slug] ?? t.name

/** The name upstream keys a tutorial by, where the prototype's data spells it differently. The
 * product's covers hash it to place the mark, so the same name gives the same cover */
const UPSTREAM: Record<string, string> = { "spl-token-vault": "Spl Token Vault" }
export const upstreamName = (t: Entry) => UPSTREAM[t.slug] ?? t.name

/** Search reads the name, the description and the framework. The filter narrows by framework. New
 * project's search uses it; the tutorials page has neither now */
export function filterCatalog(query: string, framework: FrameworkFilter) {
  const q = query.trim().toLowerCase()
  return CATALOG.filter(
    (t) =>
      (framework === "all" || t.framework === framework) &&
      (!q || [t.name, shownName(t), t.description, t.level, t.framework].some((f) => f.toLowerCase().includes(q)))
  )
}

/** The cards by level, without the levels nothing is left in. The ladder's lesson leads its level, then
 * the tutorials the prototype runs, so a section folded to its first cards still shows them: Lumberjack,
 * the banner's next step, sat fifth of six behind Show all (Almaz, 10 Nov) */
export function byLevel(list: Entry[]) {
  const runs = (t: Entry) => (LADDER.includes(t.slug) ? -1 : playable(t.slug) ? 0 : 1)
  return LEVELS.map((level) => ({ level, items: list.filter((t) => t.level === level).sort((a, b) => runs(a) - runs(b)) })).filter((g) => g.items.length > 0)
}

