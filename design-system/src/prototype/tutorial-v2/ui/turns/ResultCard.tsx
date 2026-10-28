import { useState, type CSSProperties, type ReactNode } from "react"
import { Check, ChevronDown, CircleX, Copy, ExternalLink, Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

import { CLIENT, DEPLOY_COST, FAUCET_URL, LESSON, LIB, PROGRAM_ID, STEPS, TX_CONFIRMED, TX_FEE, UPGRADE_COST, WALLET, programLog, shortKey, type Tx } from "../../data"
import { idlLine } from "../../idl"
import { useStore, type Turn } from "../../store"
import { arriving } from "../../tx"
import { BuildLog } from "../BuildLog"
import { openExplorer } from "../explorer"
import { HelloSource } from "../HelloPeek"
import { MemoryCard } from "../MemoryCard"
import { PlayerCard } from "../PlayerCard"
import { ProgramId } from "../ProgramId"
import { Prose } from "../Prose"
import { ACTION, ACTION_FILL, ACTION_SOFT, FOCUS, HEADING, PHONE_CTA, READ, READ_CODE, secs } from "../type"

type ResultTurn = Extract<Turn, { kind: "result" }>

// Receipts already printed this session: each prints once, as its transaction arrives
const printed = new Set<number>()

const FROM: Record<NonNullable<ResultTurn["from"]>, string> = { client: "from client.ts", chat: "from the chat", test: "from the Call panel" }

const KB = 1024

/** The player a game's client printed, `Wood: 0, energy: 5`, as it was at that run */
function playerIn(log: string[]) {
  const m = log.map((l) => l.match(/^Wood: (\d+), energy: (\d+)$/)).find(Boolean)
  return m ? { wood: Number(m[1]), energy: Number(m[2]) } : null
}

/** The accounts a memory lesson's call printed after it, `Map: 10240 bytes` or the big map's line,
 * with where it was painted once it was */
function memoryIn(log: string[]) {
  const map = log.map((l) => l.match(/^Map: (\d+) bytes$/)).find(Boolean)
  const big = log.map((l) => l.match(/^Big map: (\d+) bytes(?:, painted at byte (\d+))?$/)).find(Boolean)
  if (!map && !big) return null
  return { map: map ? Number(map[1]) : 0, big: big ? { size: Number(big[1]), at: big[2] === undefined ? undefined : Number(big[2]) } : null }
}

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

/** The transaction's proof under a hairline, last: the signature with Copy and Explorer as icons, then
 * who paid. One line when the card has the room, two when it doesn't. Compute and time wait in the
 * details. It prints in, once, as the transaction comes back */
function CompactReceipt({ tx, print, phone }: { tx: Tx; print: boolean; phone: boolean }) {
  // On a phone Copy and Explorer are 44px squares, pulled in by their own padding so the line keeps its height
  const icon = cn("grid size-6 shrink-0 place-items-center rounded-md hover:bg-surface-hover hover:text-foreground", FOCUS, phone && "-my-2.5 size-11")
  return (
    // A plain string, not cn: cn would read text-caption next to the colour as one and drop it
    <div
      className={`flex flex-col gap-1 border-t border-border pt-3 text-caption text-muted-foreground @[25rem]:flex-row @[25rem]:items-center @[25rem]:justify-between @[25rem]:gap-3 ${print ? "pg-print" : ""}`}
    >
      <div data-print="" style={{ "--i": 0 } as CSSProperties} className="flex min-w-0 items-center gap-1">
        {/* Muted: the signature is the proof, not the result */}
        <code title={tx.signature} className="mr-1 min-w-0 truncate font-mono text-[0.75rem]">
          {shortKey(tx.signature)}
        </code>
        <button type="button" aria-label="Copy signature" title="Copy signature" onClick={() => copy(tx.signature, "Signature")} className={icon}>
          <Copy className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Open in Explorer" title="Open in Explorer" onClick={openExplorer} className={icon}>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <span data-print="" style={{ "--i": 1 } as CSSProperties} className="whitespace-nowrap tabular-nums">
        fee {TX_FEE} from your wallet
      </span>
    </div>
  )
}

/** An instruction as the learner wrote it, without its arguments: `hello(name)` is hello */
const ixName = (tx: Tx) => tx.instruction.replace(/\(.*$/, "")

/** A label over the details' log, and on a desktop the way to the whole output in the terminal */
function LogHead({ label, phone }: { label: string; phone: boolean }) {
  const { dispatch } = useStore()
  return (
    <div className="flex items-center justify-between gap-3 text-caption text-muted-foreground">
      <span>{label}</span>
      {!phone && (
        <button
          type="button"
          title="Terminal ⌘J"
          onClick={() => dispatch({ type: "terminal", open: true })}
          className={cn("rounded-sm underline-offset-4 hover:text-foreground hover:underline", FOCUS)}
        >
          Open terminal
        </button>
      )}
    </div>
  )
}

/** The card every finished run shares: a head that is the toggle, the result under it, and details
 * that open in the same box, never a box of their own. `body` shows on the latest card; an older one
 * folds to its head and keeps the body in the details */
function Shell({
  icon,
  title,
  meta,
  body,
  details,
  latest,
  phone,
}: {
  icon: ReactNode
  title: string
  meta: ReactNode
  body?: ReactNode
  details: ReactNode
  latest: boolean
  phone: boolean
}) {
  const [open, setOpen] = useState(false)
  // A card showing its result opens its details from the foot, where they appear: a chevron in the
  // head opened the card's far end, past everything between. A folded card, or one with no body,
  // opens right under its head, so there the head is the toggle
  const foot = latest && !!body
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-standard group-hover:text-foreground motion-reduce:transition-none",
        open && "rotate-180"
      )}
    />
  )
  const status = (
    <>
      {icon}
      <span className="shrink-0 text-[0.8125rem] font-label text-foreground">{title}</span>
      <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">{meta}</span>
    </>
  )
  const row = cn("flex h-9 w-full items-center gap-2 px-3 text-left", phone && "h-11")
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="@container overflow-hidden rounded-control border border-border bg-(--card-ground)">
      <div role="status">
        {foot ? (
          <div className={row}>{status}</div>
        ) : (
          <CollapsibleTrigger
            className={cn(
              row,
              "group transition-colors duration-150 ease-standard hover:bg-foreground/[0.04] active:bg-foreground/[0.06] motion-reduce:transition-none",
              FOCUS
            )}
          >
            {status}
            <span className="sr-only">Details</span>
            {chevron}
          </CollapsibleTrigger>
        )}
        {latest && body && <div className="flex flex-col gap-3 px-3 pb-3">{body}</div>}
      </div>
      {/* The card's own foot, under a hairline, the chevron at the edge as on a folded card's head: a
          control of the card, not one more line of what it says */}
      {/* text-caption outside cn, which takes it for a colour and drops it next to text-muted-foreground */}
      {foot && (
        <CollapsibleTrigger
          className={`${cn(
            "group flex h-8 w-full items-center justify-between border-t border-border px-3 text-muted-foreground transition-colors duration-150 ease-standard hover:bg-foreground/[0.03] hover:text-foreground motion-reduce:transition-none",
            FOCUS,
            phone && "h-11"
          )} text-caption`}
        >
          {open ? "Hide details" : "Details"}
          {chevron}
        </CollapsibleTrigger>
      )}
      <CollapsibleContent className="overflow-hidden duration-200 ease-standard data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
        {!latest && body && <div className="flex flex-col gap-3 px-3 pb-3">{body}</div>}
        {/* Under the foot, the foot's hairline is theirs; under a head, they draw their own */}
        <div className={cn("mx-3 flex flex-col gap-2 pt-3 pb-3", !foot && "border-t border-border")}>{details}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** A run's outcome, one shape for build, deploy, run, call and Test sends: a status icon, a title,
 * a meta line and Show log. A failure is tinted red and carries Explain while it's the live card */
