import { useEffect, useState, type ReactNode } from "react"
import { Flag, Package, PackageOpen, Swords } from "lucide-react"

import { cn } from "@/lib/utils"

import { LESSON, WALLET, shortKey, type GameView, type Move, type Rec } from "../data"
import { PLAYER_O, SLOT_TICK, lineOf, rollOf, slotAt, slotText, solOf } from "../lessons/games"
import { useStore } from "../store"

// The game card: a game's accounts drawn as its screen (the Games family's state card: Tiny Adventure,
// Tiny Adventure Two, Boss Battle, Tic-tac-toe Seahorse). Grown from Lumberjack's PlayerCard: the same
// box, the same head (the account and its PDA), a different screen per game. The records card draws it
// for a lesson whose `records` has a `view`, so a send's result, the live move card, the finish and the
// Call panel all show it. It reads the accounts by id, as `lessons/games.ts` lists them

// Plain strings, not cn: cn would read text-caption next to a colour as one and drop it
const MONO = "font-mono text-[0.75rem] tabular-nums"
const NOTE = "text-caption text-muted-foreground"

/** How long a change shows beside its number: `+0.1`, `−401` */
const NEWS_MS = 2000

/** Whether something that happened at `at` is still news, re-rendering once when it stops being */
function useNews(at: number | undefined) {
  const [, tick] = useState(0)
  const left = at === undefined ? 0 : NEWS_MS - (Date.now() - at)
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => tick((n) => n + 1), left)
    return () => window.clearTimeout(t)
  }, [at, left > 0])
  return left > 0
}

/** Re-renders every `ms` while it's set, for a value the client works out between transactions */
function useTick(ms: number | null) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (ms === null) return
    const t = window.setInterval(() => tick((n) => n + 1), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return Date.now()
}

const num = (r: Rec | undefined, k: string) => Number(r?.values[k] ?? 0)

/** A change beside the number it changed, for a moment: `+0.1` in green, `−0.1` muted */
function Delta({ by, text }: { by: number; text: string }) {
  if (!by) return null
  return (
    <span className={cn("pg-arrive rounded-full px-1.5 font-mono text-[0.6875rem] leading-4 tabular-nums", by > 0 ? "bg-success/10 text-success" : "bg-foreground/[0.06] text-muted-foreground")}>
      {by > 0 ? "+" : "−"}
      {text}
    </span>
  )
}

/** The row of four tiles, the character on its tile: `o`, and `\o/` on the last. The last tile carries
 * the flag, or the chest when the game has one: closed while it holds SOL, open once it paid */
function Tiles({ position, chest, phone }: { position: number; chest?: "none" | "closed" | "open"; phone: boolean }) {
  const size = phone ? 48 : 40
  const step = size + 4
  const Chest = chest === "closed" ? Package : PackageOpen
  return (
    <div className="relative shrink-0" style={{ width: step * 3 + size, height: size }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" className="absolute top-0 rounded-md border border-border bg-surface-raised" style={{ left: i * step, width: size, height: size }}>
          {i === 3 && chest === undefined && <Flag className="absolute top-1 right-1 size-3 text-muted-foreground" />}
          {i === 3 && chest !== undefined && chest !== "none" && <Chest className={cn("absolute top-1 right-1 size-3.5", chest === "closed" ? "text-warning-ink" : "text-muted-foreground")} />}
        </span>
      ))}
      {/* One glyph that slides from tile to tile, so a move reads as a step. It stands low on the tile, clear
          of the flag or the chest in the last one's corner */}
      <span
        aria-hidden="true"
        className="absolute top-0 flex items-end justify-center pb-1.5 font-mono text-[0.8125rem] text-foreground transition-[left] duration-200 ease-out motion-reduce:transition-none"
        style={{ left: position * step, width: size, height: size }}
      >
        {position === 3 ? "\\o/" : "o"}
      </span>
    </div>
  )
}

/** The boss: its health on a 1000 scale, the last five rolls with their slots and, once the client
 * predicts, the next five slots and what each would roll. The strip ticks with the slot on a live card;
 * on a record it stays as it was, the slot the attack landed in outlined */
