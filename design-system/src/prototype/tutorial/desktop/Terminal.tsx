import { Check } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { ProgramId, Transaction } from "../ui/ProgramId"
import { workingLabel } from "../ui/StepStatus"

/** The strip under the terminal: how the last run went, in one line beside a dot */
export function TerminalStatus() {
  const { s } = useStore()
  const step = STEPS[s.step]
  const busy = s.phase === "building" || s.phase === "deploying"
  // Typing clears the error but keeps the log, so the dot follows whether the step passed
  const failed = !!s.error || (s.log.length > 0 && !s.passed[s.step])
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

/** What the terminal shows: the run as it goes, then its log. A deploy shows its stages, then the program id */
export function TerminalBody({ onJump }: { onJump?: (line: number) => void }) {
  const { s } = useStore()
  const step = STEPS[s.step]

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

  if (s.phase === "building")
    return (
      <p className="flex items-center gap-2 px-4 py-3 font-mono text-code text-muted-foreground">
        <Spinner className="size-3.5" />
        {step.id === "call-client" ? `$ run ${step.file}` : "$ anchor build"}
      </p>
    )

  // Reopening a passed deploy clears the log, so show the deploy's own
  const log = s.log.length === 0 && step.deploy && s.passed[s.step] ? step.deploy.result.log : s.log

  return (
    <div className="flex min-h-full flex-col">
      <BuildLog
        onJump={onJump}
        log={log}
        // The hint names the button only while that button is there: under a patch it reads Apply and build
        empty={
          step.deploy
            ? "Nothing deployed yet. Press Deploy to devnet or ⌘B."
            : step.id === "call-client"
              ? `Nothing run yet.${s.phase === "idle" ? " Press Run the client or ⌘B." : ""}`
              : `Nothing built yet.${s.phase === "idle" ? " Press Build or ⌘B." : ""}`
        }
      />
      {step.deploy && s.passed[s.step] && <ProgramId className="mx-4 mb-3" />}
      {step.id === "call-client" && s.passed[s.step] && <Transaction className="mx-4 mb-3" />}
    </div>
  )
}