export function ResultCard({ turn, latest, phone = false }: { turn: ResultTurn; latest: boolean; phone?: boolean }) {
  const { dispatch } = useStore()
  const [log, setLog] = useState(false)
  // A failure that's no longer live goes quiet: its head, and the log on request
  // A check of a fix typed by hand opens on the compiler's words: that's what the learner built it for
  const [openFail, setOpenFail] = useState(!!turn.checked)
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
          FOCUS,
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

  // A first deploy the faucet stopped: what's short, the wallet to top up, and the faucet. The deploy
  // itself comes back under it as Try again, the one primary
  if (turn.funding)
    return (
      <div role="status" className="overflow-hidden rounded-panel border border-error/40 bg-(--card-ground)">
        <div className="flex h-12 items-center gap-2 bg-error/[0.08] px-4">
          <CircleX className="size-4 shrink-0 text-error" />
          <span className={cn("shrink-0 text-foreground", HEADING)}>Not enough devnet SOL</span>
        </div>
        <div className="flex flex-col gap-4 border-t border-error/20 px-4 py-4">
          <p className={READ}>
            Your wallet has 0 SOL, and this deploy needs about {DEPLOY_COST}. The devnet faucet is at its limit for now: try again in a minute, or top the wallet up yourself.
          </p>
          <div className="flex items-center gap-3 text-caption">
            <span className="shrink-0 text-muted-foreground">Your wallet</span>
            <code title={WALLET} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
              {shortKey(WALLET)}
            </code>
            <button
              type="button"
              onClick={() => copy(WALLET, "Address")}
              className={cn("-my-3 flex shrink-0 items-center gap-1 rounded-sm py-3 text-muted-foreground hover:text-foreground", FOCUS, phone && "min-h-11 min-w-11 justify-center")}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </button>
          </div>
          <div className={cn("flex", phone && "flex-col items-stretch")}>
            <Button asChild variant="ghost" className={cn(ACTION, ACTION_SOFT, phone && PHONE_CTA)}>
              <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                Open faucet
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    )

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

  const ok = <Check className="size-4 shrink-0 text-success" />
  const took = turn.took ? secs(turn.took) : ""
  const shell = { latest, phone }
  // How long the run took, the line the act's own record used to say above the card: first in the details
  const timing = (words: string) => took && <p className="text-caption text-muted-foreground tabular-nums">{words}</p>

  if (turn.act === "build")
    return (
      <Shell
        {...shell}
        latest
        icon={ok}
        title="Build successful"
        meta={`${idlLine(turn.src ?? "")} · ${took}`}
        details={
          <>
            <LogHead label="Build log" phone={phone} />
            <BuildLog log={turn.log} bare className="max-h-60 overflow-y-auto overscroll-contain" />
          </>
        }
      />
    )

  if (turn.act === "deploy" || turn.act === "buildDeploy")
    return (
      <Shell
        {...shell}
        // A deploy keeps its program id in view, old or new: it's the address the rest of the lesson uses
        latest
        icon={ok}
        title={turn.upgrade ? `Upgraded ${shortKey(PROGRAM_ID)}` : "Deployed"}
        meta={`${(turn.upgrade ? UPGRADE_COST : DEPLOY_COST).replace(" SOL", " devnet SOL")} from your wallet`}
        body={
          turn.upgrade ? (
            <p className="font-mono text-[0.75rem] text-muted-foreground">{idlLine(turn.src ?? "")}</p>
          ) : (
            <ProgramId phone={phone} flat />
          )
        }
        details={
          <>
            {timing(`${turn.act === "buildDeploy" ? "Built and " : ""}${turn.upgrade ? "upgraded" : "deployed"} in ${took}`.replace(/^./, (c) => c.toUpperCase()))}
            <LogHead label="Deploy log" phone={phone} />
            <BuildLog log={turn.log} bare />
          </>
        }
      />
    )

  // The account a game or a memory lesson's client read back, drawn as the game or the runtime sees it,
  // and the few words an older card folds it to
  const memory = LESSON.memory ? memoryIn(turn.log) : null
  const player = LESSON.game ? playerIn(turn.log) : null
  const account = memory ? (
    memory.big ? (
      <MemoryCard size={memory.big.size} heap={0} zero painted={memory.big.at} phone={phone} flat />
    ) : (
      <MemoryCard size={memory.map} phone={phone} flat />
    )
  ) : player ? (
    <PlayerCard {...player} phone={phone} flat />
  ) : null
  const summary = memory
    ? memory.big
      ? memory.big.at === undefined
        ? `${Math.round(memory.big.size / KB)} KB big map`
        : `"gm" at byte ${memory.big.at.toLocaleString("en-US")}`
      : `${Math.round(memory.map / KB)} KB map`
    : player
      ? `${player.energy}/${LESSON.game?.max ?? 5} energy, ${player.wood} wood`
      : null

  // A client that found its account already there sent nothing: it read the account back. Nothing was
  // written, so the eye, not the green check
  if (!turn.tx)
    return (
      <Shell
        {...shell}
        icon={<Eye className="size-4 shrink-0 text-muted-foreground" />}
        title={memory ? "Read your map" : "Read your player"}
        meta={latest || !summary ? "No transaction, already there" : `No transaction · ${summary}`}
        body={account}
        details={
          <>
            {timing(`Ran client.ts in ${took}`)}
            <LogHead label="Client output" phone={phone} />
            <BuildLog log={turn.log} bare />
          </>
        }
      />
    )

  // A transaction: the instruction and where it came from in the head, what came back under it (the
  // account, or what the program said), then the receipt
  const tx = turn.tx
  // Foreground: the thin mono face in the muted grey read fainter than the words beside it
  const ix = <code className="font-mono text-[0.875em] text-foreground">{ixName(tx)}</code>
  const said = !account && tx.said ? `“${tx.said}”` : null
  return (
    <Shell
      {...shell}
      icon={ok}
      title="Confirmed"
      meta={
        <>
          {ix} {latest ? FROM[turn.from ?? "client"] : `· ${summary ?? said ?? FROM[turn.from ?? "client"]}`}
        </>
      }
      body={
        <>
          {account ??
            (tx.said && (
              <HelloSource
                said={tx.said}
                className="border-l-2 border-success pl-3"
                before={
                  <p className="font-mono text-code break-words">
                    <span className="text-muted-foreground">Program log: </span>
                    <span className="text-foreground">{tx.said}</span>
                  </p>
                }
              />
            ))}
          <CompactReceipt tx={tx} print={print && latest} phone={phone} />
        </>
      }
      details={
        <>
          <p className="text-caption text-muted-foreground tabular-nums">
            {took && `${turn.from === "client" ? "Ran client.ts" : "Sent"} in ${took} · `}
            {tx.compute.toLocaleString("en-US")} CU · confirmed in {TX_CONFIRMED}
          </p>
          <LogHead label="Program log" phone={phone} />
          <BuildLog log={programLog(tx)} bare />
        </>
      }
    />
  )
}
