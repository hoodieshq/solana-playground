import { Check } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { CLIENT, LIB } from "../data"
import { useStore, type State, type Turn } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { ProgramId } from "../ui/ProgramId"

type ResultTurn = Extract<Turn, { kind: "result" }>

const lastResult = (s: State) => [...s.thread].reverse().find((t): t is ResultTurn => t.kind === "result")

/** The command a run starts with, as the terminal echoes it while it goes */
function command(s: State) {
  const run = s.run
  if (!run) return ""
  if (run.act === "run") return `$ run ${CLIENT}`
  if (run.act === "call") return `$ pg.program.methods.hello(${JSON.stringify(s.name ?? "")}).rpc()`
  if (run.act === "test") return s.testName.trim() ? `$ call hello --name ${JSON.stringify(s.testName.trim())}` : "$ call hello"
  return "$ anchor build"
}

/** How the last run went, in one line beside a dot: ready, running a stage, passed or failed */
export function TerminalStatus() {
  const { s } = useStore()
  const r = lastResult(s)
  const busy = s.phase !== "idle"
  const failed = !busy && r && !r.ok
  const text = busy
    ? s.run && s.run.stages.length > 1
      ? ["Building", "Deploying"].includes(s.run.stages[s.run.stage])
        ? s.run.stages[s.run.stage]
        : `Deploying · ${s.run.stages[s.run.stage]}`
      : (s.run?.stages[0] ?? "Running")
    : !r
      ? "Ready"
      : !r.ok
        ? `${r.act === "run" ? "Run" : "Build"} failed · line ${r.fail?.line ?? 1}`
        : r.act === "build"
          ? `Build successful · IDL: 1 instruction · hello${r.args && r.args !== "()" ? r.args : ""}`
          : r.act === "deploy" || r.act === "buildDeploy"
            ? r.upgrade
              ? `Upgraded · IDL: hello${r.args}`
              : "Deployed · 0 SOL, paid by Kora"
            : `Confirmed · Program log: ${r.tx?.said ?? ""}`
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          busy ? "animate-pulse-dot bg-brand-purple motion-reduce:animate-none" : failed ? "bg-error" : r ? "bg-success" : "bg-muted-foreground/40"
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
