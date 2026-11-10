import { Coins, Copy, ExternalLink, Heart } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { shortKey, type TokenView } from "../data"
import { whole } from "../lessons/tokens"
import { openExplorer } from "./explorer"

// The token card: a token lesson's mint, the accounts that hold it, and a strip for the lesson's own
// account (the Tokens family's state card: Battle Coins, SPL Token Vault, Faucet Seahorse). The records
// card draws it for a lesson whose `records` has `tokens`, so every place that shows records shows this:
// a send's result, the live move card, the finish, the Call panel. The same box as the records card,
// `flat` inside a card that has one

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

/** The mint's key, with Copy and Explorer as icons */
function MintKey({ value, phone }: { value: string; phone: boolean }) {
  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => toast("Mint address copied"))
      .catch(() => toast("Couldn't copy the mint address"))
  const icon = cn("grid shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground", phone ? "size-9" : "size-6")
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={NOTE}>Mint</span>
      <span className={`min-w-0 truncate ${MONO} text-muted-foreground`} title={value}>
        {shortKey(value, phone ? 4 : 6)}
      </span>
      <button type="button" onClick={copy} aria-label="Copy the mint address" className={icon}>
        <Copy strokeWidth={1.75} className="size-3.5" />
      </button>
      <button type="button" onClick={openExplorer} aria-label="Open the mint in Explorer" className={icon}>
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </button>
    </span>
  )
}

/** The lesson's own account over the token: a meter of ten cells when it has one (Battle Coins'
 * health), and its lines (Faucet Seahorse's price and the time to the next drip) */
function Strip({ strip, phone }: { strip: NonNullable<TokenView["strip"]>; phone: boolean }) {
  const m = strip.meter
  const cells = m ? Math.round((m.value / m.max) * 10) : 0
  const empty = !!m && m.value === 0
  return (
    <div className="flex flex-col gap-1.5 border-b border-border pb-2">
      <div className="flex min-w-0 items-baseline gap-2 text-caption">
        <span className="shrink-0 font-act text-foreground">{strip.label}</span>
        <span className={`min-w-0 truncate ${MONO} text-muted-foreground`} title={strip.key}>
          {shortKey(strip.key, phone ? 4 : 6)}
        </span>
      </div>
      {m && (
        <div className="flex items-center gap-2" aria-label={`${m.value} of ${m.max} health`}>
          <Heart aria-hidden="true" className={cn("size-3.5", empty ? "text-error" : "text-brand-green")} />
          {/* PlayerCard's thin meter: the number beside it carries the value */}
          <span aria-hidden="true" className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={cn("h-1 w-3 rounded-full transition-colors duration-300 motion-reduce:transition-none", i < cells ? "bg-brand-green" : "bg-foreground/10")} />
            ))}
          </span>
          <span className={cn("font-mono text-[0.8125rem] tabular-nums", empty ? "text-error" : "text-foreground")}>
            {m.value}/{m.max}
          </span>
        </div>
      )}
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
  return (
    <div className={cn("flex flex-col gap-2", !flat && "rounded-control border border-border bg-surface-well px-3 py-2.5", className)}>
      {view.strip && <Strip strip={view.strip} phone={phone} />}
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex min-w-0 items-center gap-2">
            {/* The coin's icon: a gold disc once Token Metadata names it, a neutral one before */}
            <span
              aria-hidden="true"
              className={cn("grid size-5 shrink-0 place-items-center rounded-full", m.metadata ? "bg-warning text-[0.625rem] font-semibold text-warning-foreground" : "bg-foreground/[0.08] text-muted-foreground")}
            >
              {m.metadata ? m.name.slice(0, 1) : <Coins className="size-3" />}
            </span>
            <span className="min-w-0 truncate font-act text-[0.875rem] text-foreground">{m.name}</span>
            {m.symbol && <span className={`shrink-0 rounded bg-foreground/[0.06] px-1 ${MONO} text-muted-foreground`}>{m.symbol}</span>}
            {!m.metadata && <span className="shrink-0 text-caption text-subtle">no metadata</span>}
          </span>
          <span className={cn("min-w-0", !phone && "ml-auto")}>
            <MintKey value={m.key} phone={phone} />
          </span>
        </div>
        {/* One line of text that wraps as text: the delta pill sits inline, after the supply */}
        <p className={NOTE}>
          Supply <span className={`${MONO} text-foreground`}>{whole(m.supply, m.decimals)}</span>{" "}
          <Delta by={before?.mint ? m.supply - before.mint.supply : 0} decimals={m.decimals} /> · <span className={MONO}>{m.decimals}</span> decimals · Mint authority:{" "}
          {m.authority}
        </p>
      </div>
      {view.holders.length > 0 && (
        <ul className="flex flex-col gap-0.5 border-t border-border pt-2">
          {view.holders.map((h) => {
            const old = before?.holders.find((x) => x.id === h.id)
            const created = !!before && !old
            return (
              <li
                key={h.id}
                className={cn(
                  "-mx-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-md px-1.5 py-1 transition-colors duration-500 motion-reduce:transition-none",
                  created ? "animate-rise bg-success/[0.08]" : "bg-transparent"
                )}
              >
                <span className={cn("flex min-w-0 items-baseline gap-2", phone && "flex-wrap gap-y-0")}>
                  <span className="shrink-0 font-act text-caption text-foreground">{h.label}</span>
                  <span className={`min-w-0 truncate ${MONO} text-muted-foreground`} title={h.key}>
                    {shortKey(h.key, phone ? 4 : 6)}
                  </span>
                  <span className="shrink-0 text-caption text-subtle">{h.owner}</span>
                </span>
                <span className="flex shrink-0 items-baseline justify-end gap-1.5">
                  <Delta by={old ? h.amount - old.amount : 0} decimals={m.decimals} />
                  <span key={h.amount} className={cn(MONO, "text-foreground", old && old.amount !== h.amount && "pg-arrive")} title={`${h.amount.toLocaleString("en-US")} base units`}>
                    {whole(h.amount, m.decimals)} {unit}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {refused && <p className="text-caption text-error">{refused}</p>}
    </div>
  )
}
