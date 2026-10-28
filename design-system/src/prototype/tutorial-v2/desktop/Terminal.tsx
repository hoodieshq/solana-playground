import { Check } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { sameCode } from "../check"
import { CLIENT, DEPLOY_COST, LIB } from "../data"
import { idlLine } from "../idl"
import { camel, useStore, type State, type Turn } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { ProgramId } from "../ui/ProgramId"

type ResultTurn = Extract<Turn, { kind: "result" }>

const lastResult = (s: State) => [...s.thread].reverse().find((t): t is ResultTurn => t.kind === "result")

/** A call the program refused (a Call panel grow past 10 KB, a chop with no energy): its own error by
 * name and number when it has one, else what went wrong. Not a build, so no line to point at */
const refused = (tx: NonNullable<ResultTurn["tx"]>) =>
  tx.error?.number ? `Failed · ${tx.error.name} · error ${tx.error.number}` : `Failed · ${tx.error?.message ?? tx.instruction}`

/** A game's last chop from its card, which leaves no result turn of its own */
const lastChop = (s: State) =>
  s.thread
    .flatMap((t) => (t.kind === "act" ? [...(t.chops ?? []), ...(t.grows ?? [])] : []))
    .sort((a, b) => a.at - b.at)
    .pop() ?? null

/** The command a run starts with, as the terminal echoes it while it goes */
function command(s: State) {
  const run = s.run
  if (!run) return ""
  if (run.act === "run") return `$ run ${CLIENT}`
  if (run.act === "call") return `$ pg.program.methods.hello(${JSON.stringify(s.name ?? "")}).rpc()`
  if (run.act === "chop") return "$ pg.program.methods.chopTree().rpc()"
  if (run.act === "grow") return `$ pg.program.methods.${camel(run.ix ?? "grow")}(len).rpc()`
  if (run.act === "send") return `$ pg.program.methods.${camel(run.ix ?? "")}().rpc()`
  if (run.act === "test") return s.testName.trim() && !run.ix ? `$ call hello --name ${JSON.stringify(s.testName.trim())}` : `$ call ${run.ix ?? "hello"}`
  return "$ anchor build"
}

/** How the last run went, in one line beside a dot: ready, running a stage, passed or failed. Once
 * the file it ran has changed, the last outcome no longer speaks for the code: it says so instead */
export function TerminalStatus() {
  const { s } = useStore()
  const r = lastResult(s)
  const chop = lastChop(s)
  const busy = s.phase !== "idle"
  const file = r?.act === "run" ? CLIENT : LIB
  const edited = !busy && r?.src !== undefined && !sameCode(r.src, s.files[file] ?? "")
  const chopped = !busy && chop && (!r || chop.at > r.at)
  const failed = chopped ? !chop.ok : !busy && !edited && r && !r.ok
  const text = chopped
    ? chop.ok
      ? chop.tx.said
        ? `Confirmed · Program log: ${chop.tx.said}`
        : `Confirmed · ${chop.tx.instruction}`
      : chop.tx.error?.number === 0
        ? `Failed · ${chop.tx.error.message}`
        : "Failed · NotEnoughEnergy · error 6000"
    : edited
    ? `${file === CLIENT ? "client.ts" : "lib.rs"} changed since the last ${!r.ok ? (r.act === "run" ? "failed run" : "failed build") : r.act === "run" ? "run" : r.act === "build" ? "build" : "deploy"}`
    : busy
      ? s.run && s.run.stages.length > 1
        ? ["Building", "Deploying"].includes(s.run.stages[s.run.stage])
          ? s.run.stages[s.run.stage]
          : `Deploying · ${s.run.stages[s.run.stage]}`
        : (s.run?.stages[0] ?? "Running")
      : !r
        ? "Ready"
        : !r.ok
          ? r.funding
            ? "Not enough devnet SOL · the faucet is at its limit"
            : r.tx
              ? refused(r.tx)
              : `${r.act === "run" ? "Run" : "Build"} failed · line ${r.fail?.line ?? 1}`
          : r.act === "build"
            ? `Build successful · ${idlLine(r.src ?? "")}`
            : r.act === "deploy" || r.act === "buildDeploy"
              ? r.upgrade
                ? `Upgraded · ${idlLine(r.src ?? "")}`
                : `Deployed · ${DEPLOY_COST.replace(" SOL", " devnet SOL")} from your wallet`
              : r.tx?.said
                ? `Confirmed · Program log: ${r.tx.said}`
                : r.tx
                  ? `Confirmed · ${r.tx.instruction}`
                  : "Read your player · no transaction"
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          busy ? "animate-pulse-dot bg-brand-purple motion-reduce:animate-none" : edited ? "bg-warning" : failed ? "bg-error" : r ? "bg-success" : "bg-muted-foreground/40"
        )}
      />
      <span className="truncate">{text}</span>
    </>
  )
}

/** What the terminal shows: a run as it goes, then its log. A deploy shows its stages, then the
 * program id. A line that points into a file takes the editor there; hovering it lights the line.
 * `phone` wraps the log, since a phone has no room to scroll a long line sideways */
export function TerminalBody({ onPoint, lit, phone = false }: { onPoint?: (line: number | null) => void; lit?: number | null; phone?: boolean }) {
  const { s, dispatch } = useStore()
  const run = s.run

  if (run && run.stages.length > 1)
    return (
      <ol className="flex flex-col gap-2 px-4 py-3 font-mono text-code">
        {run.stages.map((stage, i) => (
          <li key={stage} className={cn("flex items-center gap-2", i > run.stage && "text-muted-foreground")}>
            {i < run.stage ? <Check strokeWidth={2.5} className="size-3.5 text-success" /> : i === run.stage ? <Spinner className="size-3.5" /> : <span className="size-3.5" />}
            {stage}
          </li>
        ))}
      </ol>
    )

  if (run)
    return (
      <p className="flex items-center gap-2 px-4 py-3 font-mono text-code text-muted-foreground">
        <Spinner className="size-3.5" />
        {command(s)}
      </p>
    )

  const r = lastResult(s)
  const file = r?.act === "run" ? CLIENT : LIB
  return (
    <div className="flex min-h-full flex-col pointer-coarse:[&_pre>button]:min-h-11">
      <BuildLog
        log={s.log}
        onJump={(line) => dispatch({ type: "reveal", file, lines: [line], caret: true })}
        onPoint={onPoint}
        lit={lit}
        wrap={phone}
        empty="Nothing run yet. Builds, deploys and calls print here."
      />
      {r?.ok && (r.act === "deploy" || r.act === "buildDeploy") && <ProgramId className="mx-4 mb-3" phone={phone} />}
    </div>
  )
}
