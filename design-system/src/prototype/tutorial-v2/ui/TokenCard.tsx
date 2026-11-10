import { Copy, ExternalLink, Heart } from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { shortKey, type TokenView } from "../data"
import { whole } from "../lessons/tokens"
import { openExplorer } from "./explorer"

// The token card: a token lesson's mint, the accounts that hold it, and a strip for the lesson's own
// account (the Tokens family's state card: Battle Coins, SPL Token Vault, Faucet Seahorse). The records
// card draws it for a lesson whose `records` has `tokens`, so every place that shows records shows this:
// a send's result, the live move card, the finish, the Call panel. The same box as the records card,
// `flat` inside a card that has one.
//
// Every account is one row of the same shape (Almaz, 10 Nov: the mixed lines read as a mess): its name
// and its address under it on the left, its number and a note under it on the right. So the addresses
// stand in one column and the numbers in another

const MONO = "font-mono text-[0.75rem] tabular-nums"
const NOTE = "text-caption text-muted-foreground"

/** What a move changed, beside the number it changed: `+1` in green, `−1` muted */
function Delta({ by, decimals }: { by: number; decimals: number }) {
  if (!by) return null
  return (
    <span className={cn("pg-arrive rounded-full px-1.5 font-mono text-[0.6875rem] leading-4 tabular-nums", by > 0 ? "bg-success/10 text-success" : "bg-foreground/[0.06] text-muted-foreground")}>
      {by > 0 ? "+" : "−"}
      {whole(Math.abs(by), decimals)}
    </span>
  )
}

/** Copy and Explorer for the mint's address, as icons after it */
function MintTools({ value, phone }: { value: string; phone: boolean }) {
  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => toast("Mint address copied"))
      .catch(() => toast("Couldn't copy the mint address"))
  const icon = cn("grid shrink-0 place-items-center rounded-md text-subtle hover:text-foreground", phone ? "-mx-1.5 -my-2.5 size-9" : "-my-1 size-6")
  return (
    <>
      <button type="button" onClick={copy} aria-label="Copy the mint address" className={icon}>
        <Copy strokeWidth={1.75} className="size-3.5" />
      </button>
      <button type="button" onClick={openExplorer} aria-label="Open the mint in Explorer" className={icon}>
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </button>
    </>
  )
}

/** One account: name (and a tag) over its address on the left, the number over a note on the right */
function Row({
  name,
  tag,
  aside,
  address,
  after,
  value,
  delta,
  note,
  phone,
  className,
}: {
  name: string
  tag?: string
  /** Quiet words after the name: who may mint the token */
  aside?: string
  address: string
  /** Beside the address: the mint's tools, who owns an account that isn't yours */
  after?: ReactNode
  value: ReactNode
  /** What the last move changed, on the note's line so the number keeps its width */
  delta?: ReactNode
  note?: string
  phone: boolean
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          {/* The name keeps its room; the quiet words after it give way first */}
          <span className="max-w-full shrink-0 truncate font-act text-[0.8125rem] leading-5 text-foreground">{name}</span>
          {tag && <span className={`shrink-0 rounded bg-foreground/[0.06] px-1 ${MONO} leading-4 text-muted-foreground`}>{tag}</span>}
          {aside && <span className="min-w-0 truncate text-caption text-subtle">{aside}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1 leading-4">
          <span className={`min-w-0 truncate ${MONO} text-muted-foreground`} title={address}>
            {shortKey(address, phone ? 4 : 6)}
          </span>
          {after}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="flex items-center leading-5">{value}</span>
        {(delta || note) && (
          <span className={`flex items-center gap-1.5 ${NOTE} leading-4`}>
            {delta}
            {note}
          </span>
        )}
      </div>
    </div>
  )
}

/** A number on the right: mono, in the text's colour */
const Num = ({ children, moved }: { children: ReactNode; moved?: boolean }) => (
  <span className={cn("font-mono text-[0.8125rem] text-foreground tabular-nums", moved && "pg-arrive")}>{children}</span>
)

/** The lesson's own account over the token: its number (Faucet Seahorse's price) or a meter of ten
 * cells (Battle Coins' health), then its lines under the row (the time to the next drip) */
function Strip({ strip, phone }: { strip: NonNullable<TokenView["strip"]>; phone: boolean }) {
  const m = strip.meter
  const cells = m ? Math.round((m.value / m.max) * 10) : 0
  const empty = !!m && m.value === 0
  const meter = m && (
    <span className="flex items-center gap-2" aria-label={`${m.value} of ${m.max} health`}>
      <Heart aria-hidden="true" className={cn("size-3.5", empty ? "text-error" : "text-brand-green")} />
      {/* PlayerCard's thin meter: the number beside it carries the value */}
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cn("h-1 w-2.5 rounded-full transition-colors duration-300 motion-reduce:transition-none", i < cells ? "bg-brand-green" : "bg-foreground/10")} />
        ))}
      </span>
      <span className={cn("font-mono text-[0.8125rem] tabular-nums", empty ? "text-error" : "text-foreground")}>
        {m.value}/{m.max}
      </span>
    </span>
  )
  return (
    <div className="flex flex-col gap-2">
      <Row name={strip.label} address={strip.key} value={meter || <Num>{strip.value}</Num>} note={strip.note} phone={phone} />
      {strip.lines.map((l) => (
        <p key={l.split(" ")[0]} className={`${NOTE} tabular-nums`} aria-live="off">
          {l}
        </p>
      ))}
    </div>
  )
}