function Boss({ boss, was, news, live, at, phone }: { boss: Rec; was?: Rec; news: boolean; live: boolean; at?: number; phone: boolean }) {
  const { s } = useStore()
  const health = num(boss, "health")
  const rolls = JSON.parse(String(boss.values.rolls ?? "[]")) as [number, number, number][]
  const predicting = !!boss.values.predicting
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const now = useTick(live && predicting ? (reduced ? 1000 : SLOT_TICK) : null)
  const last = rolls[rolls.length - 1]
  const hit = was && num(was, "hits") < num(boss, "hits") ? last : undefined
  // Right after a hit, the strip holds the slots around it; otherwise it runs from the slot now
  const from = hit && (news || !live) ? hit[0] - 1 : slotAt(s, live ? now : (at ?? now))
  const down = health === 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2" aria-label={`${health} of 1000 health`}>
        <Swords aria-hidden="true" className={cn("size-3.5", down ? "text-error" : "text-muted-foreground")} />
        <span aria-hidden="true" className={cn("h-1 overflow-hidden rounded-full bg-foreground/10", phone ? "w-24" : "w-32")}>
          <span className="block h-full rounded-full bg-error/70 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${health / 10}%` }} />
        </span>
        <span className={cn("font-mono text-[0.8125rem] tabular-nums", down ? "text-error" : "text-foreground")}>{health}/1000</span>
        {down && <span className="text-caption text-error">Defeated</span>}
      </div>
      {rolls.length > 0 && (
        <ul aria-label="Last rolls" className="flex flex-wrap gap-1.5">
          {[...rolls].reverse().map(([slot, damage], i) => (
            <li key={slot} className={cn("rounded-md px-1.5 py-0.5", MONO, i === 0 && hit && news ? "bg-error/10 text-error" : "bg-foreground/[0.05] text-muted-foreground")}>
              −{damage} · slot {slotText(slot)}
            </li>
          ))}
        </ul>
      )}
      {predicting && (
        <div className="flex flex-col gap-1">
          <span className={NOTE}>Next hits</span>
          <ol aria-label="Next hits" className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((k) => {
              const slot = from + k
              const landed = hit && hit[0] === slot
              return (
                <li key={slot} className={cn("flex min-w-0 flex-col items-center rounded-md border px-1 py-1", landed ? "border-foreground/60 bg-foreground/[0.06]" : "border-border")}>
                  <span className="font-mono text-[0.8125rem] text-foreground tabular-nums">{rollOf(slot)}</span>
                  <span className="truncate font-mono text-[0.6875rem] text-subtle tabular-nums">…{String(slot).slice(-3)}</span>
                </li>
              )
            })}
          </ol>
          <span className={`${NOTE} text-subtle`}>Worked out by the client from the slot, no transaction</span>
        </div>
      )}
    </div>
  )
}

/** The board: nine cells, X and O, the winning line struck through, whose turn it is and, while a move
 * card is up, the cells as its buttons and the switch that picks which wallet signs */
