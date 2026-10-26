import { useState, type CSSProperties, type ReactNode } from "react"
import { ChevronDown, CircleCheck, CircleX, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CLIENT, LIB, PROGRAM_ID, STEPS, TX_CONFIRMED, TX_FEE, shortKey, type Tx } from "../../data"
import { useStore, type Turn } from "../../store"
import { arriving } from "../../tx"
import { BuildLog } from "../BuildLog"
import { openExplorer } from "../explorer"
import { HelloSource } from "../HelloPeek"
import { ProgramId } from "../ProgramId"
import { Prose } from "../Prose"
import { ACTION, ACTION_FILL, ACTION_SOFT, HEADING, PHONE_CTA, READ, READ_CODE, secs } from "../type"

type ResultTurn = Extract<Turn, { kind: "result" }>

// Receipts already printed this session: each prints once, as its transaction arrives
const printed = new Set<number>()

const FROM: Record<NonNullable<ResultTurn["from"]>, string> = { client: "Sent from client.ts", chat: "Sent from the chat", test: "Called from the Call panel" }

/** The compiler's code and line, "E0412 · line 9" */
function errorMeta(t: ResultTurn) {
  const code = t.log.find((l) => /^error\[/.test(l))?.match(/\[(E\d+)\]/)?.[1]
  return [code, t.fail ? `line ${t.fail.line}` : null].filter(Boolean).join(" · ")
}

const copy = (text: string, what: string) =>
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast(`${what} copied`))
    .catch(() => toast(`Couldn't copy the ${what.toLowerCase()}`))

/** The transaction's proof in one caption line, last: the signature with Copy and Explorer as icons,
 * then what it cost and how fast. It wraps on a narrow column. It prints in, once, as the transaction
 * comes back */
function CompactReceipt({ tx, print, phone }: { tx: Tx; print: boolean; phone: boolean }) {
  // On a phone Copy and Explorer are 44px squares, pulled in by their own padding so the line keeps its height
  const icon = cn("grid size-6 shrink-0 place-items-center rounded-md hover:bg-surface-hover hover:text-foreground", phone && "-my-2.5 size-11")
  return (
    <div className={`border-t border-border pt-2 text-caption text-muted-foreground ${print ? "pg-print" : ""}`}>
      <div data-print="" style={{ "--i": 0 } as CSSProperties} className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <code title={tx.signature} className="mr-1 min-w-0 truncate font-mono text-foreground">
          {shortKey(tx.signature)}
        </code>
        <button type="button" aria-label="Copy signature" title="Copy signature" onClick={() => copy(tx.signature, "Signature")} className={icon}>
          <Copy className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Open in Explorer" title="Open in Explorer" onClick={openExplorer} className={icon}>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </button>
        <span className="tabular-nums">
          fee {TX_FEE}, paid by Kora · {tx.compute.toLocaleString("en-US")} CU · {TX_CONFIRMED}
        </span>
      </div>
    </div>
  )
}

/** A run's outcome, one shape for build, deploy, run, call and Test sends: a status icon, a title,
 * a meta line and Show log. A failure is tinted red and carries Explain while it's the live card */
