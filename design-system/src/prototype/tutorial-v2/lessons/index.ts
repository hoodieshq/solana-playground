import { HELLO_ANCHOR } from "./hello-anchor"
import { LUMBERJACK } from "./lumberjack"
import { ZERO_COPY } from "./zero-copy"
import type { Lesson } from "./types"

/** Every tutorial the prototype runs, by slug. A new one is a file next to these, added here */
export const LESSONS: Record<string, Lesson> = {
  [HELLO_ANCHOR.card.slug]: HELLO_ANCHOR,
  [LUMBERJACK.card.slug]: LUMBERJACK,
  [ZERO_COPY.card.slug]: ZERO_COPY,
}

export const playable = (slug: string) => slug in LESSONS
