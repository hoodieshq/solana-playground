import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, Circle, CircleCheck, Pencil, Trash2, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { LESSON, shortKey, type Move, type MoveField, type Rec } from "../data"
import { useStore } from "../store"
import { GameCard } from "./GameCard"
import { TokenCard } from "./TokenCard"

// The records card: a records lesson's accounts at their PDAs, one row each, drawn the way an explorer
// would if it knew the program (the Data family's state card: Counter PDA, Expense Tracker, Bank
// Simulator, Todo App Seahorse). Grown from PlayerCard and MemoryCard: the same box, the same `flat`
// inside a card that has one, the same live version for a move card and the finish

const sol = (n: number) => `${n.toFixed(4)} SOL`

// Plain strings, not cn: cn would read text-caption next to a colour as one and drop it
// 16 a line, so a row's address, seeds and fields stand at one even step (Almaz, 10 Nov)
const MONO = "font-mono text-[0.75rem] leading-4 tabular-nums"
const NOTE = "text-caption text-muted-foreground"

/** How long a change shows as one: the tint of a new row, the old value struck beside the new */
const CHANGE_MS = 1200

/** Whether something that happened at `at` is still news, re-rendering once when it stops being */
function useFresh(at: number | undefined) {
  const [, tick] = useState(0)
  const left = at === undefined ? 0 : CHANGE_MS - (Date.now() - at)
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => tick((n) => n + 1), left)
    return () => window.clearTimeout(t)
  }, [at, left > 0])
  return left > 0
}

/** Ticks once a second while `on`, for a value the client works out between transactions */
function useSecond(on: boolean) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [on])
  return Date.now()
}

/** A field's value, and while the change is news the old one struck beside it */
/** A value led by a status mark, a lesson's "✓ done" or "○ not done": the mark drawn as an icon on the
 * line's middle. As a font's glyph it sat on its own height, off the words beside it (Almaz, 10 Nov) */
function Marked({ value }: { value: string }) {
  const mark = value.startsWith("✓ ") ? "done" : value.startsWith("○ ") ? "open" : null
  if (!mark) return <>{value}</>
  const Icon = mark === "done" ? CircleCheck : Circle
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" strokeWidth={2} className={cn("size-3 shrink-0", mark === "done" ? "text-success" : "text-muted-foreground")} />
      {value.slice(2)}
    </span>
  )
}

function Value({ value, was, fresh, struck = true }: { value: string; was?: string; fresh: boolean; struck?: boolean }) {
  const changed = fresh && was !== undefined && was !== value
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {changed && struck && (
        <span className="text-subtle line-through">
          <Marked value={was} />
        </span>
      )}
      <span key={changed ? `${value}-new` : value} className={cn("text-foreground", changed && "pg-arrive")}>
        <Marked value={value} />
      </span>
    </span>
  )
}

/** What a send moved a whole number by, beside its name as the token card has it: `+1` in green, `−1`
 * muted. A value that isn't a whole number (dollars, a word) shows its old one struck instead */
function Delta({ value, was }: { value: string; was?: string }) {
  const whole = (v: string) => /^-?\d+$/.test(v)
  if (was === undefined || !whole(value) || !whole(was)) return null
  const by = Number(value) - Number(was)
  if (!by) return null
  return (
    <span className={cn("pg-arrive rounded-full px-1.5 font-mono text-[0.6875rem] leading-4 tabular-nums", by > 0 ? "bg-success/10 text-success" : "bg-foreground/[0.06] text-muted-foreground")}>
      {by > 0 ? "+" : "−"}
      {Math.abs(by)}
    </span>
  )
}

/** Values typed on a card or in a row, by field name: what the input shows, its default when empty */
export type Typed = Record<string, string>

/** A default as the field shows it: cents as dollars, without trailing zeros */
const shown = (f: MoveField, v: string | undefined) =>
  v === undefined ? "" : f.kind === "dollars" && /^\d+$/.test(v) ? String(Number(v) / 100) : f.kind === "tokens" && /^\d+$/.test(v) ? String(Number(v) / 10 ** (f.decimals ?? 0)) : v

