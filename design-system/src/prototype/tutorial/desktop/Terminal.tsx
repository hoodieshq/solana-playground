import { Check } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { shownLog, stepTx } from "../tx"
import { BuildLog } from "../ui/BuildLog"
import { ProgramId } from "../ui/ProgramId"
import { arriving } from "../tx"
import { Receipt } from "../ui/Receipt"
import { workingLabel } from "../ui/StepStatus"
import { PRIMARY_KEYS } from "./keys"
import { useKeyHints } from "./pointer"

/** The strip under the terminal: how the last run went, in one line beside a dot */
export function TerminalStatus() {
  const { s } = useStore()
  const step = STEPS[s.step]
  const busy = s.phase === "building" || s.phase === "deploying" || s.phase === "calling"
  // Typing clears the error but keeps the log, so the dot follows whether the step passed. A build
  // waiting for its call passed: what's left is the call, not a fix
  const failed = !!s.error || (s.log.length > 0 && !s.passed[s.step] && !s.built)
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          busy ? "animate-pulse-dot bg-brand-purple motion-reduce:animate-none" : failed ? "bg-error" : s.log.length ? "bg-success" : "bg-muted-foreground/40"
        )}
      />
      <span className="truncate">{busy ? workingLabel(s) : failed ? (step.id === "call-client" ? "Run failed" : "Build failed") : s.log.length ? s.log[s.log.length - 1] : "Terminal"}</span>
    </>
  )
}

/** What the terminal shows: the run as it goes, then its log. A deploy shows its stages, then the
 * program id; a transaction, its receipt. `onPoint` and `lit` tie the compiler's line to the editor's */
export function TerminalBody({
  onJump,
  onPoint,
  lit,
}: {
  onJump?: (line: number) => void
  onPoint?: (line: number | null) => void
  lit?: number | null
}) {
  const { s } = useStore()
  const step = STEPS[s.step]
  // The key goes with the button's name only where there's a keyboard
  const hints = useKeyHints()
  const or = hints ? ` or ${PRIMARY_KEYS}` : ""

  if (s.phase === "deploying" && step.deploy)
    return (
      <ol className="flex flex-col gap-2 px-4 py-3 font-mono text-code">
        {step.deploy.stages.map((stage, i) => (
          <li key={stage} className={cn("flex items-center gap-2", i > s.deployStage && "text-muted-foreground")}>
            {i < s.deployStage ? (
              <Check strokeWidth={2.5} className="size-3.5 text-success" />
            ) : i === s.deployStage ? (
              <Spinner className="size-3.5" />
            ) : (
              <span className="size-3.5" />
            )}
            {stage}
          </li>
        ))}
      </ol>
    )

  if (s.phase === "building" || s.phase === "calling")
    return (
      <p className="flex items-center gap-2 px-4 py-3 font-mono text-code text-muted-foreground">
        <Spinner className="size-3.5" />
        {s.phase === "calling" ? `$ pg.program.methods.hello(${JSON.stringify(s.name)}).rpc()` : step.id === "call-client" ? `$ run ${step.file}` : "$ anchor build"}
      </p>
    )

  // Reopening a passed step clears the log, so it shows what its run left
  const log = shownLog(s)
  const tx = stepTx(s)

  return (
    // A finger gets the compiler's line, the one that takes the editor there, at full height. With a
    // receipt, a wide terminal puts it beside the log, so both read without scrolling; a narrow one
    // stacks them
    <div className="@container flex min-h-full flex-col pointer-coarse:[&_pre>button]:min-h-11">
      <div className={cn("flex min-h-full flex-1 flex-col", tx && "@xl:flex-row")}>
        <BuildLog
          onJump={onJump}
          onPoint={onPoint}
          lit={lit}
          log={log}
          // The hint names the button only while that button is there: under a patch it reads Apply and build
          empty={
            step.deploy
              ? `Nothing deployed yet. Press Deploy to devnet${or}.`
              : step.id === "call-client"
                ? `Nothing run yet.${s.phase === "idle" ? ` Press Run the client${or}.` : ""}`
                : `Nothing built yet.${s.phase === "idle" ? ` Press Build${or}.` : ""}`
          }
        />
        {step.deploy && s.passed[s.step] && <ProgramId className="mx-4 mb-3" />}
        {tx && <Receipt tx={tx} print={arriving(s.txAt)} className="mx-4 mb-3 shrink-0 @xl:mt-3 @xl:ml-0 @xl:w-[21rem] @xl:self-start" />}
      </div>
    </div>
  )
}
