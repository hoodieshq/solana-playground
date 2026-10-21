import { Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { PROGRAM_ID, STEPS } from "../data"
import { useStore } from "../store"
import { BuildLog } from "../ui/BuildLog"
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

function ProgramId() {
  const copy = () =>
    navigator.clipboard
      ?.writeText(PROGRAM_ID)
      .then(() => toast("Program id copied"))
      .catch(() => toast("Couldn't copy the program id"))
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-control border border-border bg-surface-panel px-3 py-2 text-caption">
      <span className="shrink-0 text-muted-foreground">Program id</span>
      <code className="min-w-0 flex-1 truncate font-mono text-code text-foreground">{PROGRAM_ID}</code>
      <button type="button" onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground">
        Copy
      </button>
      <a
        href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        Explorer
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </a>
    </div>
  )
}

/** What the terminal shows: the run as it goes, then its log. A deploy shows its stages, then the program id */
export function TerminalBody() {
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
      {step.deploy && s.passed[s.step] && <ProgramId />}
    </div>
  )
}