/** The arguments a move sends: what was typed, else the lesson's default, dollars as cents. `invalid`
 * when a field can't be sent as it stands, and `empty` when a required one is empty */
export function argsOf(fields: MoveField[], typed: Typed, defaults: Record<string, string>) {
  const args: Record<string, string> = { ...defaults }
  let invalid = false
  let empty = false
  for (const f of fields) {
    const v = (typed[f.name] ?? "").trim()
    if (!v) {
      if (f.required) empty = true
      continue
    }
    if (f.kind === "dollars") {
      if (!/^\d+(\.\d{1,2})?$/.test(v)) invalid = true
      else args[f.name] = String(Math.round(Number(v) * 100))
    } else if (f.kind === "tokens") {
      // Whole tokens in, base units out: no more decimal places than the mint has
      const d = f.decimals ?? 0
      if (!new RegExp(`^\\d+${d ? `(\\.\\d{1,${d}})?` : ""}$`).test(v)) invalid = true
      else args[f.name] = String(Math.round(Number(v) * 10 ** d))
    } else if (f.kind === "number") {
      if (!/^\d+$/.test(v)) invalid = true
      else args[f.name] = v
    } else args[f.name] = v
  }
  return { args, invalid, empty }
}

/** The inputs of a move: label over field, the default as the placeholder unless the field names its
 * own. On a phone 16px, or iOS zooms the field */
export function MoveInputs({
  fields,
  typed,
  defaults,
  onChange,
  onEnter,
  phone,
  disabled,
}: {
  fields: MoveField[]
  typed: Typed
  defaults: Record<string, string>
  onChange: (name: string, v: string) => void
  onEnter: () => void
  phone?: boolean
  disabled?: boolean
}) {
  return (
    <>
      {fields.map((f) => (
        <label key={f.name} className={cn("flex min-w-0 flex-col gap-1", f.kind === "text" ? "flex-[2_1_8rem]" : "flex-[1_1_5rem]")}>
          <span className={NOTE}>
            {f.label}
            {f.kind === "dollars" && <span className="text-subtle"> · $</span>}
          </span>
          <Input
            value={typed[f.name] ?? ""}
            onChange={(e) => onChange(f.name, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onEnter()
              }
            }}
            readOnly={disabled}
            maxLength={f.max}
            inputMode={f.kind === "text" ? undefined : f.kind === "dollars" || f.kind === "tokens" ? "decimal" : "numeric"}
            placeholder={f.placeholder ?? shown(f, defaults[f.name])}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
            aria-label={f.label}
            className={cn("min-w-0", f.kind !== "text" && "font-mono", phone ? "h-12 text-base" : "h-9 text-[0.8125rem] md:text-[0.8125rem]")}
          />
        </label>
      ))}
    </>
  )
}

/** The icon a row move takes on a phone, by its word. A list's rows carry quiet tools, not a pair of
 * framed buttons each: six of those under three expenses made the card flicker. On a wider screen they
 * keep their words, unframed, so "then delete one" in the chat finds its Delete (Almaz, 10 Nov) */
const ROW_ICONS: Partial<Record<string, LucideIcon>> = { Edit: Pencil, Delete: Trash2, "Mark done": Check }

/** A row's tools, from a move card that's up, at the end of the row's line (`head`): a move without
 * fields sends at once, one with fields opens them under the row first (Edit). A move the lesson won't
 * send for this row is off, with why */