function Board({ game, o, moves, phone }: { game?: Rec; o?: Rec; moves?: Move[]; phone: boolean }) {
  const { s, dispatch } = useStore()
  const grid = String(game?.values.grid ?? "000000000")
  const turn = num(game, "turn") || 1
  const state = num(game, "state")
  const signers = LESSON.records?.signers
  const move = game ? moves?.find((m) => m.row === game.kind) : undefined
  // The wallet that signs the next move: the lesson's pick (yours, or whoever's turn it is) until the
  // switch is flipped, and back to it once the board changes
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => setPicked(null), [grid])
  const fallback = move ? (LESSON.records?.args(s, move.ix).signer ?? null) : null
  const signer = picked ?? fallback
  const busy = s.phase !== "idle"
  const play = (cell: number) => {
    const card = [...s.thread].reverse().find((t) => t.kind === "act" && t.act === "move" && t.state !== "done")
    if (!card || !move || !game) return
    dispatch({ type: "act", turn: card.id, ix: move.ix, row: game.id, args: { cell: String(cell), ...(signer ? { signer } : {}) } })
  }
  const size = phone ? 48 : 40
  const step = size + 4
  const won = state === 1 ? lineOf(grid, "1") : state === 2 ? lineOf(grid, "2") : null
  const center = (i: number) => [(i % 3) * step + size / 2, Math.floor(i / 3) * step + size / 2]
  const mark = (c: string) => (c === "1" ? "X" : c === "2" ? "O" : "")
  const result = state === 1 ? "X wins" : state === 2 ? "O wins" : state === 3 ? "Draw" : null
  return (
    <div className="flex flex-col gap-2">
      {game ? (
        <>
          <div className="relative shrink-0" style={{ width: step * 2 + size, height: step * 2 + size }}>
            {[...grid].map((c, i) => {
              const open = !!move && c === "0" && state === 0
              const cls = cn(
                // X and O in the heading face: a mono O reads as a zero
                "absolute grid place-items-center rounded-md border border-border font-heading text-[1.0625rem] font-medium text-foreground",
                open ? "bg-surface-raised hover:bg-surface-hover disabled:opacity-60" : "bg-surface-raised/60"
              )
              const style = { left: (i % 3) * step, top: Math.floor(i / 3) * step, width: size, height: size }
              return open ? (
                <button key={i} type="button" disabled={busy} onClick={() => play(i)} aria-label={`Play cell ${i}`} className={cls} style={style} />
              ) : (
                <span key={i} className={cls} style={style} aria-label={`Cell ${i}: ${mark(c) || "empty"}`}>
                  {mark(c)}
                </span>
              )
            })}
            {won && (
              <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <line x1={center(won[0])[0]} y1={center(won[0])[1]} x2={center(won[2])[0]} y2={center(won[2])[1]} strokeWidth={2} strokeLinecap="round" className="stroke-success" />
              </svg>
            )}
          </div>
          <p className={cn(NOTE, "tabular-nums")}>
            {result ? (
              <span className={cn("font-act", result === "Draw" ? "text-foreground" : "text-success")}>{result}</span>
            ) : (
              <>
                <span className="text-foreground">{turn === 1 ? "X" : "O"} to move</span> ·{" "}
                {turn === 1 ? "your wallet" : "Player O"} <span className={MONO}>{shortKey(turn === 1 ? WALLET : PLAYER_O, 4)}</span>
              </>
            )}
          </p>
          {move && signers && o && state === 0 && (
            <div className="flex items-center gap-2">
              <span className={NOTE}>Signs as</span>
              <div role="radiogroup" aria-label="Signer" className="flex gap-1">
                {signers.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    role="radio"
                    aria-checked={signer === w.value}
                    title={w.label}
                    onClick={() => setPicked(w.value)}
                    className={cn(
                      "h-7 rounded-full border px-3 font-heading text-[0.8125rem] font-medium transition-colors duration-100 pointer-coarse:h-9",
                      signer === w.value ? "border-border-strong bg-foreground/[0.08] text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {w.value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className={NOTE}>
          No game yet. New game sends <code className={`${MONO} text-foreground`}>init_game</code>.
        </p>
      )}
      {o && (
        <p className={NOTE}>
          Player O <span className={MONO}>{shortKey(PLAYER_O, 4)}</span> · <span className={`${MONO} text-foreground`}>{solOf(num(o, "lamports"))} SOL</span>
        </p>
      )}
    </div>
  )
}

/** The game's accounts as its screen. `before` and `at` make the change since then news for a moment;
 * `live` ticks what the client works out (the next hits), and `moves` makes the board's cells buttons.
 * `flat` drops the box, inside a card that has one */
export function GameCard({
  view,
  rows,
  before,
  at,
  refused,
  live = false,
  moves,
  phone = false,
  flat = false,
  className,
}: {
  view: GameView
  rows: Rec[]
  before?: Rec[]
  at?: number
  refused?: string
  live?: boolean
  moves?: Move[]
  phone?: boolean
  flat?: boolean
  className?: string
}) {
  const news = useNews(at)
  const get = (id: string) => rows.find((r) => r.id === id)
  const was = (id: string) => before?.find((r) => r.id === id)
  const main = get(view === "boss" ? "boss" : view === "board" ? "game" : "level")
  const name = view === "boss" ? "Boss account" : view === "board" ? "Game account" : "Level account"

  // The last move's result, at the head's end: what changed since `before`
  let caption: ReactNode = null
  let screen: ReactNode
  if (view === "world" || view === "chest") {
    const level = get("level")
    const prev = was("level")
    const position = num(level, "position")
    if (prev && level) caption = position > num(prev, "position") ? `→ tile ${position}` : position < num(prev, "position") ? `← tile ${position}` : null
    const vault = get("vault")
    const wallet = get("wallet")
    const chest = !level ? "none" : level.values.chest ? "closed" : num(level, "paid") > 0 ? "open" : "none"
    const paid = num(level, "paid") > num(prev, "paid")
    if (paid) caption = "+0.1 SOL"
    const delta = (r: Rec | undefined, p: Rec | undefined) => (news && p ? num(r, "lamports") - num(p, "lamports") : 0)
    screen = level ? (
      <div className="flex flex-col gap-2">
        <Tiles position={position} chest={view === "chest" ? chest : undefined} phone={phone} />
        <p className={MONO}>
          <span className="text-muted-foreground">Tile</span> <span className="text-foreground">{position}</span> <span className="text-muted-foreground">of 3</span>
        </p>
        {view === "chest" && (
          <p className={cn(NOTE, "flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums")}>
            <span className="inline-flex items-center gap-1.5">
              Chest <span className={`${MONO} text-foreground`}>{solOf(num(vault, "lamports"))} SOL</span>
              <Delta by={delta(vault, was("vault"))} text={solOf(Math.abs(delta(vault, was("vault"))))} />
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              Your wallet <span className={`${MONO} text-foreground`}>{solOf(num(wallet, "lamports"))} SOL</span>
              <Delta by={delta(wallet, was("wallet"))} text={solOf(Math.abs(delta(wallet, was("wallet"))))} />
            </span>
          </p>
        )}
      </div>
    ) : (
      <p className={NOTE}>
        No level yet. Start sends <code className={`${MONO} text-foreground`}>init_level</code>.
      </p>
    )
  } else if (view === "boss") {
    const boss = get("boss")
    const prev = was("boss")
    if (boss && prev) {
      const rolls = JSON.parse(String(boss.values.rolls ?? "[]")) as [number, number, number][]
      caption = num(boss, "hits") > num(prev, "hits") ? `−${rolls[rolls.length - 1]?.[1] ?? 0}` : num(boss, "health") > num(prev, "health") ? "Respawned" : null
    }
    screen = boss ? (
      <Boss boss={boss} was={prev} news={news} live={live} at={at} phone={phone} />
    ) : (
      <p className={NOTE}>
        No boss yet. Respawn sends <code className={`${MONO} text-foreground`}>respawn</code>.
      </p>
    )
  } else {
    const game = get("game")
    const prev = was("game")
    if (game && prev) {
      const g = String(game.values.grid)
      const p = String(prev.values.grid)
      const at = [...g].findIndex((c, i) => c !== p[i])
      if (at !== -1) caption = `${g[at] === "1" ? "X" : "O"} played cell ${at}`
    }
    screen = <Board game={game} o={get("o")} moves={live ? moves : undefined} phone={phone} />
  }

  return (
    <div className={cn("flex flex-col gap-2.5", !flat && "rounded-control border border-border bg-surface-well px-3 py-2.5", className)}>
      {main && (
        <div className="flex min-w-0 items-baseline gap-2 text-caption text-muted-foreground">
          <span className="shrink-0 text-foreground">{name}</span>
          <span className={`min-w-0 truncate ${MONO}`} title={main.pda}>
            {shortKey(main.pda, phone ? 4 : 6)}
          </span>
          {caption && <span className="ml-auto shrink-0 text-foreground">{caption}</span>}
        </div>
      )}
      {screen}
      {refused && <p className="text-caption text-error">{refused}</p>}
    </div>
  )
}
