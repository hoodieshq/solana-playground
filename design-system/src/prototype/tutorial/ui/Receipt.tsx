import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, TX_CONFIRMED, TX_FEE, shortKey, type Tx } from "../data"
import { openExplorer } from "./explorer"

type Row = { label: string; value: ReactNode; text: string }

/** What a transaction cost and who paid, in the order a newcomer asks: what ran, who paid, what it
 * said. Grouped, with a hairline between groups; the signature closes it */
function groups(tx: Tx): Row[][] {
  const units = `${tx.compute.toLocaleString("en-US")} CU`
  const muted = (text: string) => <span className="text-muted-foreground">{text}</span>
  return [
    [
      // The key never breaks across lines: on a narrow card it goes under the name, whole
      { label: "Program", value: <>hello_anchor <span className="whitespace-nowrap text-muted-foreground">· {shortKey(PROGRAM_ID)}</span></>, text: `hello_anchor (${PROGRAM_ID})` },
      { label: "Instruction", value: <span className="font-mono">{tx.instruction}</span>, text: tx.instruction },
    ],
    [
      { label: "Fee payer", value: <>Kora {muted("· signer")}</>, text: "Kora (signer)" },
      { label: "You", value: "0 SOL", text: "0 SOL" },
      { label: "Fee", value: <>{TX_FEE} {muted("· paid by Kora")}</>, text: `${TX_FEE}, paid by Kora` },
      { label: "Compute", value: units, text: units },
      { label: "Confirmed", value: TX_CONFIRMED, text: TX_CONFIRMED },
    ],
    // The line the program wrote, the reason the receipt is worth reading
    [{ label: "Log", value: <span className="font-mono text-foreground">{tx.said}</span>, text: tx.said }],
  ]
}

/** The receipt as plain text, for pasting into a chat: full keys, since nobody can look up a cut one */
function receiptText(tx: Tx) {
  const rows = [...groups(tx).flat(), { label: "Signature", text: tx.signature }]
  return [
    "Hello Anchor · transaction receipt",
    ...rows.map((r) => `${r.label.padEnd(12)}${r.text}`),
    "Example values from the Solana Playground tutorial prototype",
  ].join("\n")
}

const copy = (text: string, what: string) =>
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast(`${what} copied`))
    .catch(() => toast(`Couldn't copy the ${what.toLowerCase()}`))

// Receipts already printed this session, so each prints once: as its transaction comes back, or as
// the finish opens. Coming back to it later, or after switching views, finds it already there
const printed = new Set<string>()
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")

/** Whether a receipt keyed `print` still has to print. Read once, as it mounts, so it doesn't stop
 * halfway when something above it renders again */
function usePrint(print: string | null | undefined) {
  const [on] = useState(() => !!print && !printed.has(print) && !reduce.matches)
  useEffect(() => {
    if (print) printed.add(print)
  }, [print])
  return on
}

/** A row's place in the print order: rows come out one by one, 60ms apart (see prototype.css) */
const at = (i: number) => ({ "data-print": "", style: { "--i": i } as CSSProperties })

// Copy and Explorer reach past the row's padding, so each is 44px tall for a finger. On a narrow
// card they keep only their icons, each a 44px square, so the signature keeps room to be read
const LINK =
  "-my-2 flex shrink-0 items-center gap-1 py-2 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 @max-[17rem]:-mx-1.5 @max-[17rem]:size-11 @max-[17rem]:justify-center @max-[17rem]:py-0"

/** What a transaction leaves behind, under its log: a receipt rather than a bare signature, so what
 * ran, who paid and what the program said read in one place. `print` keys it, so it prints once
 * as its transaction arrives. On a narrow card (a 320px phone, or a large font) each label goes over its value. The cut is lower
 * than the key cards' 20rem, so the 21rem receipt beside a desktop log keeps its two columns */