function RowMoves({ row, moves, phone, head }: { row: Rec; moves: Move[]; phone: boolean; head?: ReactNode }) {
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState<Move | null>(null)
  const [typed, setTyped] = useState<Typed>({})
  const busy = s.phase !== "idle"
  const go = (m: Move, args?: Record<string, string>) => {
    const card = [...s.thread].reverse().find((t) => t.kind === "act" && t.act === "move" && t.state !== "done")
    if (!card) return
    dispatch({ type: "act", turn: card.id, ix: m.ix, row: row.id, args, signer: m.signer })
    setOpen(null)
    setTyped({})
  }
  const defaults = open ? LESSON.records!.args(s, open.ix, row.id) : {}
  const sent = open ? argsOf(open.fields ?? [], typed, defaults) : null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {head}
        <span className={cn("flex shrink-0 items-center", !head && "-ml-1.5", phone ? "-my-2 gap-0" : "-my-1 gap-0.5")}>
          {moves.map((m) => {
            const r = LESSON.records!.send(s, m.ix, LESSON.records!.args(s, m.ix, row.id), row.id, m.signer)
            const note = "note" in r ? r.note : null
            const Icon = phone ? ROW_ICONS[m.button] : undefined
            const on = open === m
            return (
              <button
                key={m.ix + (m.signer ?? "")}
                type="button"
                disabled={busy || !!note}
                title={note ?? m.button}
                aria-label={Icon ? `${m.button} ${LESSON.records!.show(row).label}` : undefined}
                aria-expanded={m.fields ? on : undefined}
                onClick={() => (m.fields ? setOpen(on ? null : m) : go(m))}
                className={cn(
                  "grid place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
                  Icon ? (phone ? "size-9" : "size-7") : cn("px-2 font-act text-[0.8125rem]", phone ? "h-9" : "h-7"),
                  m.button === "Delete" && "hover:text-error",
                  on && "bg-foreground/[0.06] text-foreground"
                )}
              >
                {Icon ? <Icon aria-hidden="true" strokeWidth={1.75} className="size-3.5" /> : m.button}
              </button>
            )
          })}
        </span>
      </div>
      {open && sent && (
        <div className="flex flex-wrap items-end gap-2">
          <MoveInputs fields={open.fields ?? []} typed={typed} defaults={defaults} onChange={(n, v) => setTyped((t) => ({ ...t, [n]: v }))} onEnter={() => !sent.invalid && go(open, sent.args)} phone={phone} disabled={busy} />
          <Button size="sm" disabled={busy || sent.invalid || sent.empty} onClick={() => go(open, sent.args)} className={cn("h-9 px-3 font-act", phone && "h-12")}>
            Save
          </Button>
        </div>
      )}
    </div>
  )
}

/** One account: its label, its address cut in the middle, its rent, its seeds and its fields. A list's
 * rows take one line, values only, and show their seeds when opened */
