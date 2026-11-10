import { Check, ChevronRight, Globe, Wallet } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import { GitHubMark } from "../../newProject/next/SourceRail"
import { AssistantMark } from "../../ui/AssistantMark"
import { soon } from "../Catalog"
import { FOCUS } from "./parts"
import type { SetupView } from "./setup"
import { Choose } from "./StatusChip"

/** What each step is about, as a picture: the assistant, the network, GitHub, the wallet */
const GLYPHS = [AssistantMark, Globe, GitHubMark, Wallet]

/** A step's mark: its own glyph on a small tile while it waits, a green tick once done, amber when it
 * needs you. The nav has no red */
function Mark({ i, state }: { i: number; state: "todo" | "done" | "warn" }) {
  const Glyph = GLYPHS[i] ?? AssistantMark
  if (state === "done")
    return (
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-green/12 text-brand-green">
        <Check strokeWidth={2.5} className="size-3.5" />
      </span>
    )
  return (
    <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.07]", state === "warn" ? "text-warning-ink" : "text-foreground")}>
      <Glyph strokeWidth={1.75} className="size-4" />
    </span>
  )
}

/** The four steps (Almaz, 10 Nov): the count and a track of four at the top, then a row a step. A step
 * that waits is two lines, its name over what it's for, and opens; a done one folds to one quiet line
 * with what it's set to at its end, so the eye goes to what is left. The assistant and the network open
 * their choices in place, the same ones Status has; a pick finishes the step */
export function SetupSteps({ setup }: { setup: SetupView }) {
  const [view, setView] = useState<"steps" | "Assistant" | "Network">("steps")
  if (view !== "steps") return <Choose view={view} onBack={() => setView("steps")} />
  const opens = (i: number) => (i === 0 ? () => setView("Assistant") : i === 1 ? () => setView("Network") : soon)
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2.5 px-2 pt-1.5 pb-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-heading text-[0.9375rem] leading-5 font-medium text-foreground">Get set up</span>
          <span className="text-[0.75rem] leading-4 text-muted-foreground tabular-nums">{`${setup.done} of ${setup.total}`}</span>
        </div>
        {/* One bar a step, lit in one sweep of the brand's light as far as you've got */}
        <span aria-hidden="true" className="flex gap-1">
          {setup.steps.map((step, i) => (
            <span
              key={step.label}
              className={cn("h-1 flex-1 rounded-full", i >= setup.done && "bg-border-strong")}
              style={i < setup.done ? { background: "linear-gradient(90deg,#9945ff,#14f195)", backgroundSize: `${setup.total * 100}% 100%`, backgroundPosition: `${(i / Math.max(1, setup.total - 1)) * 100}% 0` } : undefined}
            />
          ))}
        </span>
      </div>
      <ul className="flex flex-col">
        {setup.steps.map((step, i) => {
          const row = (children: ReactNode) => <li key={step.label}>{children}</li>
          if (step.state === "done")
            return row(
              <div className="flex min-h-10 items-center gap-2.5 px-2 py-1.5">
                <Mark i={i} state="done" />
                {/* The name whole, what it's set to in the room that's left */}
                <span className="shrink-0 text-[0.8125rem] leading-[1.125rem] font-act text-muted-foreground">{step.label}</span>
                <span className="min-w-0 flex-1 truncate text-right text-[0.75rem] leading-4 font-label text-muted-foreground">{step.value}</span>
              </div>
            )
          const words = (
            <>
              <Mark i={i} state={step.state} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[0.8125rem] leading-[1.125rem] font-act text-foreground">{step.label}</span>
                <span className={cn("text-[0.75rem] leading-4 font-label", step.state === "warn" ? "text-warning-ink" : "text-muted-foreground")}>{step.state === "todo" ? step.hint : step.value}</span>
              </span>
            </>
          )
          return row(
            step.state === "todo" ? (
              <button type="button" onClick={opens(i)} className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised [html.touch_&]:min-h-13", FOCUS)}>
                {words}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ) : (
              <div className="flex min-h-12 items-center gap-2.5 px-2 py-1.5">{words}</div>
            )
          )
        })}
      </ul>
    </div>
  )
}