export function Receipt({ tx, print, className }: { tx: Tx; print?: string | null; className?: string }) {
  const printing = usePrint(print)
  let i = 0
  const row = "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 py-px @max-[17rem]:grid-cols-1 @max-[17rem]:py-0.5"
  return (
    <section aria-label="Transaction receipt" className={cn("@container rounded-control border border-border bg-surface-panel px-3 py-2.5 text-caption", className)}>
      <div className={cn("flex flex-col", printing && "pg-print")}>
        {/* Explorer opens the whole transaction, so it sits by the title, and the signature row keeps
            room for the key and its Copy */}
        <div {...at(i++)} className="mb-1 flex items-center justify-between gap-3">
          <h3 className="font-label text-foreground">Transaction</h3>
          <button type="button" onClick={openExplorer} className={cn(LINK, "@max-[17rem]:-mr-3")}>
            <span className="@max-[17rem]:sr-only">Explorer</span>
            <ExternalLink strokeWidth={1.75} className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <dl className="contents">
          {groups(tx).map((group, g) => (
            <div key={g} className={cn("contents", g > 0 && "[&>div:first-child]:mt-1.5 [&>div:first-child]:border-t [&>div:first-child]:border-border [&>div:first-child]:pt-1.5")}>
              {group.map((r) => (
                <div key={r.label} {...at(i++)} className={row}>
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="min-w-0 break-words text-foreground">{r.value}</dd>
                </div>
              ))}
            </div>
          ))}
          <div {...at(i++)} className={cn(row, "mt-1.5 items-center border-t border-border pt-1.5")}>
            <dt className="text-muted-foreground">Signature</dt>
            <dd className="flex min-w-0 items-center gap-3">
              <code title={tx.signature} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
                {shortKey(tx.signature)}
              </code>
              <button type="button" onClick={() => copy(tx.signature, "Signature")} className={cn(LINK, "@max-[17rem]:-mr-3")}>
                <Copy strokeWidth={1.75} className="hidden size-3.5 @max-[17rem]:block" aria-hidden="true" />
                <span className="@max-[17rem]:sr-only">Copy</span>
              </button>
            </dd>
          </div>
        </dl>
        {/* Honest about the numbers without a warning's weight */}
        <p {...at(i++)} className="mt-2 text-[0.6875rem] text-muted-foreground">
          Example values in this prototype
        </p>
      </div>
    </section>
  )
}

/** The finish's last transaction as a printed receipt: mono, dashed hairlines, a torn foot, and
 * Copy as text for sharing it. Prints once, as the finish opens */
export function PrintedReceipt({ tx, when, className }: { tx: Tx; when: number | null; className?: string }) {
  const printing = usePrint(`finish:${when}`)
  const date = when === null ? null : new Date(when).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
  let i = 0
  const row = "flex justify-between gap-x-4 py-0.5 @max-xs:flex-col"
  const action = "flex min-h-11 items-center gap-1.5 text-muted-foreground hover:text-foreground"
  return (
    <section aria-labelledby="receipt-title" className={className}>
      <h2 id="receipt-title" className="text-caption text-muted-foreground">
        Your last transaction
      </h2>
      {/* The foot is torn, so the card has no border at the bottom: the teeth are its edge */}
      <div className="pg-receipt @container mt-2 rounded-t-control border border-b-0 border-border bg-surface-panel px-4 pt-4 font-mono text-code">
        <div className={cn("flex flex-col", printing && "pg-print")}>
          <p {...at(i++)} className="text-center text-foreground">
            hello_anchor · devnet
          </p>
          {date && (
            <p {...at(i++)} className="text-center text-muted-foreground">
              {date}
            </p>
          )}
          <dl className="contents">
            {groups(tx).map((group, g) => (
              <div
                key={g}
                className="contents [&>div:first-child]:mt-3 [&>div:first-child]:border-t [&>div:first-child]:border-dashed [&>div:first-child]:border-border-strong [&>div:first-child]:pt-3"
              >
                {group.map((r) => (
                  <div key={r.label} {...at(i++)} className={row}>
                    <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
                    <dd className="min-w-0 text-right break-words text-foreground @max-xs:text-left">{r.value}</dd>
                  </div>
                ))}
              </div>
            ))}
            <div {...at(i++)} className={cn(row, "mt-3 border-t border-dashed border-border-strong pt-3")}>
              <dt className="shrink-0 text-muted-foreground">Signature</dt>
              <dd title={tx.signature} className="min-w-0 text-right text-foreground @max-xs:text-left">
                {shortKey(tx.signature)}
              </dd>
            </div>
          </dl>
          <p {...at(i++)} className="mt-3 text-center font-sans text-[0.6875rem] text-muted-foreground">
            Example values in this prototype
          </p>
          <div {...at(i++)} className="mt-2 flex flex-wrap justify-center gap-x-6 border-t border-dashed border-border-strong pt-1 font-sans text-caption">
            <button type="button" onClick={() => copy(receiptText(tx), "Receipt")} className={action}>
              <Copy strokeWidth={1.75} className="size-3.5" aria-hidden="true" />
              Copy as text
            </button>
            <button type="button" onClick={openExplorer} className={action}>
              Explorer
              <ExternalLink strokeWidth={1.75} className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