function Row({
  row,
  was,
  fresh,
  created,
  now,
  live,
  moves,
  phone,
}: {
  row: Rec
  was?: Rec
  fresh: boolean
  created: boolean
  now: number
  live: boolean
  moves?: Move[]
  phone: boolean
}) {
  const { s } = useStore()
  const [open, setOpen] = useState(false)
  const r = LESSON.records!
  const look = r.show(row)
  const before = was ? r.show(was) : undefined
  const value = (i: number) => <Value value={look.fields[i][1]} was={before?.fields[i]?.[1]} fresh={fresh} />
  const worked = live && r.live ? r.live(s, row, now) : null
  const pda = (
    <span className={`min-w-0 truncate ${MONO} text-muted-foreground`} title={row.pda}>
      {shortKey(row.pda, phone ? 4 : 6)}
    </span>
  )
  const rent = created && fresh ? <span className="text-success">+{sol(row.rent)} rent</span> : <span>{sol(row.rent)} rent</span>
  // Named, as the fields are: on its own the line didn't say what it was
  const seeds = (
    <span>
      <span className="text-muted-foreground">seeds</span> {look.seeds}
    </span>
  )
  // A figure (an amount, a count) keeps the mono column; a word (done or not) is set as text
  const figure = (v: string) => /^[-$\d]/.test(v)
  const lineHead = (
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
      <span className={`shrink-0 ${MONO} text-subtle`}>{look.label}</span>
      {look.fields.map(([name, v], i) => (
        <span
          key={name}
          title={name}
          className={cn(
            "leading-5",
            i === 0 ? "min-w-0 flex-1 truncate text-[0.8125rem] text-foreground" : cn("shrink-0 whitespace-nowrap", figure(v) ? "font-mono text-[0.8125rem] tabular-nums" : "text-caption text-muted-foreground")
          )}
        >
          {value(i)}
        </span>
      ))}
    </button>
  )
  return (
    // Each account under a hairline, 8 above and below, as the token card's: tinted while it's new, a
    // little out past the column; otherwise square, so its hairline runs full width
    <li
      className={cn(
        "flex flex-col gap-1 py-2 transition-colors duration-500 first:pt-0 last:pb-0 motion-reduce:transition-none",
        created && fresh ? "-mx-1.5 animate-rise rounded-md bg-success/[0.08] px-1.5 first:pt-1 last:pb-1" : "bg-transparent"
      )}
    >
      {look.line ? (
        // A list's row on one line: its number quiet, its first field in the text's face, the rest (an
        // amount, done or not) at the end. The address, seeds and rent wait behind the row (Almaz, 10 Nov)
        moves && moves.length > 0 ? (
          <RowMoves row={row} moves={moves} phone={phone} head={lineHead} />
        ) : (
          lineHead
        )
      ) : (
        // One account on its own takes the token card's shape: name over address on the left, its first
        // field on the right as the number, with the field's name under it and what the last send changed.
        // The rent stood there before and the count sat last in small mono, so the one number the lesson
        // moves read as a footnote (Almaz, 10 Nov). The rent and the seeds go quiet under the row
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-act text-[0.8125rem] leading-5 text-foreground">{look.label}</span>
              <span className="flex min-w-0 leading-4">{pda}</span>
            </div>
            {look.fields[0] && (
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="font-mono text-[1rem] leading-5 tabular-nums">
                  {/* A whole number's change is the delta under it; a dollar amount's, its old one struck */}
                  <Value value={look.fields[0][1]} was={before?.fields[0]?.[1]} fresh={fresh} struck={!/^-?\d+$/.test(look.fields[0][1])} />
                </span>
                <span className={`flex items-center gap-1.5 ${NOTE} leading-4`}>
                  <Delta value={look.fields[0][1]} was={fresh ? before?.fields[0]?.[1] : undefined} />
                  {look.fields[0][0]}
                </span>
              </div>
            )}
          </div>
          {/* The other fields under it, a line each: the name on the left as the number's is, the value in
              the number's column. Run together in one mono line with the seeds under them, four lines in
              three faces read as a mess with nothing first (Almaz, 10 Nov) */}
          {look.fields.length > 1 && (
            <dl className="mt-2 flex flex-col gap-1">
              {look.fields.slice(1).map(([name], i) => (
                <div key={name} className="flex items-baseline justify-between gap-4">
                  <dt className={`${NOTE} leading-5`}>{name}</dt>
                  <dd className="font-mono text-[0.8125rem] leading-5 tabular-nums">{value(i + 1)}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      {look.line && open && (
        <p className={`flex min-w-0 flex-wrap gap-x-1.5 ${MONO} text-subtle`}>
          {pda}
          <span>·</span>
          {seeds}
          <span>·</span>
          {rent}
        </p>
      )}
      {worked && (
        <p className={`${NOTE} tabular-nums`} aria-live="off">
          {worked}
        </p>
      )}
      {/* Where the account lives and what it holds back, last and quietest, a line each as the fields
          above: run on in one line, the rent broke between its number and its unit (Almaz, 10 Nov) */}
      {!look.line && (
        <dl className="mt-1 flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className={`${NOTE} leading-5`}>seeds</dt>
            <dd className={`min-w-0 truncate text-right ${MONO} text-muted-foreground`}>{look.seeds}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={`${NOTE} leading-5`}>rent</dt>
            <dd className={`${MONO} text-muted-foreground`}>{created && fresh ? <span className="text-success">+{sol(row.rent)}</span> : sol(row.rent)}</dd>
          </div>
        </dl>
      )}
      {!look.line && moves && moves.length > 0 && <RowMoves row={row} moves={moves} phone={phone} />}
    </li>
  )
}

/** The accounts as a card draws them. `before` and `at` make the change since then news for a moment:
 * new rows tinted, changed values flipping, closed rows folding. `record` keeps the closed rows as a
 * line each, for a card that stays on the record; `refused` says what a refusal left as it was, `read`
 * that a client read them back with no transaction. `live` works out the client's values once a second.
 * `moves` puts row buttons on the rows of their kind. `flat` drops the box, inside a card with one */
export function RecordsCard({
  rows,
  before,
  at,
  record = false,
  closed = [],
  refused,
  read = false,
  live = false,
  moves,
  phone = false,
  flat = false,
  className,
}: {
  rows: Rec[]
  before?: Rec[]
  at?: number
  record?: boolean
  closed?: Rec[]
  refused?: string
  read?: boolean
  live?: boolean
  moves?: Move[]
  phone?: boolean
  flat?: boolean
  className?: string
}) {
  const r = LESSON.records
  const fresh = useFresh(at)
  const now = useSecond(live && !!(r?.live || r?.tokens))
  if (!r) return null
  // The Tokens family draws the same records as the token card
  if (r.tokens) return <TokenCard view={r.tokens(rows, live ? now : null)} was={before && r.tokens(before, null)} fresh={fresh} refused={refused} phone={phone} flat={flat} className={className} />
  // The Games family draws them as the game card
  if (r.view) return <GameCard view={r.view} rows={rows} before={before} at={at} refused={refused} live={live} moves={moves} phone={phone} flat={flat} className={className} />
  const was = (id: string) => before?.find((b) => b.id === id)
  const gone = [...closed, ...(before ?? []).filter((b) => !rows.some((x) => x.id === b.id) && !closed.some((c) => c.id === b.id))]
  const folded = record ? gone : fresh ? gone : []
  const held = rows.reduce((n, x) => n + x.rent, 0)
  const count = `${rows.length} ${rows.length === 1 ? "account" : "accounts"}`
  const lone = rows.length === 1 && !read && folded.length === 0 && !r.show(rows[0]).line
  return (
    <div className={cn("flex flex-col gap-2", !flat && "rounded-control border border-border bg-surface-well px-3 py-2.5", className)}>
      {/* One account on its own needs no heading: "Counter · 1 account" over the row named Counter said
          the same word twice, and the row carries its rent */}
      {!lone && (
        <div className="flex items-baseline gap-2 text-caption text-muted-foreground">
          <span className="min-w-0 truncate">
            {read ? (
              <>
                <span className="font-act text-foreground">Read {count}</span>
                {!phone && " · no transaction"}
              </>
            ) : (
              <>
                <span className="font-act text-foreground">{r.title}</span> · {count}
              </>
            )}
          </span>
          {/* With one account its row says the same rent */}
          {rows.length !== 1 && (
            <span className="ml-auto shrink-0 tabular-nums">
              Rent held <span className={`${MONO} text-foreground`}>{sol(held)}</span>
            </span>
          )}
        </div>
      )}
      {rows.length === 0 && folded.length === 0 ? (
        <p className={NOTE}>{r.empty.split("`").map((p, i) => (i % 2 ? <code key={i} className={`${MONO} text-foreground`}>{p}</code> : p))}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              was={was(row.id)}
              fresh={fresh}
              created={!!before && !was(row.id)}
              now={now}
              live={live}
              moves={moves?.filter((m) => m.row === row.kind)}
              phone={phone}
            />
          ))}
          {folded.map((row) => (
            <li key={`closed-${row.id}`} className={cn(NOTE, "flex min-w-0 items-baseline gap-2 py-2 last:pb-0")}>
              <span className={cn("min-w-0 truncate", fresh && !record && "line-through")}>
                Closed {r.show(row).label} · {sol(row.rent)} back to your wallet
              </span>
            </li>
          ))}
        </ul>
      )}
      {refused && <p className="text-caption text-error">{refused}</p>}
    </div>
  )
}

/** The accounts as they are now, for a move card and the finish: a change since the last render is
 * news for a moment, and the client's own values tick */
export function LiveRecords({ moves, phone, flat, className }: { moves?: Move[]; phone?: boolean; flat?: boolean; className?: string }) {
  const { s } = useStore()
  // The store's own array, null before any: a fresh [] each render would read as a change every time
  const rows = s.records
  const prev = useRef(rows)
  const [change, setChange] = useState<{ before: Rec[]; at: number } | null>(null)
  useEffect(() => {
    if (prev.current === rows) return
    setChange({ before: prev.current ?? [], at: Date.now() })
    prev.current = rows
  }, [rows])
  return <RecordsCard rows={rows ?? []} before={change?.before} at={change?.at} live moves={moves} phone={phone} flat={flat} className={className} />
}
