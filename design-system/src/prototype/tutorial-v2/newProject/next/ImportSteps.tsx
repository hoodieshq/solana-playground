import type { CSSProperties } from "react"

import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

export type Step = { label: string; detail?: string; status: "waiting" | "running" | "done" | "failed" }

/** A step's mark: a ring waiting, the spinner running, the ring and tick drawn once done, the problem's
 * dot when it failed */
function Mark({ status, tone }: { status: Step["status"]; tone: "warning" | "error" }) {
  if (status === "running") return <Spinner aria-hidden="true" role="presentation" className="size-3.5 text-brand-purple" />
  if (status === "failed")
    return (
      <span className="grid size-4 place-items-center rounded-full bg-surface-raised">
        <StatusDot variant={tone} />
      </span>
    )
  if (status === "done")
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 text-foreground">
        <circle cx="8" cy="8" r="7" pathLength="1" className="pg-pass-ring" />
        <path d="m5 8.2 2 2 4-4.4" pathLength="1" className="pg-pass-tick" />
      </svg>
    )
  return <span className="size-4 rounded-full border-[1.5px] border-border-strong" />
}

/** The import checklist (CONSENSUS.md, 3.7): one row per step, a connector between the marks that fills
 * with the brand gradient as a step finishes, and one polite announcement per finished step */
export function ImportSteps({ steps, tone = "warning" }: { steps: Step[]; tone?: "warning" | "error" }) {
  const lastDone = steps.filter((s) => s.status === "done").at(-1)
  return (
    <>
      <div role="list" aria-label="Import steps" className="flex flex-col">
        {steps.map((s, i) => (
          <div
            key={s.label}
            role="listitem"
            style={{ "--i": i } as CSSProperties}
            className="relative grid h-7 animate-print grid-cols-[16px_124px_1fr] items-center gap-x-2.5 [html.phone_&]:h-8 [html.touch_&]:h-8"
          >
            <span className="grid size-4 place-items-center">
              <Mark status={s.status} tone={tone} />
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute top-[22px] left-[7px] h-3 w-0.5 overflow-hidden bg-border-strong [html.phone_&]:top-6 [html.phone_&]:h-4 [html.touch_&]:top-6 [html.touch_&]:h-4">
                <span data-done={s.status === "done" || undefined} className="np-track block size-full" />
              </span>
            )}
            <span
              className={cn(
                "truncate text-[0.8125rem] leading-[1.125rem]",
                s.status === "running" || s.status === "done" ? "font-act text-foreground" : "font-[380] text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {s.detail && <span className="truncate font-mono text-xs text-(color:--text-quiet)">{s.detail}</span>}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {lastDone ? `${lastDone.label} done` : ""}
      </p>
    </>
  )
}