/** The token as a card draws it. `was` is the view before the change that `fresh` says is still news:
 * the deltas show beside what moved, a new holder's row is tinted. `refused` says what a refusal left
 * as it was. No mint yet, no card */
export function TokenCard({
  view,
  was,
  fresh,
  refused,
  phone = false,
  flat = false,
  className,
}: {
  view: TokenView
  was?: TokenView
  fresh: boolean
  refused?: string
  phone?: boolean
  flat?: boolean
  className?: string
}) {
  const m = view.mint
  if (!m) return null
  const before = fresh ? was : undefined
  const unit = m.symbol ?? m.name
  const supplyBy = before?.mint ? m.supply - before.mint.supply : 0
  return (
    // Each account under a hairline of its own, 12 above and below it: run together at 12 apart, the rows
    // and the strip's line under the price read as one block (Almaz, 10 Nov)
    <div
      className={cn(
        "flex flex-col divide-y divide-border [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0",
        !flat && "rounded-control border border-border bg-surface-well px-3 py-2.5",
        className
      )}
    >
      {view.strip && <Strip strip={view.strip} phone={phone} />}
      {/* The mint: its supply is the number; who may mint it, the lesson's point, sits quiet by the name */}
      <Row
        name={m.name}
        tag={m.symbol}
        aside={`minted by ${m.authority}`}
        address={m.key}
        after={<MintTools value={m.key} phone={phone} />}
        value={<Num moved={!!supplyBy}>{whole(m.supply, m.decimals)}</Num>}
        delta={<Delta by={supplyBy} decimals={m.decimals} />}
        note="supply"
        phone={phone}
      />
      {view.holders.map((h) => {
        const old = before?.holders.find((x) => x.id === h.id)
        const created = !!before && !old
        const by = old ? h.amount - old.amount : 0
        return (
          <Row
            key={h.id}
            name={h.label}
            address={h.key}
            // "yours" says again what the label's Your already did; another owner is news
            after={h.owner !== "yours" && <span className="shrink-0 truncate text-caption leading-4 text-subtle">{h.owner}</span>}
            value={
              <Num moved={!!by}>
                <span title={`${h.amount.toLocaleString("en-US")} base units`}>
                  {whole(h.amount, m.decimals)} {unit}
                </span>
              </Num>
            }
            delta={by ? <Delta by={by} decimals={m.decimals} /> : undefined}
            phone={phone}
            // Tinted while it's new, a little out past the column; otherwise square, so its hairline runs full width
            className={cn("transition-colors duration-500 motion-reduce:transition-none", created && "-mx-1.5 animate-rise rounded-md bg-success/[0.08] px-1.5")}
          />
        )
      })}
      {refused && <p className="text-caption text-error">{refused}</p>}
    </div>
  )
}
