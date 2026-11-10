import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ListPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { BEATS, LESSON, shortKey, type ActBeat, type Move, type Rec, type Sent } from "../../data"
import { flashKeys } from "../../desktop/flash"
import { PRIMARY_KEYS } from "../../desktop/keys"
import { useStore, type Turn } from "../../store"
import { Prose } from "../Prose"
import { LiveRecords, MoveInputs, RecordsCard, argsOf, type Typed } from "../RecordsCard"
import { ACTION, ACTION_SOFT, PHONE_CTA, PHONE_STACK, READ_CODE } from "../type"
import { RunBar, actRecord } from "./ActCard"

type ActTurn = Extract<Turn, { kind: "act" }>

/** The accounts a send closed, by the records it had before and after */
const closedBy = (x: Sent): Rec[] => x.snap.before.filter((b) => !x.snap.after.some((a) => a.id === b.id))

/** One send on the card, newest last: what the program said, the row it closed, or why it was refused */
function SendRow({ x }: { x: Sent }) {
  const { s } = useStore()
  const r = LESSON.records!
  const gone = closedBy(x)[0]
  const text = !x.ok
    ? (x.snap.refused ?? (x.tx.error?.number ? `${x.tx.error.name} · error ${x.tx.error.number}` : (x.tx.error?.message ?? "Refused")))
    : gone
      ? `Closed ${r.show(gone).label} · ${gone.rent.toFixed(4)} SOL back to your wallet`
      : (r.sentLine?.(s, x) ?? (x.tx.said || `${x.ix} confirmed`))
  return (
    <li className="flex min-w-0 items-center gap-2 text-caption">
      {x.ok ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" /> : <X aria-hidden="true" className="size-3.5 shrink-0 text-error" />}
      <span className={cn("min-w-0 truncate", x.ok ? "text-foreground" : "text-error")}>
        {text}
        {x.via === "test" && <span className="text-subtle"> · from the Call panel</span>}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[0.75rem] text-subtle" title={x.tx.signature}>
        {shortKey(x.tx.signature, 4)}
      </span>
    </li>
  )
}

/** A button's words, with `{name}` as that argument's default: "Add #{id}" reads "Add #2" */
const label = (text: string, defaults: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => defaults[k] ?? m)

/** A card's own move: its fields beside its button. `until` stands next to the first one */
function CardMove({
  turn,
  move,
  first,
  phone,
  extra,
}: {
  turn: ActTurn
  move: Move
  first: boolean
  phone: boolean
  extra?: ReactNode
}) {
  const { s, dispatch } = useStore()
  const [typed, setTyped] = useState<Typed>({})
  const defaults = LESSON.records!.args(s, move.ix)
  const fields = move.fields ?? []
  const sent = argsOf(fields, typed, defaults)
  const running = turn.state === "running"
  const disabled = s.phase !== "idle" || sent.invalid || sent.empty
  const go = () => {
    if (disabled) return
    flashKeys(PRIMARY_KEYS)
    dispatch({ type: "act", act: turn.act, turn: turn.id, ix: move.ix, args: fields.length ? sent.args : undefined, signer: move.signer })
    setTyped({})
  }
  const mine = running && s.run?.ix === move.ix
  return (
    <div className={cn("flex gap-2", phone ? "flex-col items-stretch" : "flex-wrap items-end")}>
      {fields.length > 0 && (
        <div className={cn("flex min-w-0 gap-2", phone ? "flex-col" : "flex-[1_1_16rem] flex-wrap")}>
          <MoveInputs fields={fields} typed={typed} defaults={defaults} onChange={(n, v) => setTyped((t) => ({ ...t, [n]: v }))} onEnter={go} phone={phone} disabled={s.phase !== "idle"} />
        </div>
      )}
      <div className={cn("flex gap-2", phone ? PHONE_STACK : "flex-wrap items-center")}>
        <Button
          disabled={disabled}
          onClick={go}
          aria-busy={mine || undefined}
          // The first move is the card's primary, filled; any other is the soft one beside it
          variant={first ? "default" : "ghost"}
          className={cn("relative shrink-0", ACTION, !first && ACTION_SOFT, phone && cn(PHONE_CTA, "text-[0.9375rem]"))}
        >
          <span className={cn(mine && "invisible")}>{label(move.button, defaults)}</span>
          {mine && <Spinner className="absolute inset-0 m-auto size-4" />}
        </Button>
        {extra}
      </div>
    </div>
  )
}

/** A move card: buttons that send an instruction of a records lesson again and again from the same
 * card (Increment, Add expense, Deposit and Withdraw), the records card they change, row buttons on
 * its rows (Edit, Delete, Mark done) and the last few sends. "Until" makes the first move again, a
 * number of times or until a send is refused, each still a transaction on the card; Stop stops it.
 * A `send` card with fields (Open your account) takes the same shape, sends once and is done. Once
 * done it's one line, with the accounts as they were then under it */
export function MoveCard({ turn, phone = false }: { turn: ActTurn; phone?: boolean }) {
  const { s, dispatch } = useStore()
  const beat = BEATS[turn.beat] as ActBeat
  const sends = turn.sends ?? []
  const done = turn.state === "done"
  const once = turn.act === "send"
  const moves = once ? [{ ix: beat.ix ?? "", button: beat.button, fields: beat.fields, signer: beat.signer }] : (beat.moves ?? [])
  const own = moves.filter((m) => !m.row)
  const rowMoves = moves.filter((m) => m.row)

  // Until: the first move made again, `left` more times (Infinity until refused). It stops on a refusal,
  // on a send that didn't go (the lesson said why instead), on Stop, and when the card is done
  const [left, setLeft] = useState<number | null>(null)
  const expect = useRef<number | null>(null)
  const until = beat.until
  // A game whose moves are its cells (the board) has no button of its own: until plays its row move
  const firstIx = own[0]?.ix ?? rowMoves[0]?.ix
  const passed = until?.stop === "passed" && s.passed[turn.step]
  useEffect(() => {
    if (left === null) return
    if (done || left <= 0 || passed) return setLeft(null)
    if (s.phase !== "idle") return
    if (expect.current !== null) {
      const got = sends.length > expect.current
      const refused = got && !sends[sends.length - 1].ok
      if (!got || refused) {
        expect.current = null
        return setLeft(null)
      }
    }
    const t = window.setTimeout(() => {
      expect.current = sends.length
      dispatch({ type: "act", act: "move", turn: turn.id, ix: firstIx })
      setLeft((n) => (n === null ? null : n - 1))
    }, 250)
    return () => window.clearTimeout(t)
  }, [left, done, passed, s.phase, sends.length, dispatch, turn.id, firstIx])

  if (done) {
    const last = sends[sends.length - 1]
    const refused = sends.some((x) => !x.ok)
    return (
      <div className="rounded-control border border-border bg-(--card-ground)">
        <div className="flex h-9 items-center gap-2 px-3 text-caption text-muted-foreground">
          {turn.via === "test" || !refused ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <ListPlus className="size-3.5 text-subtle" aria-hidden="true" />}
          <span className="truncate">{actRecord(turn)}</span>
        </div>
        {last && <RecordsCard rows={last.snap.after} record closed={sends.flatMap(closedBy)} phone={phone} flat className="border-t border-border p-3" />}
      </div>
    )
  }

  const run = turn.state === "running" ? s.run : null
  const context = run ? (
    <span className="flex items-center gap-1.5">{run.stages[run.stage]}</span>
  ) : turn.state === "interrupted" ? (
    <span className="text-warning-ink">Interrupted by a reload. Send it again.</span>
  ) : (
    <Prose text={beat.context} {...READ_CODE} small />
  )
  const offer = until && (left !== null || sends.some((x) => x.ok && !x.via))
  const untilButton = offer && (
    <Button
      size="lg"
      variant="ghost"
      onClick={() => {
        expect.current = null
        setLeft(left === null ? (until.stop ? Infinity : (until.times ?? 1)) : null)
      }}
      className={cn("shrink-0 px-3", ACTION, ACTION_SOFT, phone && cn(PHONE_CTA, "text-[0.9375rem]"))}
    >
      {left !== null ? "Stop" : until.label}
    </Button>
  )
  return (
    <div data-live-card className={cn("relative mt-[25px] flex flex-col gap-3 overflow-hidden rounded-panel border border-border bg-(--card-ground) p-4", phone && "gap-4")}>
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-150 [&>svg]:size-4", run ? "bg-surface-hover text-foreground" : "bg-surface-raised text-muted-foreground")}
        >
          <ListPlus />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading text-[1rem] leading-6 font-medium text-foreground">{beat.title}</span>
          {/* The running stage and the card's line share one cell, the hidden one keeping its room, so
              the head is as tall as the longer of the two: a one line stage over a two line context made
              the whole card jump on every move (Almaz, 10 Nov) */}
          <span className="grid text-[0.875rem] leading-5 text-muted-foreground">
            <span role={run ? "status" : undefined} className="[grid-area:1/1]">
              {context}
            </span>
            {run && (
              <span aria-hidden="true" className="invisible [grid-area:1/1]">
                <Prose text={beat.context} {...READ_CODE} small />
              </span>
            )}
          </span>
        </span>
      </div>
      {/* The accounts it changes, flat under a hairline: the card is the one block, the accounts a part of it */}
      {!once && <LiveRecords moves={rowMoves} phone={phone} flat className="border-t border-border pt-3" />}
      {sends.length > 0 && (
        <ol aria-label="Sent so far" className="flex flex-col gap-1.5 px-0.5">
          {sends.slice(-3).map((x) => (
            <SendRow key={x.at} x={x} />
          ))}
        </ol>
      )}
      {/* Moves with nothing to type sit in one row, as a game's buttons do (Move right, Move left) */}
      <div className={cn(!phone && own.length > 1 && own.every((m) => !m.fields?.length) ? "flex flex-wrap items-end gap-2" : "contents")}>
        {own.map((m, i) => (
          <CardMove key={m.ix} turn={turn} move={m} first={i === 0} phone={phone} extra={i === 0 ? untilButton : undefined} />
        ))}
      </div>
      {own.length === 0 && untilButton && <div className="flex">{untilButton}</div>}
      {run && <RunBar key={run.at} stage={run.stage} stages={run.stages} />}
    </div>
  )
}