export function ResultCard({ turn, latest, phone = false }: { turn: ResultTurn; latest: boolean; phone?: boolean }) {
  const { dispatch } = useStore()
  const [log, setLog] = useState(false)
  // A failure that's no longer live goes quiet: its head, and the log on request
  const [openFail, setOpenFail] = useState(false)
  const [print] = useState(() => !!turn.tx && !printed.has(turn.id) && arriving(turn.at) !== null)
  if (turn.tx) printed.add(turn.id)

  const showLog = () => {
    setLog(!log)
    if (!log) dispatch({ type: "terminal", open: true })
  }
  // `big` is the live failure's head: the card's title, so it reads over the message under it, at the
  // question card's inset. Every other result keeps the compact status row
  const head = (icon: ReactNode, title: string, meta: string, extra?: ReactNode, big = false) => (
    <div className={cn("flex items-center gap-2", big ? "h-12 px-4" : "h-9 px-3", phone && !big && "h-11", !turn.ok && "bg-error/[0.08]")}>
      {icon}
      <span className={cn("shrink-0 text-foreground", big ? HEADING : "text-[0.8125rem] font-label")}>{title}</span>
      {extra}
      <span className="min-w-0 truncate text-caption text-muted-foreground">{meta}</span>
      <button
        type="button"
        aria-label={log ? "Hide log" : "Show log"}
        aria-expanded={log}
        onClick={(e) => {
          e.stopPropagation()
          if (turn.ok) showLog()
          else if (turn.open) setLog(!log)
          else setOpenFail(!openFail)
        }}
        className={cn(
          "group/chev -mr-1.5 ml-auto grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground",
          // A thumb's square on a phone, reaching to the card's edge so the row keeps its height. The fill is
          // a 32px square inside it, not the whole 44, which ran into the card's edge and corner
          phone && "-mr-3 size-11 hover:bg-transparent"
        )}
      >
        {phone ? (
          <span className="grid size-8 place-items-center rounded-lg group-active/chev:bg-foreground/[0.08]">
            <ChevronDown className={cn("size-3.5 transition-transform duration-150 motion-reduce:transition-none", log && "rotate-180")} />
          </span>
        ) : (
          <ChevronDown className={cn("size-3.5 transition-transform duration-150 motion-reduce:transition-none", log && "rotate-180")} />
        )}
      </button>
    </div>
  )
  const logFold = log && <BuildLog log={turn.log} className="max-h-48 border-t border-border" />

  if (!turn.ok) {
    const f = turn.fail
    const file = turn.act === "run" ? CLIENT : LIB
    const pointer = turn.log.find((l) => l.trim().startsWith("-->"))
    const live = !!turn.open
    const run = turn.act === "run"
    return (
      // Live, it's a card that waits on you, rounded as the intro and the question are; folded, a status row
      <div role="status" className={cn("overflow-hidden border border-error/40 bg-(--card-ground)", live ? "rounded-panel" : "rounded-control")}>
        {/* Once it's no longer live, its head opens it again: the chevron, or anywhere on the row */}
        <div onClick={live ? undefined : () => setOpenFail(!openFail)} className={cn(!live && "cursor-pointer")}>
          {head(
            <CircleX className="size-4 shrink-0 text-error" />,
            run ? "Run failed" : "Build failed",
            live || openFail ? errorMeta(turn) : errorMeta(turn).replace(" · ", " on "),
            undefined,
            live
          )}
        </div>
        {(live || openFail) && f && (
          <div className={cn("flex flex-col gap-4 border-t border-error/20", live ? "px-4 py-4" : "px-3 py-3")}>
            {/* The compiler's words on a red rule, set off as a quote of its output: no well, so its first
                letter lines up with the message under it instead of sitting a box further in */}
            <div className="border-l-2 border-error/40 pl-3 font-mono text-[0.8125rem] leading-[1.6]">
              <p className="break-words text-foreground/90">{turn.log.find((l) => /^error/i.test(l)) ?? f.reason}</p>
              {pointer && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "reveal", file, lines: [f.line], caret: true })}
                  className={cn("text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground", phone && "-my-3 py-3 text-left")}
                >
                  {pointer.trim()}
                </button>
              )}
            </div>
            <p className={READ}>
              <Prose text={turn.planned ? (STEPS[0].planned ?? f.reason) : f.reason} {...READ_CODE} />
            </p>
            {live && (
              // The same buttons as the intro's Start: the heading face, one height, full width on a phone
              <div className={cn("flex items-center gap-2", phone ? "flex-col items-stretch" : "flex-wrap")}>
                <Button className={cn(ACTION, ACTION_FILL, phone && PHONE_CTA)} onClick={() => dispatch({ type: "explain" })}>
                  Explain the error
                </Button>
                {/* A phone can't type the fix, so it isn't offered there: Explain leads to the lines instead */}
                {!phone && (
                  <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => dispatch({ type: "fixMyself" })}>
                    I'll fix it myself
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        {logFold}
      </div>
    )
  }

  const ok = <CircleCheck className="size-4 shrink-0 text-success" />
  const took = turn.took ? secs(turn.took) : ""

  if (turn.act === "build")
    return (
      <div role="status" className="overflow-hidden rounded-control border border-border bg-(--card-ground)">
        {head(ok, "Build successful", `IDL: 1 instruction · hello${turn.args && turn.args !== "()" ? turn.args : ""} · ${took}`)}
        {logFold}
      </div>
    )

  if (turn.act === "deploy" || turn.act === "buildDeploy")
    return (
      <div role="status" className="overflow-hidden rounded-control border border-border bg-(--card-ground)">
        {head(ok, turn.upgrade ? `Upgraded ${shortKey(PROGRAM_ID)}` : "Deployed", "0 SOL, paid by Kora")}
        <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
          {turn.upgrade ? (
            <p className="font-mono text-[0.75rem] text-muted-foreground">IDL: 1 instruction · hello{turn.args}</p>
          ) : (
            <>
              <ProgramId phone={phone} />
              <p className="text-[0.75rem] text-subtle">Programs nobody calls for 7 days are closed. Deploy again to bring one back.</p>
            </>
          )}
        </div>
        {logFold}
      </div>
    )

  // A transaction: what the program said back, where it came from, and the receipt
  const tx = turn.tx!
  const from = turn.from ?? "client"
  return (
    <div role="status" className="overflow-hidden rounded-control border border-border bg-(--card-ground)">
      {head(ok, "Confirmed", FROM[from])}
      {latest || log ? (
        <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
          <HelloSource before={<p className="mb-1 font-mono text-code break-words text-foreground">Program log: {tx.said}</p>} />
          <CompactReceipt tx={tx} print={print} phone={phone} />
        </div>
      ) : (
        <p className="border-t border-border px-3 py-2 font-mono text-code text-muted-foreground">Program log: {tx.said}</p>
      )}
      {logFold}
    </div>
  )
}
