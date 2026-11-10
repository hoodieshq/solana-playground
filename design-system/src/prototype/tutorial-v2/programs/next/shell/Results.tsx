import { useState, type ReactNode } from "react"
import { Check, ChevronDown, CircleX, Copy, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { JournalRow } from "../../../ui/Journal"
import { Prose } from "../../../ui/Prose"
import { ACTION, ACTION_FILL, ACTION_SOFT, FOCUS, READ, READ_CODE, secs } from "../../../ui/type"
import { WALLET_KEY } from "../../data"
import { ask, openFile, refCall, retryDeploy, setPane, type Project, type Turn } from "../../store"
import { Details, Quote, shortKeys, STATUS_META, STATUS_PAIR, STATUS_TITLE, Well } from "./parts"
import { copyText, FAUCET_URL, failLive, isLast, reveal, saidLines, shortKey } from "./util"

type T<K extends Turn["k"]> = Extract<Turn, { k: K }>

/** A failure's card: red edge and a tinted head, the words in foreground. Live it is a panel with its
 * buttons; once the flow moved on it folds to its head, and the head opens it again */
function FailBox({ live, title, meta, children }: { live: boolean; title: string; meta?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const shown = live || open
  const head = (
    <>
      <CircleX aria-hidden="true" className="size-4 shrink-0 text-error" />
      <span className={STATUS_PAIR}>
        <span className={STATUS_TITLE}>{title}</span>
        {meta && <span className={STATUS_META}>{meta}</span>}
      </span>
    </>
  )
  return (
    <div role="status" className={cn("overflow-hidden border border-error/40 bg-(--card-ground)", live ? "rounded-panel" : "rounded-control")}>
      {live ? (
        <div className="flex h-12 items-center gap-2 bg-error/[0.08] px-4">{head}</div>
      ) : (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cn("group flex h-9 w-full items-center gap-2 bg-error/[0.08] px-3 text-left", FOCUS)}>
          {head}
          <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:text-foreground motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      )}
      {shown && <div className={cn("flex flex-col border-t border-error/20", live ? "gap-5 p-4" : "gap-4 p-3")}>{children}</div>}
    </div>
  )
}

/** The plain reason under a compiler error, canned per code */
const REASON: Record<string, string> = {
  E0425: "The code uses `memo`, but nothing named `memo` is declared before that line. A rename left one use behind.",
  E0000: "A `{` opens a block that never closes, or a `}` closes one that never opened. The line is where the compiler noticed.",
}

function BuildFail({ p, t }: { p: Project; t: T<"build-fail"> }) {
  const live = failLive(p, t)
  if (t.kind === "noAnswer")
    return (
      <FailBox live={false} title="Build didn't start">
        <p className={READ}>The build server didn't answer. Your code is unchanged.</p>
      </FailBox>
    )
  const file = t.file ?? ""
  // The one primary while nothing came after it; once the assistant answered, its buttons step back
  const lead = live && isLast(p, t)
  return (
    <FailBox live={live} title="Build failed" meta={`${t.code} · line ${t.line}`}>
      <Quote>
        <p>
          error[{t.code}]: {t.message}
        </p>
        <p className="text-muted-foreground">{t.quote}</p>
        <button
          type="button"
          onClick={() => {
            openFile(p.id, file)
            reveal(file, t.line ?? 1)
          }}
          className={cn("relative rounded-sm text-left text-muted-foreground underline decoration-dotted underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-3 after:content-[''] hover:text-foreground", FOCUS)}
        >
          {`--> ${file}:${t.line}:${t.col}`}
        </button>
      </Quote>
      <p className={READ}>
        <Prose text={REASON[t.code ?? ""] ?? "The compiler stopped at this line."} {...READ_CODE} />
      </p>
      {/* No Show the line beside it: the editor already brought the line into view, marked in red, and the
          --> link above opens it again */}
      {live && (
        <div className="flex">
          <Button variant={lead ? "default" : "ghost"} className={cn(ACTION, lead ? ACTION_FILL : ACTION_SOFT)} onClick={() => ask(p.id, "Explain the error")}>
            Explain the error
          </Button>
        </div>
      )}
    </FailBox>
  )
}

function DeployFail({ p, t }: { p: Project; t: T<"deploy-fail"> }) {
  const live = failLive(p, t)
  const retry = live && (
    <Button className={cn(ACTION, ACTION_FILL)} onClick={() => retryDeploy(p.id)}>
      Try again
    </Button>
  )
  if (t.kind === "network")
    return (
      <FailBox live={live} title="Deploy failed" meta={t.stage}>
        <p className={READ}>Devnet stopped answering at {t.stage.toLowerCase()}. Your program isn't on devnet yet. Check your connection and try again.</p>
        {retry && <div className="flex">{retry}</div>}
      </FailBox>
    )
  return (
    <FailBox live={live} title="Not enough devnet SOL">
      <p className={READ}>
        Your wallet has 0 SOL, and this deploy needs about {t.cost} SOL. The devnet faucet is at its limit for now: try again in a minute, or top the wallet up yourself.
      </p>
      <div className="flex items-center gap-3 text-[0.8125rem]">
        <span className="shrink-0 text-muted-foreground">Your wallet</span>
        <code title={WALLET_KEY} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
          {shortKey(WALLET_KEY)}
        </code>
        <button
          type="button"
          onClick={() => copyText(WALLET_KEY, "Address")}
          className={cn("-my-3 flex shrink-0 items-center gap-1 rounded-sm py-3 text-muted-foreground hover:text-foreground", FOCUS)}
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy
        </button>
      </div>
      {live && (
        <div className="flex flex-wrap gap-2">
          {retry}
          <Button asChild variant="ghost" className={cn(ACTION, ACTION_SOFT)}>
            <a href={FAUCET_URL} target="_blank" rel="noreferrer">
              Open faucet
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      )}
    </FailBox>
  )
}

const lastOf = (p: Project, k: Turn["k"]) => [...p.feed].reverse().find((x) => x.k === k)

/** The records that share the journal's box: what ran and went through. Failures and the milestone
 * stand as cards of their own and end it */
export const JOURNAL: Turn["k"][] = ["build-ok", "deploy-ok", "run-ok", "call-ok"]

/** What a finished run leaves in the feed */
const RESULT: Turn["k"][] = ["build-ok", "build-fail", "deploy-ok", "deploy-fail", "call-ok", "call-fail", "run-ok"]

/** Nothing has come back since this one, so what it printed stays out. The milestone counts for a
 * call, whose log it shows, and not for a run of client.ts, whose words it doesn't repeat (Almaz, 6 Nov:
 * an open card over the milestone read as mush) */
const latest = (p: Project, t: Turn) => {
  const after = p.feed.slice(p.feed.indexOf(t) + 1)
  return !after.some((x) => RESULT.includes(x.k) || (t.k === "call-ok" && x.k === "milestone"))
}

const OK = <Check className="text-success" />

/** Shut by default: the workspace chip and the milestone hold the id, Copy id waits in here. The time
 * is the row's, so the sentence doesn't say it again */
function DeployOk({ p, t }: { p: Project; t: T<"deploy-ok"> }) {
  const id = `\`${shortKey(t.programId)}\``
  const text = t.upgrade
    ? `Your program at ${id} now runs the new code. The upgrade took ${t.cost} test SOL from your wallet.`
    : `Your program now lives on devnet at ${id}. The deploy took ${t.cost} test SOL from your wallet.`
  return (
    <JournalRow icon={OK} label={t.upgrade ? `Upgraded ${shortKey(t.programId)}` : "Deployed to devnet"} took={secs(t.took)}>
      <Details id={p.id} text={text} copy={{ label: "Copy id", value: t.programId }} />
    </JournalRow>
  )
}

/** What the program logged, out while it's the latest; the first call's log moves into the milestone */
function CallOk({ p, t }: { p: Project; t: T<"call-ok"> }) {
  const from = t.from === "panel" ? "It was sent from the Call panel. " : ""
  return (
    <JournalRow
      icon={OK}
      label={
        <>
          Called <code className="font-mono text-[0.8125rem]">{t.ix}</code>
        </>
      }
      open={latest(p, t)}
    >
      <Well lines={saidLines(t.log)} className="mx-4 mt-1" />
      <Details id={p.id} text={`${from}The call used ${t.cu.toLocaleString("en-US")} compute units, and the fee was ${t.fee} test SOL from your wallet.`} copy={{ label: "Copy signature", value: t.sig }} />
    </JournalRow>
  )
}

/** Read mode's call on Solana's copy failed: the faucet refused the wallet's funding, or devnet didn't
 * answer. Try again asks the faucet again and sends the call */
function RefCallFail({ p, t, live }: { p: Project; t: T<"call-fail">; live: boolean }) {
  const retry = live && (
    <Button className={cn(ACTION, ACTION_FILL)} onClick={() => refCall(p.id)}>
      Try again
    </Button>
  )
  if (t.kind !== "faucet")
    return (
      <FailBox live={live} title="Call failed" meta={t.ix}>
        <p className={READ}>Couldn't reach devnet. The call wasn't sent.</p>
        {retry && <div className="flex">{retry}</div>}
      </FailBox>
    )
  return (
    <FailBox live={live} title="Not enough devnet SOL">
      <p className={READ}>Your wallet has 0 SOL, and the call's fee is about 0.000005 SOL. The devnet faucet is at its limit for now: try again in a minute, or top the wallet up yourself.</p>
      <div className="flex items-center gap-3 text-[0.8125rem]">
        <span className="shrink-0 text-muted-foreground">Your wallet</span>
        <code title={WALLET_KEY} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
          {shortKey(WALLET_KEY)}
        </code>
        <button type="button" onClick={() => copyText(WALLET_KEY, "Address")} className={cn("-my-3 flex shrink-0 items-center gap-1 rounded-sm py-3 text-muted-foreground hover:text-foreground", FOCUS)}>
          <Copy className="size-3.5" aria-hidden="true" />
          Copy
        </button>
      </div>
      {live && (
        <div className="flex flex-wrap gap-2">
          {retry}
          <Button asChild variant="ghost" className={cn(ACTION, ACTION_SOFT)}>
            <a href={FAUCET_URL} target="_blank" rel="noreferrer">
              Open faucet
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      )}
    </FailBox>
  )
}

function CallFail({ p, t }: { p: Project; t: T<"call-fail"> }) {
  const latest = lastOf(p, "call-fail") === t && !p.feed.slice(p.feed.indexOf(t)).some((x) => x.k === "call-ok")
  if (p.read) return <RefCallFail p={p} t={t} live={latest && !p.calling} />
  return (
    <FailBox live={latest} title="Call failed" meta={t.ix}>
      {t.kind === "network" ? (
        <p className={READ}>Couldn't reach devnet. The call wasn't sent.</p>
      ) : (
        <>
          <Quote>
            <p>{shortKeys(t.log.find((l) => l.includes("failed")) ?? t.error)}</p>
          </Quote>
          <p className={READ}>The program refused the call. Nothing changed on chain except the fee.</p>
        </>
      )}
      {latest && (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => ask(p.id, "Explain the error")}>
            Explain the error
          </Button>
          <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => setPane(p.id, "call", t.ix)}>
            Change the values
          </Button>
        </div>
      )}
    </FailBox>
  )
}

function RunOk({ p, t }: { p: Project; t: T<"run-ok"> }) {
  return (
    <JournalRow icon={OK} label="Ran client.ts" took={secs(t.took)} open={latest(p, t)}>
      <Well lines={t.log} className="mx-4 mt-1" />
      <Details id={p.id} text={p.framework === "ts-client" ? "client.ts sent one transaction to the Memo program on devnet." : `client.ts sent one transaction to ${p.name} on devnet.`} />
    </JournalRow>
  )
}

/** A finished run's turn, by kind */
export function Result({ p, t }: { p: Project; t: Turn }) {
  switch (t.k) {
    case "build-ok":
      // No log of its own here, so nothing to open
      return <JournalRow icon={OK} label="Built" took={secs(t.took)} />
    case "build-fail":
      return <BuildFail p={p} t={t} />
    case "deploy-ok":
      return <DeployOk p={p} t={t} />
    case "deploy-fail":
      return <DeployFail p={p} t={t} />
    case "call-ok":
      return <CallOk p={p} t={t} />
    case "call-fail":
      return <CallFail p={p} t={t} />
    case "run-ok":
      return <RunOk p={p} t={t} />
    default:
      return null
  }
}
