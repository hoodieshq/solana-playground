import type { State } from "../store"

// What the Games family shares (Tiny Adventure, Tiny Adventure Two, Boss Battle, Tic-tac-toe Seahorse).
// Each keeps its accounts as `records` and draws them with the game card (`../ui/GameCard.tsx`), which
// reads them by id: `level`, `vault` and `wallet` (a level and its chest), `boss`, `game` and `o` (the
// board and Player O's wallet). Here: lamports, the boss's slot clock and roll, the board's lines

/** Lamports in one SOL */
export const LAMPORTS = 1_000_000_000
/** One transaction's fee, in lamports */
export const FEE = 5000
/** The wallet after the first deploy: the 5 SOL airdrop less the 1.27 SOL deploy, in lamports */
export const AFTER_DEPLOY = 3_730_000_000
/** One upgrade's fees, in lamports */
export const UPGRADE = 200_000

/** How many upgrades have landed so far: each took its fees from the wallet */
export const upgradesOf = (s: State) => s.thread.filter((t) => t.kind === "result" && t.ok && !!t.upgrade).length

/** Lamports as the card prints SOL: 3.6281 */
export const solOf = (lamports: number) => (lamports / LAMPORTS).toFixed(4).replace(/\.?0+$/, "") || "0"

// ---- The boss's dice: the slot, scrambled

/** The slot devnet is on when the lesson starts, an example, and how long one lasts */
const SLOT_BASE = 412_385_117
const SLOT_MS = 400

/** The slot at time `t`: one more every 400 ms since the lesson started */
export const slotAt = (s: State, t: number) => SLOT_BASE + Math.max(0, Math.floor((t - (s.startedAt ?? t)) / SLOT_MS))

/** The slot length, for a card that ticks with it */
export const SLOT_TICK = SLOT_MS

const MASK = (1n << 64n) - 1n

/** One damage roll, as the program works it out: Marsaglia's xorshift64 of the slot, mod 500 */
export function rollOf(slot: number) {
  let x = BigInt(slot)
  x ^= (x << 13n) & MASK
  x ^= x >> 7n
  x ^= (x << 17n) & MASK
  return Number(x % 500n)
}

/** A slot as the copy writes it: 412,385,119 */
export const slotText = (slot: number) => slot.toLocaleString("en-US")

// ---- The board: nine cells, eight lines

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

/** The line `mark` holds on a board kept as nine digits (0 empty, 1 X, 2 O), or null */
export const lineOf = (grid: string, mark: string) => LINES.find((l) => l.every((i) => grid[i] === mark)) ?? null

/** Player O's wallet: a second Playground wallet, added the way Wallet › Add makes one */
export const PLAYER_O = "4Nd1Tq8vYxR3mKcW9pLb2HsJfE6uGaZoNtVk5iMBq7Ez"
